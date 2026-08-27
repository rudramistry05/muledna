from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.auth import get_current_user, check_role
from app.models.user import User
from app.models.fraud_case import FraudCase, SARReport
from app.models.audit import AuditLog
from app.schemas.fraud_case import FraudCaseCreate, FraudCaseResponse, FraudCaseUpdate, SARReportResponse
from app.services.sar_generator import SARGeneratorService

router = APIRouter(prefix="/reports", tags=["Investigations & SAR"])

@router.get("/cases", response_model=List[FraudCaseResponse])
def get_cases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(FraudCase).order_by(FraudCase.created_at.desc()).all()

@router.get("/cases/{case_id}", response_model=FraudCaseResponse)
def get_case_by_id(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(FraudCase).filter(FraudCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Fraud case not found")
    return case

@router.post("/cases", response_model=FraudCaseResponse, status_code=status.HTTP_201_CREATED)
def create_case(
    case_in: FraudCaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Admin", "Investigator", "Risk Analyst"]))
):
    db_case = FraudCase(
        title=case_in.title,
        severity=case_in.severity,
        summary=case_in.summary,
        account_id=case_in.account_id,
        investigator_id=current_user.id,
        status="Open"
    )
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action=f"Opened new fraud case investigation: {db_case.title}",
        target_table="fraud_cases",
        record_id=db_case.id
    )
    db.add(audit)
    db.commit()
    
    return db_case

@router.put("/cases/{case_id}", response_model=FraudCaseResponse)
def update_case(
    case_id: int,
    case_in: FraudCaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Admin", "Investigator", "Risk Analyst"]))
):
    case = db.query(FraudCase).filter(FraudCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Fraud case not found")
        
    update_data = case_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(case, field, value)
        
    db.commit()
    db.refresh(case)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action=f"Updated fraud case details ({case.title})",
        target_table="fraud_cases",
        record_id=case.id
    )
    db.add(audit)
    db.commit()
    
    return case

@router.post("/cases/{case_id}/sar", response_model=SARReportResponse)
def generate_sar(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Admin", "Investigator"]))
):
    """
    Generates a Suspicious Activity Report XML for the case.
    """
    sar_service = SARGeneratorService(db)
    try:
        sar_report = sar_service.generate_sar_xml(case_id)
        
        # Audit log
        audit = AuditLog(
            user_id=current_user.id,
            action=f"Compiled SAR regulatory compliance report for case {case_id}",
            target_table="sar_reports",
            record_id=sar_report.id
        )
        db.add(audit)
        db.commit()
        
        return sar_report
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/sar/{sar_id}/download", response_model=SARReportResponse)
def download_sar(
    sar_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sar = db.query(SARReport).filter(SARReport.id == sar_id).first()
    if not sar:
        raise HTTPException(status_code=404, detail="SAR report not found")
    return sar
