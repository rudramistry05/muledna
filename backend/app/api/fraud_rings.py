from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.auth import get_current_user, check_role
from app.models.user import User
from app.models.account import Account
from app.models.audit import AuditLog
from app.services.graph_analysis import FraudGraphAnalysisService

router = APIRouter(prefix="/fraud-rings", tags=["Fraud Network Graph"])

@router.get("/", response_model=dict)
def get_fraud_rings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the network graph formatted for React Flow,
    categorized by Louvain community partitions.
    """
    graph_service = FraudGraphAnalysisService(db)
    network_data = graph_service.generate_fraud_network()
    return network_data

@router.post("/freeze-ring", response_model=dict)
def freeze_entire_ring(
    account_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Admin", "Investigator", "Risk Analyst"]))
):
    """
    Freezes multiple linked mule accounts associated with a detected fraud ring.
    """
    if not account_ids:
        raise HTTPException(status_code=400, detail="No account IDs provided")
        
    accounts = db.query(Account).filter(Account.id.in_(account_ids)).all()
    if not accounts:
        raise HTTPException(status_code=404, detail="No matching accounts found to freeze")
        
    frozen_numbers = []
    for acc in accounts:
        acc.status = "Frozen"
        frozen_numbers.append(acc.account_number)
        
        # Audit log for each account
        audit = AuditLog(
            user_id=current_user.id,
            action=f"Bulk-froze account {acc.account_number} as part of Fraud Ring mitigation",
            target_table="accounts",
            record_id=acc.id
        )
        db.add(audit)
        
    db.commit()
    
    return {
        "status": "Success",
        "message": f"Successfully frozen {len(accounts)} accounts in fraud ring.",
        "frozen_accounts": frozen_numbers
    }
