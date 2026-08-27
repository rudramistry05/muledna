from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.auth import UserResponse
from app.schemas.transaction import AccountSummary

# SAR Report schemas
class SARReportBase(BaseModel):
    filer_name: Optional[str] = "Bank of India AML Unit"
    subject_name: Optional[str] = None
    subject_account: Optional[str] = None
    summary_narrative: Optional[str] = None

class SARReportCreate(SARReportBase):
    pass

class SARReportResponse(SARReportBase):
    id: int
    case_id: int
    report_xml: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Fraud Case schemas
class FraudCaseBase(BaseModel):
    title: str
    severity: str = "Medium" # Low, Medium, High, Critical
    summary: Optional[str] = None

class FraudCaseCreate(FraudCaseBase):
    account_id: int

class FraudCaseUpdate(BaseModel):
    status: Optional[str] = None # Open, Under Investigation, Resolved, Closed
    severity: Optional[str] = None
    summary: Optional[str] = None
    investigator_id: Optional[int] = None

class FraudCaseResponse(FraudCaseBase):
    id: int
    status: str
    investigator_id: Optional[int] = None
    account_id: int
    created_at: datetime
    updated_at: datetime
    
    # Relations
    account: Optional[AccountSummary] = None
    investigator: Optional[UserResponse] = None
    sar_reports: List[SARReportResponse] = []

    class Config:
        from_attributes = True
