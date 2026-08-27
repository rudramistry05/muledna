from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.alert import Alert
from app.schemas.alert import AlertResponse, AlertUpdate
from app.services.alert_service import RealTimeAlertService

router = APIRouter(prefix="/alerts", tags=["Victim Alerts"])

class DirectSMSRequest(BaseModel):
    phone_number: str = Field(..., description="Target victim phone number e.g. +919876543210")
    message: Optional[str] = None
    alert_type: str = "SMS" # SMS or Voice

# ==============================================================================
# STATIC ROUTES (Must be declared BEFORE dynamic /{alert_id} parameterized routes)
# ==============================================================================

@router.get("/", response_model=List[AlertResponse])
def get_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Alert).order_by(Alert.sent_at.desc()).all()

@router.get("/active", response_model=List[AlertResponse])
def get_active_alerts(
    db: Session = Depends(get_db)
):
    """
    Returns active alerts currently undergoing countdown.
    Does not require authentication for simple simulation updates.
    """
    return db.query(Alert).filter(Alert.status == "Sent").all()

@router.post("/send-direct-sms", response_model=dict)
def send_direct_sms(
    payload: DirectSMSRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert_service = RealTimeAlertService(db)
    res = alert_service.send_direct_sms(
        phone_number=payload.phone_number,
        message_text=payload.message,
        alert_type=payload.alert_type
    )
    return res

# ==============================================================================
# DYNAMIC PARAMETERIZED ROUTES (Declared AFTER all static routes)
# ==============================================================================

@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert_by_id(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert record not found")
    return alert

@router.put("/{alert_id}", response_model=AlertResponse)
def update_alert(
    alert_id: int,
    alert_in: AlertUpdate,
    db: Session = Depends(get_db)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert record not found")
        
    if alert_in.status:
        alert.status = alert_in.status
    if alert_in.countdown_seconds is not None:
        alert.countdown_seconds = alert_in.countdown_seconds
        
    db.commit()
    db.refresh(alert)
    return alert

@router.post("/{alert_id}/voice", response_model=dict)
def trigger_voice_call(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert_service = RealTimeAlertService(db)
    res = alert_service.simulate_voice_call(alert_id)
    if res.get("status") == "Error":
        raise HTTPException(status_code=404, detail=res["message"])
    return res
