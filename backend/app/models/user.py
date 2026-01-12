import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class UserStatus(str, enum.Enum):
    ONBOARDING = "onboarding"
    ACTIVE = "active"
    PAUSED = "paused"
    IN_CHAT = "in_chat"


class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone_number = Column(String(20), unique=True, nullable=False, index=True)
    status = Column(SQLEnum(UserStatus), default=UserStatus.ONBOARDING)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    profile = relationship("Profile", back_populates="user", uselist=False)
    
    def __repr__(self):
        return f"<User {self.id} - {self.phone_number}>"
