import uuid
from datetime import datetime
from sqlalchemy import Column, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class Message(Base):
    __tablename__ = "messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(UUID(as_uuid=True), ForeignKey("matches.id"), nullable=False)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    content = Column(Text, nullable=False)
    
    # AI analysis of this message
    ai_analysis = Column(JSONB, default={})
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    match = relationship("Match", back_populates="messages")
    
    def __repr__(self):
        return f"<Message {self.id}>"
