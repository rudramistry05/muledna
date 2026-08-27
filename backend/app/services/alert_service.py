import os
import re
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.alert import Alert
from app.models.transaction import Transaction
from twilio.rest import Client

def _clean_phone_number(num: str) -> str:
    if not num:
        return num
    # Remove all spaces, dashes, parentheses, and non-digit characters except leading '+'
    clean = re.sub(r'[^\d+]', '', str(num).strip())
    if not clean.startswith("+"):
        clean = "+" + clean
    return clean

def _strip_ansi(text: str) -> str:
    if not text:
        return text
    return re.sub(r'\x1b\[[0-9;]*[a-zA-Z]', '', str(text))

class RealTimeAlertService:
    def __init__(self, db: Session):
        self.db = db
        # Initialize Twilio Client
        self.twilio_enabled = False
        if settings.TWILIO_ACCOUNT_SID and not settings.TWILIO_ACCOUNT_SID.startswith("ACXXXXXX"):
            try:
                self.twilio_client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
                self.twilio_enabled = True
            except Exception as e:
                print(f"[MuleDNA] Twilio client initialization failed: {_strip_ansi(str(e))}")
                self.twilio_client = None

    def trigger_transaction_alert(self, transaction_id: int, victim_name: str, victim_phone: str, amount: float) -> Alert:
        """
        Triggers SMS/Push/Voice warning sequence for the victim.
        Saves the alert state to the DB and simulates delivery.
        """
        # Create Alert database record
        alert_record = Alert(
            victim_name=victim_name,
            victim_phone=victim_phone,
            transaction_id=transaction_id,
            status="Sent",
            alert_type="SMS",
            countdown_seconds=45
        )
        self.db.add(alert_record)
        self.db.commit()
        self.db.refresh(alert_record)
        
        sms_body = (
            f"ALERT: Bank of India Fraud Prevention Unit has detected a highly suspicious transfer "
            f"of Rs.{amount:,.2f} on your account. If this was NOT you, please click here to freeze: "
            f"http://muledna.boi.co.in/freeze-auth?alert_id={alert_record.id} within 45 seconds."
        )
        
        # 1. Twilio Live SMS Dispatch
        if self.twilio_enabled and self.twilio_client and victim_phone:
            clean_from = _clean_phone_number(os.getenv("TWILIO_FROM_NUMBER", settings.TWILIO_FROM_NUMBER))
            clean_to = _clean_phone_number(victim_phone)
            try:
                self.twilio_client.messages.create(
                    body=sms_body,
                    from_=clean_from,
                    to=clean_to
                )
                print(f"[MuleDNA] Alert SMS successfully dispatched via Twilio to {clean_to}")
            except Exception as e:
                clean_err = _strip_ansi(str(e))
                print(f"[MuleDNA] Twilio SMS dispatch error: {clean_err}. Falling back to visual simulator.")
        else:
            print(f"[MuleDNA] [SIMULATION] Dispatching SMS Alert to {victim_phone}: {sms_body}")
            
        # 2. Firebase Cloud Messaging (FCM) Push Mock
        print(f"[MuleDNA] [SIMULATION] Dispatching Push notification to victim device fingerprint.")
        
        return alert_record

    def simulate_voice_call(self, alert_id: int) -> dict:
        """
        Simulates an automated voice callback warning sequence.
        """
        alert = self.db.query(Alert).filter(Alert.id == alert_id).first()
        if not alert:
            return {"status": "Error", "message": "Alert not found"}
            
        alert.alert_type = "Voice"
        alert.status = "Escalated"
        self.db.commit()
        
        voice_script = (
            f"Hello, this is an automated security call from Bank of India. We have suspended a suspicious "
            f"payout from your account. Press 1 to block and secure, or press 2 to authorize this transfer."
        )
        
        print(f"[MuleDNA] [SIMULATION] Initiating Voice warning call to {alert.victim_phone} script: {voice_script}")
        return {"status": "Calling", "script": voice_script}

    def send_direct_sms(self, phone_number: str, message_text: str = None, alert_type: str = "SMS") -> dict:
        """
        Dispatches real-time SMS or Voice call to target phone number via Twilio API.
        Saves DB alert record and returns dispatch details.
        """
        if not message_text:
            message_text = (
                "SECURITY ALERT: Bank of India Fraud Control Panel has detected high-risk activity on your profile. "
                "If you did not authorize this, please contact HQ Mumbai immediately."
            )
            
        clean_phone = _clean_phone_number(phone_number)

        # Create alert record in DB
        alert_record = Alert(
            victim_name="Direct Target",
            victim_phone=clean_phone,
            transaction_id=1,
            status="Sent",
            alert_type=alert_type,
            countdown_seconds=45
        )
        self.db.add(alert_record)
        self.db.commit()
        self.db.refresh(alert_record)

        dispatch_status = "Simulated"
        sid = None
        error_msg = None

        if alert_type == "Voice":
            if self.twilio_enabled and self.twilio_client and clean_phone:
                clean_from = _clean_phone_number(os.getenv("TWILIO_FROM_NUMBER", settings.TWILIO_FROM_NUMBER))
                try:
                    twiml_str = f'<Response><Say voice="alice">{message_text}</Say></Response>'
                    call = self.twilio_client.calls.create(
                        twiml=twiml_str,
                        from_=clean_from,
                        to=clean_phone
                    )
                    dispatch_status = "Live Voice Call Placed"
                    sid = call.sid
                    print(f"[MuleDNA Twilio] Live Voice Call initiated to {clean_phone}, Call SID: {call.sid}")
                except Exception as e:
                    clean_err = _strip_ansi(str(e))
                    error_msg = clean_err
                    dispatch_status = f"[Simulation Fallback] Voice Call simulated for {clean_phone} (Reason: {clean_err})"
                    print(f"[MuleDNA Twilio Error] Voice Call dispatch failed: {clean_err}")
            else:
                dispatch_status = "Voice Simulation Dispatched"
                print(f"[MuleDNA Voice Simulation] Dialed {clean_phone}: {message_text}")
        else:
            if self.twilio_enabled and self.twilio_client and clean_phone:
                clean_from = _clean_phone_number(os.getenv("TWILIO_FROM_NUMBER", settings.TWILIO_FROM_NUMBER))
                try:
                    msg = self.twilio_client.messages.create(
                        body=message_text,
                        from_=clean_from,
                        to=clean_phone
                    )
                    dispatch_status = "Live SMS Dispatched"
                    sid = msg.sid
                    print(f"[MuleDNA Twilio] Live SMS dispatched to {clean_phone}, Message SID: {msg.sid}")
                except Exception as e:
                    clean_err = _strip_ansi(str(e))
                    error_msg = clean_err
                    dispatch_status = f"[Simulation Fallback] SMS simulated for {clean_phone} (Reason: {clean_err})"
                    print(f"[MuleDNA Twilio Error] SMS dispatch failed: {clean_err}")
            else:
                dispatch_status = "SMS Simulation Dispatched"
                print(f"[MuleDNA SMS Simulation] Sent to {clean_phone}: {message_text}")

        return {
            "status": "Success" if not error_msg else "Warning",
            "dispatch_status": dispatch_status,
            "alert_id": alert_record.id,
            "phone_number": clean_phone,
            "message": message_text,
            "twilio_sid": sid,
            "twilio_enabled": self.twilio_enabled,
            "error_detail": error_msg
        }

