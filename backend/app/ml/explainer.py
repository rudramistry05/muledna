import numpy as np
import shap
from typing import Dict, Any
from app.ml.model import FraudEnsembleModel

class SHAPExplainerService:
    def __init__(self, ensemble: FraudEnsembleModel):
        self.ensemble = ensemble
        self.explainer = None
        self._initialize_explainer()

    def _initialize_explainer(self):
        """
        Attempts to initialize SHAP TreeExplainer for the XGBoost model.
        """
        try:
            if self.ensemble.xgb_model:
                # Use TreeExplainer on XGBoost
                self.explainer = shap.TreeExplainer(self.ensemble.xgb_model)
        except Exception as e:
            print(f"[MuleDNA] Failed to initialize SHAP TreeExplainer: {e}. Using fallback contributor.")
            self.explainer = None

    def explain_transaction(self, features: Dict[str, float], prediction_score: float) -> Dict[str, float]:
        """
        Generates local SHAP value explanations for a single transaction.
        Outputs a dictionary mapping feature names to their respective impact scores.
        """
        feature_names = self.ensemble.feature_names
        x_input = np.array([[features[name] for name in feature_names]])
        
        # 1. Native SHAP Calculation
        if self.explainer is not None:
            try:
                # Compute SHAP values
                shap_values = self.explainer.shap_values(x_input)
                
                # shap_values can be a list (for classifiers) or single array
                if isinstance(shap_values, list):
                    # Class 1 (mule) SHAP values
                    local_shap = shap_values[1][0] if len(shap_values) > 1 else shap_values[0][0]
                else:
                    # Single array format
                    if len(shap_values.shape) == 3: # (samples, features, classes)
                        local_shap = shap_values[0, :, 1]
                    elif len(shap_values.shape) == 2:
                        local_shap = shap_values[0]
                    else:
                        local_shap = shap_values
                
                # Convert log-odds contribution roughly to percentage scale
                # scale = prediction_score / sum(|local_shap| + epsilon)
                total_shap = sum(abs(v) for v in local_shap)
                if total_shap > 0:
                    scale = prediction_score / total_shap
                    explained = {name: float(local_shap[i] * scale) for i, name in enumerate(feature_names)}
                    return explained
            except Exception as e:
                print(f"[MuleDNA] Native SHAP explanation error: {e}. Falling back...")
                
        # 2. Robust Fallback Contribution Estimator
        # Calculates relative impact using baseline feature importances and raw input scaling
        contributions = {}
        try:
            importances = self.ensemble.xgb_model.feature_importances_
        except Exception:
            # Equal base weighting if model doesn't expose importance
            importances = np.ones(len(feature_names)) / len(feature_names)
            
        total_importance = sum(importances)
        
        # Approximate impact based on how far the features deviate from normal patterns
        # Normal profiles roughly average:
        baselines = {
            "velocity_ratio": 1.0,
            "credit_debit_ratio": 0.2,
            "holding_time": 500.0,
            "counterparty_entropy": 1.0,
            "night_transaction_ratio": 0.1,
            "round_amount_ratio": 0.05,
            "location_entropy": 0.3,
            "dormancy_spike": 0.0,
            "impossible_travel": 0.0
        }
        
        raw_diffs = []
        for name in feature_names:
            val = features[name]
            base = baselines.get(name, 0.0)
            if name == "holding_time":
                # Holding time is riskier when smaller, so compute negative difference
                diff = max(0.0, (1440.0 - val) / 1440.0)
            else:
                # Other features riskier when larger
                diff = max(0.0, val - base)
            raw_diffs.append(diff)
            
        # Combine diffs with model feature importances
        weighted_diffs = [raw_diffs[i] * importances[i] for i in range(len(feature_names))]
        total_wd = sum(weighted_diffs)
        
        if total_wd > 0:
            for i, name in enumerate(feature_names):
                contributions[name] = float((weighted_diffs[i] / total_wd) * prediction_score)
        else:
            # If no deviation, split evenly based on feature importance
            for i, name in enumerate(feature_names):
                contributions[name] = float((importances[i] / total_importance) * prediction_score)
                
        return contributions
