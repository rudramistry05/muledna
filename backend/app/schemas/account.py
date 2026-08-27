from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from decimal import Decimal

# Device schemas
class DeviceBase(BaseModel):
    device_uuid: str
    device_name: Optional[str] = None
    os: Optional[str] = None
    ip_address: Optional[str] = None

class DeviceResponse(DeviceBase):
    id: int
    last_login: datetime

    class Config:
        from_attributes = True

# Location schemas
class LocationBase(BaseModel):
    country: Optional[str] = None
    city: Optional[str] = None
    ip_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class LocationResponse(LocationBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True

# Account schemas
class AccountBase(BaseModel):
    account_number: str
    customer_name: str
    balance: Decimal
    phone_number: Optional[str] = None
    email: Optional[str] = None
    home_branch: Optional[str] = "Mumbai Main Branch"
    routing_number: Optional[str] = None

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    customer_name: Optional[str] = None
    risk_score: Optional[float] = None
    status: Optional[str] = None # Active, Suspended, Frozen
    balance: Optional[Decimal] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None

class AccountResponse(AccountBase):
    id: int
    risk_score: float
    status: str
    created_at: datetime
    devices: List[DeviceResponse] = []
    locations: List[LocationResponse] = []

    class Config:
        from_attributes = True
