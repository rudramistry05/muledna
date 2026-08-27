from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from decimal import Decimal

# Account summary schema for nested responses
class AccountSummary(BaseModel):
    id: int
    account_number: str
    customer_name: str
    status: str

    class Config:
        from_attributes = True

# Prediction schema
class PredictionResponse(BaseModel):
    id: int
    xgb_score: float
    lgb_score: float
    iforest_score: float
    ensemble_score: float
    shap_values_json: Optional[str] = None
    prediction_timestamp: datetime

    class Config:
        from_attributes = True

# Transaction schemas
class TransactionBase(BaseModel):
    amount: Decimal
    type: str = "Transfer" # Transfer, Deposit, Withdrawal
    description: Optional[str] = None
    location_lat: Optional[float] = None
    location_lon: Optional[float] = None
    device_id: Optional[str] = None

class TransactionCreate(TransactionBase):
    source_account_number: str
    destination_account_number: str

class TransactionUpdate(BaseModel):
    status: Optional[str] = None # Pending, Approved, Blocked, Suspicious
    risk_score: Optional[float] = None
    risk_reasons: Optional[str] = None

class TransactionResponse(TransactionBase):
    id: int
    transaction_reference: str
    source_account_id: Optional[int] = None
    destination_account_id: Optional[int] = None
    timestamp: datetime
    risk_score: float
    risk_reasons: Optional[str] = None
    status: str
    
    # Nested relations
    source_account: Optional[AccountSummary] = None
    destination_account: Optional[AccountSummary] = None
    predictions: List[PredictionResponse] = []

    class Config:
        from_attributes = True

# Transaction list response with meta
class TransactionListResponse(BaseModel):
    transactions: List[TransactionResponse]
    total_count: int
    page: int
    size: int
