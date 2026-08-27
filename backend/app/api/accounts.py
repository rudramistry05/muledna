from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.auth import get_current_user, check_role
from app.models.user import User
from app.models.account import Account, Device, Location
from app.models.audit import AuditLog
from app.schemas.account import AccountCreate, AccountResponse, AccountUpdate
from app.ml.features import extract_features

router = APIRouter(prefix="/accounts", tags=["Accounts"])

@router.get("/", response_model=List[AccountResponse])
def get_accounts(
    status_filter: Optional[str] = None,
    risk_min: Optional[float] = None,
    risk_max: Optional[float] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Account)
    
    if status_filter:
        query = query.filter(Account.status == status_filter)
    if risk_min is not None:
        query = query.filter(Account.risk_score >= risk_min)
    if risk_max is not None:
        query = query.filter(Account.risk_score <= risk_max)
        
    return query.order_by(Account.risk_score.desc()).limit(limit).all()

@router.get("/{account_id}", response_model=AccountResponse)
def get_account_by_id(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account

@router.post("/", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(
    account_in: AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Admin", "Bank Employee"]))
):
    # Check if duplicate account number
    existing = db.query(Account).filter(Account.account_number == account_in.account_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Account number already exists")
        
    db_account = Account(
        account_number=account_in.account_number,
        customer_name=account_in.customer_name,
        balance=account_in.balance,
        phone_number=account_in.phone_number,
        email=account_in.email,
        home_branch=account_in.home_branch,
        routing_number=account_in.routing_number,
        status="Active",
        risk_score=0.0
    )
    
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="Created bank account",
        target_table="accounts",
        record_id=db_account.id
    )
    db.add(audit)
    db.commit()
    
    return db_account

@router.put("/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: int,
    account_in: AccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Admin", "Risk Analyst", "Bank Employee"]))
):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    update_data = account_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(account, field, value)
        
    db.commit()
    db.refresh(account)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="Updated bank account details",
        target_table="accounts",
        record_id=account.id
    )
    db.add(audit)
    db.commit()
    
    return account

@router.post("/{account_id}/freeze", response_model=dict)
def freeze_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Admin", "Investigator", "Risk Analyst"]))
):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    account.status = "Frozen"
    db.commit()
    
    # Log audit
    audit = AuditLog(
        user_id=current_user.id,
        action="Froze customer bank account (Mule Suspicion)",
        target_table="accounts",
        record_id=account.id
    )
    db.add(audit)
    db.commit()
    
    return {"status": "Success", "message": f"Account {account.account_number} successfully frozen."}

@router.get("/{account_id}/features", response_model=dict)
def get_account_features(
    account_id: int,
    current_txn_amount: float = 1000.0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    features = extract_features(account.id, current_txn_amount, db)
    return features
