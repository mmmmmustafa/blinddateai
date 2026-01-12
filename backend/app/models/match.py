import uuid
from datetime import datetime
from sqlalchemy import Column, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class MatchStatus(str, enum.Enum):
    CHATTING = "chatting"
    REVEALED = "revealed"
    CONTINUED = "continued"
    ENDED = "ended"


class Match(Base):
    __tablename__ = "matches"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_a_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    user_b_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    initial_compatibility = Column(Float, nullable=False)
    current_compatibility = Column(Float, nullable=False)
    
    # Compatibility breakdown
    compatibility_details = Column(JSONB, default={})
    
    status = Column(SQLEnum(MatchStatus), default=MatchStatus.CHATTING)
    
    # Decisions after reveal
    user_a_decision = Column(SQLEnum("continue", "pass", name="decision_enum"), nullable=True)
    user_b_decision = Column(SQLEnum("continue", "pass", name="decision_enum"), nullable=True)
    
    revealed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    messages = relationship("Message", back_populates="match", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Match {self.id} - {self.status}>"
