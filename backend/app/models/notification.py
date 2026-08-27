from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=True)
    type = Column(String(50), nullable=False) # SMS, Push, Email, Browser
    recipient = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(50), default="Sent") # Sent, Delivered, Failed
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    transaction = relationship("Transaction")
