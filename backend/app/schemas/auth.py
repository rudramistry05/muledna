from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

# Base schema for shared attributes
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = Field(..., description="Admin, Investigator, Risk Analyst, Bank Employee")

# Request schema for user creation
class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

# Schema for updating a user
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    is_otp_verified: Optional[bool] = None

# Response schema for public/investigator viewing
class UserResponse(UserBase):
    id: int
    status: str
    is_otp_verified: bool
    created_at: datetime
    otp_code: Optional[str] = None

    class Config:
        from_attributes = True

# Login schema
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Token schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    type: Optional[str] = None

# OTP Validation schema
class OTPVerify(BaseModel):
    email: EmailStr
    otp_code: str

# Password Recovery schemas
class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str = Field(..., min_length=6)
