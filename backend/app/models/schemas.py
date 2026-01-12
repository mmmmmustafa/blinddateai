from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from enum import Enum


# Enums
class UserStatus(str, Enum):
    ONBOARDING = "onboarding"
    ACTIVE = "active"
    PAUSED = "paused"
    IN_CHAT = "in_chat"


class MatchStatus(str, Enum):
    CHATTING = "chatting"
    REVEALED = "revealed"
    CONTINUED = "continued"
    ENDED = "ended"


class Decision(str, Enum):
    CONTINUE = "continue"
    PASS = "pass"


# Auth Schemas
class PhoneNumberRequest(BaseModel):
    phone_number: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$")


class VerifyOTPRequest(BaseModel):
    phone_number: str
    otp: str = Field(..., min_length=6, max_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: UUID
    status: UserStatus


# User Schemas
class UserBase(BaseModel):
    phone_number: str
    status: UserStatus


class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# Profile Schemas
class ProfileBase(BaseModel):
    display_name: Optional[str] = None
    age: Optional[int] = None
    location: Optional[str] = None
    bio: Optional[str] = None


class ProfileCreate(ProfileBase):
    photos: Optional[List[str]] = []


class ProfileResponse(ProfileBase):
    id: UUID
    user_id: UUID
    pseudonym: Optional[str] = None
    photos: List[str] = []
    interests: List[str] = []
    onboarding_completed: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ProfileReveal(BaseModel):
    id: UUID
    display_name: str
    age: int
    location: str
    bio: str
    photos: List[str]
    compatibility_highlights: List[str] = []


# Onboarding Schemas
class OnboardingMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class OnboardingRequest(BaseModel):
    message: str


class OnboardingResponse(BaseModel):
    message: str
    profile_complete: bool = False
    extracted_data: Optional[Dict[str, Any]] = None


# Match Schemas
class MatchResponse(BaseModel):
    id: UUID
    partner_pseudonym: str
    initial_compatibility: float
    current_compatibility: float
    status: MatchStatus
    created_at: datetime
    
    class Config:
        from_attributes = True


class MatchDecisionRequest(BaseModel):
    decision: Decision


# Message Schemas
class MessageCreate(BaseModel):
    content: str


class MessageResponse(BaseModel):
    id: UUID
    sender_id: UUID
    content: str
    created_at: datetime
    is_mine: bool = False
    
    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    match: MatchResponse
    messages: List[MessageResponse]
    ai_suggestion: Optional[str] = None


# Compatibility Schemas
class CompatibilityUpdate(BaseModel):
    match_id: UUID
    new_score: float
    breakdown: Dict[str, float]
    reveal_triggered: bool = False


# WebSocket Schemas
class WSMessage(BaseModel):
    type: str  # "message", "typing", "compatibility_update", "reveal"
    data: Dict[str, Any]
