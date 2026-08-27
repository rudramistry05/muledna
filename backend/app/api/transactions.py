from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
import uuid

from app.core.database import get_db
from app.api.auth import get_current_user, check_role
from app.models.user import User
from app.models.account import Account, Location
from app.models.transaction import Transaction, Prediction
from app.models.audit import AuditLog
from app.schemas.transaction import TransactionCreate, TransactionResponse, TransactionListResponse
from app.ml.features import extract_features
from app.ml.model import FraudEnsembleModel
from app.ml.explainer import SHAPExplainerService
from app.services.alert_service import RealTimeAlertService

router = APIRouter(prefix="/transactions", tags=["Transactions"])

# Initialize ML Ensemble Model (Singleton lazy load style)
ml_model = FraudEnsembleModel()
ml_model.bootstrap_default_model()
shap_service = SHAPExplainerService(ml_model)

@router.get("/", response_model=TransactionListResponse)
def get_transactions(
    page: int = 1,
    size: int = 20,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    offset = (page - 1) * size
    query = db.query(Transaction)
    
    if search:
        query = query.join(Account, or_(
            Transaction.source_account_id == Account.id,
            Transaction.destination_account_id == Account.id
        )).filter(
            or_(
                Transaction.transaction_reference.ilike(f"%{search}%"),
                Account.customer_name.ilike(f"%{search}%"),
                Account.account_number.ilike(f"%{search}%")
            )
        )
        
    if status_filter:
        query = query.filter(Transaction.status == status_filter)
        
    total_count = query.count()
    transactions = query.order_by(desc(Transaction.timestamp)).offset(offset).limit(size).all()
    
    return {
        "transactions": transactions,
        "total_count": total_count,
        "page": page,
        "size": size
    }

@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction_by_id(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    txn = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return txn

@router.post("/", response_model=TransactionResponse)
def submit_transaction(
    txn_in: TransactionCreate,
    db: Session = Depends(get_db)
):
    """
    Submits a transaction for real-time intercept and risk scoring.
    """
    # 1. Fetch accounts
    source_acc = db.query(Account).filter(Account.account_number == txn_in.source_account_number).first()
    dest_acc = db.query(Account).filter(Account.account_number == txn_in.destination_account_number).first()
    
    if not source_acc:
        raise HTTPException(status_code=404, detail=f"Source account {txn_in.source_account_number} not found")
    if not dest_acc:
        raise HTTPException(status_code=404, detail=f"Destination account {txn_in.destination_account_number} not found")
        
    if source_acc.status == "Frozen":
        raise HTTPException(status_code=400, detail="Transaction rejected. Source account is FROZEN.")
        
    if source_acc.balance < txn_in.amount and txn_in.type != "Deposit":
        raise HTTPException(status_code=400, detail="Insufficient funds in source account")

    # Log coordinates to Location table for traveler speeds checking
    if txn_in.location_lat and txn_in.location_lon:
        loc = Location(
            account_id=source_acc.id,
            latitude=txn_in.location_lat,
            longitude=txn_in.location_lon,
            city="Online Trxn",
            country="India"
        )
        db.add(loc)
        db.commit()

    # Create transaction reference
    txn_ref = f"TXN{uuid.uuid4().hex[:10].upper()}"
    
    db_txn = Transaction(
        transaction_reference=txn_ref,
        source_account_id=source_acc.id,
        destination_account_id=dest_acc.id,
        amount=txn_in.amount,
        type=txn_in.type,
        description=txn_in.description,
        location_lat=txn_in.location_lat,
        location_lon=txn_in.location_lon,
        device_id=txn_in.device_id,
        status="Pending",
        risk_score=0.0
    )
    
    db.add(db_txn)
    db.commit()
    db.refresh(db_txn)

    # 2. Extract engineered features in real-time
    features = extract_features(source_acc.id, float(txn_in.amount), db)
    
    # 3. Model Prediction
    pred_res = ml_model.predict(features)
    risk_score = pred_res["ensemble_score"]
    
    # 4. SHAP Values
    shap_vals = shap_service.explain_transaction(features, risk_score)
    
    # Format risk reasons
    high_impact_reasons = [name.replace("_", " ").title() for name, impact in shap_vals.items() if impact > 15.0]
    risk_reasons_str = ", ".join(high_impact_reasons) if high_impact_reasons else "Low Risk Indicators"
    
    # Save predictions logs
    import json
    db_pred = Prediction(
        transaction_id=db_txn.id,
        xgb_score=pred_res["xgb_score"],
        lgb_score=pred_res["lgb_score"],
        iforest_score=pred_res["iforest_score"],
        ensemble_score=risk_score,
        shap_values_json=json.dumps(shap_vals)
    )
    db.add(db_pred)
    
    db_txn.risk_score = risk_score
    db_txn.risk_reasons = risk_reasons_str
    
    # Update account risk score dynamically
    source_acc.risk_score = max(source_acc.risk_score, risk_score)
    dest_acc.risk_score = max(dest_acc.risk_score, risk_score * 0.5) # cascading risk to beneficiary
    
    db.commit()
    
    # 5. Risk Interception Action
    if risk_score >= 75.0:
        db_txn.status = "Suspicious"
        db.commit()
        
        # Trigger real-time SMS / Push notification alert to victim
        alert_service = RealTimeAlertService(db)
        alert_service.trigger_transaction_alert(
            transaction_id=db_txn.id,
            victim_name=source_acc.customer_name,
            victim_phone=source_acc.phone_number or "+919876543210",
            amount=float(txn_in.amount)
        )
    else:
        # Transfer the balance
        source_acc.balance = Decimal(float(source_acc.balance) - float(txn_in.amount))
        dest_acc.balance = Decimal(float(dest_acc.balance) + float(txn_in.amount))
        db_txn.status = "Approved"
        db.commit()
        
    db.refresh(db_txn)
    return db_txn

@router.post("/{transaction_id}/approve", response_model=TransactionResponse)
def force_approve_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Admin", "Investigator", "Risk Analyst"]))
):
    """
    Overrides a suspicious transaction, force-approving it.
    """
    txn = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    if txn.status != "Suspicious":
        raise HTTPException(status_code=400, detail="Only Suspicious transactions can be overridden")
        
    source_acc = db.query(Account).filter(Account.id == txn.source_account_id).first()
    dest_acc = db.query(Account).filter(Account.id == txn.destination_account_id).first()
    
    # Deduct / Add balance
    source_acc.balance = Decimal(float(source_acc.balance) - float(txn.amount))
    dest_acc.balance = Decimal(float(dest_acc.balance) + float(txn.amount))
    txn.status = "Approved"
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="Force approved transaction override",
        target_table="transactions",
        record_id=txn.id
    )
    db.add(audit)
    db.commit()
    db.refresh(txn)
    
    return txn

@router.post("/{transaction_id}/block", response_model=TransactionResponse)
def force_block_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Admin", "Investigator", "Risk Analyst"]))
):
    """
    Blocks a suspicious transaction and freezes the source account.
    """
    txn = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    txn.status = "Blocked"
    
    # Freeze source account
    source_acc = db.query(Account).filter(Account.id == txn.source_account_id).first()
    if source_acc:
        source_acc.status = "Frozen"
        
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="Blocked transaction & Froze source account",
        target_table="transactions",
        record_id=txn.id
    )
    db.add(audit)
    db.commit()
    db.refresh(txn)
    
    return txn
