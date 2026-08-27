import os
import pickle
import numpy as np
import pandas as pd
from typing import Dict, Tuple, Any
from sklearn.neighbors import NearestNeighbors
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, f1_score, precision_score, recall_score
from sklearn.ensemble import IsolationForest
import xgboost as xgb
import lightgbm as lgb
import optuna

# Hide optuna logs in production
optuna.logging.set_verbosity(optuna.logging.WARNING)

class CustomSMOTE:
    """
    Algorithmic implementation of SMOTE (Synthetic Minority Over-sampling Technique)
    to balance classes without external imbalanced-learn dependencies.
    """
    def __init__(self, k_neighbors: int = 5, random_state: int = 42):
        self.k_neighbors = k_neighbors
        self.random_state = random_state

    def fit_resample(self, X: np.ndarray, y: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        np.random.seed(self.random_state)
        
        # Identify majority and minority classes
        unique, counts = np.unique(y, return_counts=True)
        minority_class = unique[np.argmin(counts)]
        majority_class = unique[np.argmax(counts)]
        
        X_min = X[y == minority_class]
        X_maj = X[y == majority_class]
        
        num_maj = len(X_maj)
        num_min = len(X_min)
        
        if num_min >= num_maj:
            return X, y # Already balanced or majority is smaller
            
        oversample_needed = num_maj - num_min
        
        # Fit K-Nearest Neighbors on minority class
        k = min(self.k_neighbors, num_min - 1)
        if k < 1:
            # Not enough samples for KNN, fallback to random duplication
            indices = np.random.choice(num_min, oversample_needed, replace=True)
            synthetic = X_min[indices]
        else:
            knn = NearestNeighbors(n_neighbors=k + 1, algorithm='auto')
            knn.fit(X_min)
            
            synthetic = []
            for _ in range(oversample_needed):
                # Pick a random minority sample
                idx = np.random.randint(0, num_min)
                sample = X_min[idx]
                
                # Get its neighbors
                neighbors_indices = knn.kneighbors([sample], return_distance=False)[0]
                # Exclude the point itself
                neighbors_indices = neighbors_indices[neighbors_indices != idx]
                
                # Select a random neighbor
                neighbor_idx = np.random.choice(neighbors_indices)
                neighbor = X_min[neighbor_idx]
                
                # Generate synthetic point along the line
                diff = neighbor - sample
                gap = np.random.rand()
                synthetic_point = sample + gap * diff
                synthetic.append(synthetic_point)
                
            synthetic = np.array(synthetic)
            
        # Combine majority, original minority and synthetic samples
        X_resampled = np.vstack([X_maj, X_min, synthetic])
        y_resampled = np.hstack([
            np.full(len(X_maj), majority_class),
            np.full(len(X_min) + len(synthetic), minority_class)
        ])
        
        # Shuffle results
        shuffled_indices = np.random.permutation(len(X_resampled))
        return X_resampled[shuffled_indices], y_resampled[shuffled_indices]


class FraudEnsembleModel:
    def __init__(self, model_dir: str = "./ml_artifacts"):
        self.model_dir = model_dir
        self.xgb_model = None
        self.lgb_model = None
        self.iforest = None
        
        # Features map
        self.feature_names = [
            "velocity_ratio",
            "credit_debit_ratio",
            "holding_time",
            "counterparty_entropy",
            "night_transaction_ratio",
            "round_amount_ratio",
            "location_entropy",
            "dormancy_spike",
            "impossible_travel"
        ]
        
        if not os.path.exists(self.model_dir):
            os.makedirs(self.model_dir)

    def optimize_hyperparameters(self, X_train: np.ndarray, y_train: np.ndarray) -> Tuple[Dict, Dict]:
        """
        Runs Optuna study to find optimal parameters for XGBoost and LightGBM.
        """
        # XGBoost study
        def xgb_objective(trial):
            params = {
                'n_estimators': trial.suggest_int('n_estimators', 50, 200),
                'max_depth': trial.suggest_int('max_depth', 3, 7),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.2),
                'subsample': trial.suggest_float('subsample', 0.6, 1.0),
                'eval_metric': 'logloss',
                'random_state': 42
            }
            clf = xgb.XGBClassifier(**params)
            clf.fit(X_train, y_train)
            preds = clf.predict_proba(X_train)[:, 1]
            return roc_auc_score(y_train, preds)

        xgb_study = optuna.create_study(direction='maximize')
        xgb_study.optimize(xgb_objective, n_trials=5)
        
        # LightGBM study
        def lgb_objective(trial):
            params = {
                'n_estimators': trial.suggest_int('n_estimators', 50, 200),
                'max_depth': trial.suggest_int('max_depth', 3, 7),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.2),
                'num_leaves': trial.suggest_int('num_leaves', 8, 64),
                'random_state': 42,
                'verbosity': -1
            }
            clf = lgb.LGBMClassifier(**params)
            clf.fit(X_train, y_train)
            preds = clf.predict_proba(X_train)[:, 1]
            return roc_auc_score(y_train, preds)

        lgb_study = optuna.create_study(direction='maximize')
        lgb_study.optimize(lgb_objective, n_trials=5)
        
        return xgb_study.best_params, lgb_study.best_params

    def train_pipeline(self, X: np.ndarray, y: np.ndarray) -> Dict[str, float]:
        """
        Full Training Pipeline:
        1. Train-test split
        2. Class balancing via Custom SMOTE
        3. Hyperparameter tuning with Optuna
        4. Fit final ensemble
        5. Evaluate and return performance metrics
        """
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
        
        # Balance minority class
        smote = CustomSMOTE()
        X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
        
        # Tune params
        xgb_params, lgb_params = self.optimize_hyperparameters(X_train_res, y_train_res)
        
        # Fit models
        self.xgb_model = xgb.XGBClassifier(**xgb_params, random_state=42, eval_metric='logloss')
        self.xgb_model.fit(X_train_res, y_train_res)
        
        # LightGBM requires verbosity = -1 to keep logs clean
        lgb_params['verbosity'] = -1
        self.lgb_model = lgb.LGBMClassifier(**lgb_params, random_state=42)
        self.lgb_model.fit(X_train_res, y_train_res)
        
        # Anomaly Detection (Isolation Forest)
        self.iforest = IsolationForest(contamination=0.1, random_state=42)
        self.iforest.fit(X_train_res)
        
        # Evaluate
        eval_metrics = self.evaluate(X_test, y_test)
        
        # Save models
        self.save_model()
        
        return eval_metrics

    def predict(self, features: Dict[str, float]) -> Dict[str, float]:
        """
        Ensemble prediction logic. Returns independent scores and the combined risk.
        """
        # Prepare input array
        x_input = np.array([[features[name] for name in self.feature_names]])
        
        # XGBoost Score
        xgb_score = float(self.xgb_model.predict_proba(x_input)[0, 1]) * 100
        
        # LightGBM Score
        lgb_score = float(self.lgb_model.predict_proba(x_input)[0, 1]) * 100
        
        # Isolation Forest Anomaly Score
        # decision_function yields values where negative means anomaly. Let's normalize it to 0-100.
        dec_func = self.iforest.decision_function(x_input)[0]
        iforest_score = float(1.0 / (1.0 + np.exp(dec_func * 10.0))) * 100
        
        # Final Ensemble Score (weighted combination)
        ensemble_score = (0.4 * xgb_score) + (0.4 * lgb_score) + (0.2 * iforest_score)
        
        return {
            "xgb_score": xgb_score,
            "lgb_score": lgb_score,
            "iforest_score": iforest_score,
            "ensemble_score": min(100.0, max(0.0, ensemble_score))
        }

    def evaluate(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, float]:
        """
        Evaluate ensemble performance on test dataset.
        """
        # Predict on test set
        xgb_preds = self.xgb_model.predict_proba(X_test)[:, 1]
        lgb_preds = self.lgb_model.predict_proba(X_test)[:, 1]
        
        dec_funcs = self.iforest.decision_function(X_test)
        iforest_preds = 1.0 / (1.0 + np.exp(dec_funcs * 10.0))
        
        ensemble_preds = (0.4 * xgb_preds) + (0.4 * lgb_preds) + (0.2 * iforest_preds)
        binary_preds = (ensemble_preds >= 0.5).astype(int)
        
        return {
            "auc": float(roc_auc_score(y_test, ensemble_preds)),
            "f1": float(f1_score(y_test, binary_preds)),
            "precision": float(precision_score(y_test, binary_preds)),
            "recall": float(recall_score(y_test, binary_preds)),
            "accuracy": float(np.mean(binary_preds == y_test))
        }

    def save_model(self):
        with open(os.path.join(self.model_dir, "ensemble.pkl"), "wb") as f:
            pickle.dump({
                "xgb": self.xgb_model,
                "lgb": self.lgb_model,
                "iforest": self.iforest
            }, f)

    def load_model(self) -> bool:
        path = os.path.join(self.model_dir, "ensemble.pkl")
        if os.path.exists(path):
            with open(path, "rb") as f:
                data = pickle.load(f)
                self.xgb_model = data["xgb"]
                self.lgb_model = data["lgb"]
                self.iforest = data["iforest"]
            return True
        return False

    def bootstrap_default_model(self):
        """
        Generates synthetic data and trains a default ensemble model
        if no model exists to prevent startup failures.
        """
        if self.load_model():
            return
            
        print("[MuleDNA] Bootstrapping default ML models...")
        np.random.seed(42)
        n_samples = 500
        
        # Generate feature matrix
        # Columns: velocity_ratio, credit_debit_ratio, holding_time, counterparty_entropy, night_txn, round_amt, loc_entropy, dormancy, travel
        # Class 0 (Legit): low velocity, low credit_debit ratio, high holding time, lower night transactions
        X_legit = np.random.normal(loc=[1.0, 0.2, 500.0, 1.2, 0.1, 0.05, 0.5, 0.0, 0.0],
                                    scale=[0.2, 0.1, 100.0, 0.3, 0.05, 0.02, 0.2, 0.05, 0.05],
                                    size=(450, 9))
        X_legit = np.clip(X_legit, 0, None)
        
        # Class 1 (Mule): high velocity, credit_debit symmetric (~1.0), low holding time (< 15 mins), round amount spikes, travel violations
        X_mule = np.random.normal(loc=[4.5, 0.95, 8.0, 3.5, 0.6, 0.75, 2.1, 0.8, 0.6],
                                   scale=[1.0, 0.05, 3.0, 0.8, 0.15, 0.15, 0.4, 0.2, 0.2],
                                   size=(50, 9))
        X_mule = np.clip(X_mule, 0, None)
        
        X = np.vstack([X_legit, X_mule])
        y = np.hstack([np.zeros(450), np.ones(50)])
        
        # Run training pipeline
        metrics = self.train_pipeline(X, y)
        print(f"[MuleDNA] Bootstrapping complete. Metrics: {metrics}")
