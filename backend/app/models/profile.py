import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, ARRAY, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.database import Base


class Profile(Base):
    __tablename__ = "profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    
    # Basic info
    display_name = Column(String(100))
    pseudonym = Column(String(100))  # AI-generated anonymous name
    age = Column(Integer)
    location = Column(String(200))
    photos = Column(ARRAY(String))
    bio = Column(Text)
    
    # Profile vector for matching (1536 dimensions for OpenAI embeddings)
    profile_vector = Column(Vector(1536))
    
    # Structured profile data from AI extraction
    personality = Column(JSONB, default={})
    values = Column(JSONB, default={})
    interests = Column(ARRAY(String), default=[])
    dealbreakers = Column(ARRAY(String), default=[])
    looking_for = Column(JSONB, default={})
    
    # Onboarding conversation history
    onboarding_messages = Column(JSONB, default=[])
    onboarding_completed = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="profile")
    
    def __repr__(self):
        return f"<Profile {self.id} - {self.display_name}>"
