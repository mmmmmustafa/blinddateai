from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, UserStatus
from app.models.profile import Profile
from app.models.schemas import OnboardingRequest, OnboardingResponse
from app.agents.onboarding_agent import OnboardingAgent
from app.services.llm_service import LLMService

router = APIRouter()


@router.post("/chat", response_model=OnboardingResponse)
async def onboarding_chat(
    request: OnboardingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Chat with AI for profile building."""
    if current_user.status != UserStatus.ONBOARDING:
        raise HTTPException(
            status_code=400,
            detail="Onboarding already completed"
        )
    
    # Get user's profile
    result = await db.execute(
        select(Profile).where(Profile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Initialize agent
    llm_service = LLMService()
    agent = OnboardingAgent(llm_service)
    
    # Get conversation history
    conversation_history = profile.onboarding_messages or []
    
    # Process message
    response = await agent.process_message(
        user_message=request.message,
        conversation_history=conversation_history,
        current_profile=profile
    )
    
    # Update conversation history
    conversation_history.append({"role": "user", "content": request.message})
    conversation_history.append({"role": "assistant", "content": response["message"]})
    profile.onboarding_messages = conversation_history
    
    # Update extracted profile data
    if response.get("extracted_data"):
        data = response["extracted_data"]
        if data.get("display_name"):
            profile.display_name = data["display_name"]
        if data.get("age"):
            profile.age = data["age"]
        if data.get("location"):
            profile.location = data["location"]
        if data.get("personality"):
            profile.personality = data["personality"]
        if data.get("values"):
            profile.values = data["values"]
        if data.get("interests"):
            profile.interests = data["interests"]
        if data.get("dealbreakers"):
            profile.dealbreakers = data["dealbreakers"]
        if data.get("looking_for"):
            profile.looking_for = data["looking_for"]
        if data.get("bio"):
            profile.bio = data["bio"]
    
    # Check if profile is complete
    if response.get("profile_complete"):
        from datetime import datetime
        profile.onboarding_completed = datetime.utcnow()
        current_user.status = UserStatus.ACTIVE
        
        # Generate profile embedding
        profile.profile_vector = await agent.generate_profile_embedding(profile)
        
        # Generate pseudonym
        profile.pseudonym = await agent.generate_pseudonym(profile)
    
    await db.commit()
    
    return OnboardingResponse(
        message=response["message"],
        profile_complete=response.get("profile_complete", False),
        extracted_data=response.get("extracted_data")
    )


@router.get("/progress")
async def get_onboarding_progress(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current onboarding progress."""
    result = await db.execute(
        select(Profile).where(Profile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Calculate progress based on filled fields
    fields = [
        profile.display_name,
        profile.age,
        profile.location,
        profile.personality,
        profile.values,
        profile.interests,
        profile.looking_for
    ]
    filled = sum(1 for f in fields if f)
    progress = filled / len(fields) * 100
    
    return {
        "progress": progress,
        "messages_count": len(profile.onboarding_messages or []),
        "completed": profile.onboarding_completed is not None
    }
