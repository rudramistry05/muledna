from datetime import datetime, timedelta
import random
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin, UserResponse, Token, OTPVerify, ForgotPassword, ResetPassword

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login-form-dummy")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
        
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    if user.status != "Active":
        raise HTTPException(status_code=400, detail="Inactive user account")
        
    return user

def check_role(required_roles: list):
    def dependency(current_user: User = Depends(get_current_user)):
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource"
            )
        return current_user
    return dependency

@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    # Generate mock OTP code (for demonstration)
    otp = str(random.randint(100000, 999999))
    otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    
    hashed_password = get_password_hash(user_in.password)
    db_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        role=user_in.role,
        status="Active",
        is_otp_verified=False,
        otp_code=otp,
        otp_expiry=otp_expiry
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    print(f"[MuleDNA] OTP for {db_user.email} is: {otp} (expires in 10 mins)")
    return db_user

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_in.email).first()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
    # Standard security flow: trigger OTP login challenge
    otp = str(random.randint(100000, 999999))
    user.otp_code = otp
    user.otp_expiry = datetime.utcnow() + timedelta(minutes=5)
    db.commit()
    
    print(f"[MuleDNA] OTP Challenge for {user.email}: {otp}")
    
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/verify-otp", response_model=dict)
def verify_otp(verify_in: OTPVerify, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == verify_in.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not user.otp_code or user.otp_code != verify_in.otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
        
    if user.otp_expiry and user.otp_expiry < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP code expired")
        
    user.is_otp_verified = True
    user.otp_code = None
    user.otp_expiry = None
    db.commit()
    
    return {"status": "Success", "message": "OTP verified successfully"}

@router.post("/forgot-password", response_model=dict)
def forgot_password(forgot_in: ForgotPassword, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == forgot_in.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered")
        
    otp = str(random.randint(100000, 999999))
    user.otp_code = otp
    user.otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    
    print(f"[MuleDNA] Password Reset OTP for {user.email}: {otp}")
    return {"status": "Success", "message": "Password reset OTP dispatched successfully"}

@router.post("/reset-password", response_model=dict)
def reset_password(reset_in: ResetPassword, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == reset_in.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not user.otp_code or user.otp_code != reset_in.otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
        
    if user.otp_expiry and user.otp_expiry < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP code expired")
        
    user.hashed_password = get_password_hash(reset_in.new_password)
    user.is_otp_verified = True
    user.otp_code = None
    user.otp_expiry = None
    db.commit()
    
    return {"status": "Success", "message": "Password updated successfully"}

@router.post("/refresh", response_model=dict)
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or user.status != "Active":
        raise HTTPException(status_code=401, detail="User not active")
        
    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
