from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class AlertBase(BaseModel):
    victim_name: Optional[str] = None
    victim_phone: Optional[str] = None
    transaction_id: int
    alert_type: str = "SMS" # SMS, Push, Voice
    countdown_seconds: int = 45

class AlertCreate(AlertBase):
    pass

class AlertUpdate(BaseModel):
    status: Optional[str] = None # Sent, Acknowledged, Blocked, Escalated
    countdown_seconds: Optional[int] = None

class AlertResponse(AlertBase):
    id: int
    status: str
    sent_at: datetime

    class Config:
        from_attributes = True
