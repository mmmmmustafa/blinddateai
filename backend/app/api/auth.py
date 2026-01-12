import random
import string
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt
import redis.asyncio as redis

from app.database import get_db
from app.config import get_settings
from app.models.user import User, UserStatus
from app.models.profile import Profile
from app.models.schemas import (
    PhoneNumberRequest,
    VerifyOTPRequest,
    TokenResponse,
    UserResponse
)

router = APIRouter()
settings = get_settings()

# Redis client for OTP storage
redis_client: Optional[redis.Redis] = None


async def get_redis():
    global redis_client
    if redis_client is None:
        redis_client = redis.from_url(settings.redis_url, decode_responses=True)
    return redis_client


def generate_otp() -> str:
    """Generate a 6-digit OTP."""
    return ''.join(random.choices(string.digits, k=6))


def create_access_token(user_id: str) -> str:
    """Create JWT access token."""
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode = {
        "sub": user_id,
        "exp": expire
    }
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


# Re-export get_current_user from deps for backward compatibility
from app.api.deps import get_current_user


@router.post("/send-otp")
async def send_otp(
    request: PhoneNumberRequest,
    r: redis.Redis = Depends(get_redis)
):
    """Send OTP to phone number."""
    otp = generate_otp()
    
    # Store OTP in Redis with 5 minute expiry
    await r.setex(f"otp:{request.phone_number}", 300, otp)
    
    # In production, send via Twilio
    # For MVP, we'll just return success and log the OTP
    print(f"OTP for {request.phone_number}: {otp}")
    
    # TODO: Implement Twilio SMS sending
    # from twilio.rest import Client
    # client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
    # client.messages.create(
    #     body=f"Your BlindDate verification code is: {otp}",
    #     from_=settings.twilio_phone_number,
    #     to=request.phone_number
    # )
    
    return {"message": "OTP sent successfully", "debug_otp": otp}  # Remove debug_otp in production


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(
    request: VerifyOTPRequest,
    db: AsyncSession = Depends(get_db),
    r: redis.Redis = Depends(get_redis)
):
    """Verify OTP and return access token."""
    # Get stored OTP
    stored_otp = await r.get(f"otp:{request.phone_number}")
    
    if stored_otp is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP expired or not found"
        )
    
    if stored_otp != request.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP"
        )
    
    # Delete used OTP
    await r.delete(f"otp:{request.phone_number}")
    
    # Find or create user
    result = await db.execute(
        select(User).where(User.phone_number == request.phone_number)
    )
    user = result.scalar_one_or_none()
    
    if user is None:
        # Create new user
        user = User(phone_number=request.phone_number, status=UserStatus.ONBOARDING)
        db.add(user)
        await db.flush()
        
        # Create empty profile
        profile = Profile(user_id=user.id)
        db.add(profile)
        await db.commit()
    
    # Generate token
    access_token = create_access_token(str(user.id))
    
    return TokenResponse(
        access_token=access_token,
        user_id=user.id,
        status=user.status
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user)
):
    """Get current user info."""
    return current_user
