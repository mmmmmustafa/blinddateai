from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, UserStatus
from app.models.profile import Profile
from app.models.match import Match, MatchStatus
from app.models.schemas import MatchResponse, MatchDecisionRequest, ProfileReveal
from app.services.matching_engine import MatchingEngine

router = APIRouter()


@router.post("/find")
async def find_match(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Find a compatible match for the user."""
    if current_user.status not in [UserStatus.ACTIVE]:
        raise HTTPException(
            status_code=400,
            detail="Complete onboarding first to find matches"
        )
    
    # Check if user already has an active match
    result = await db.execute(
        select(Match).where(
            and_(
                or_(
                    Match.user_a_id == current_user.id,
                    Match.user_b_id == current_user.id
                ),
                Match.status == MatchStatus.CHATTING
            )
        )
    )
    existing_match = result.scalar_one_or_none()
    
    if existing_match:
        raise HTTPException(
            status_code=400,
            detail="You already have an active match"
        )
    
    # Get user's profile
    result = await db.execute(
        select(Profile).where(Profile.user_id == current_user.id)
    )
    user_profile = result.scalar_one_or_none()
    
    if user_profile is None or user_profile.profile_vector is None:
        raise HTTPException(
            status_code=400,
            detail="Profile not complete"
        )
    
    # Find compatible profiles
    matching_engine = MatchingEngine(db)
    match_result = await matching_engine.find_best_match(current_user.id, user_profile)
    
    if match_result is None:
        return {"message": "No compatible matches found. Try again later.", "match": None}
    
    matched_profile, compatibility_score, compatibility_details = match_result
    
    # Create match
    match = Match(
        user_a_id=current_user.id,
        user_b_id=matched_profile.user_id,
        initial_compatibility=compatibility_score,
        current_compatibility=compatibility_score,
        compatibility_details=compatibility_details,
        status=MatchStatus.CHATTING
    )
    db.add(match)
    
    # Update both users' status
    current_user.status = UserStatus.IN_CHAT
    result = await db.execute(select(User).where(User.id == matched_profile.user_id))
    matched_user = result.scalar_one()
    matched_user.status = UserStatus.IN_CHAT
    
    await db.commit()
    
    return {
        "message": "Match found!",
        "match": MatchResponse(
            id=match.id,
            partner_pseudonym=matched_profile.pseudonym or "Mystery Person",
            initial_compatibility=match.initial_compatibility,
            current_compatibility=match.current_compatibility,
            status=match.status,
            created_at=match.created_at
        )
    }


@router.get("/current", response_model=MatchResponse)
async def get_current_match(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's current active match."""
    result = await db.execute(
        select(Match).where(
            and_(
                or_(
                    Match.user_a_id == current_user.id,
                    Match.user_b_id == current_user.id
                ),
                Match.status.in_([MatchStatus.CHATTING, MatchStatus.REVEALED])
            )
        )
    )
    match = result.scalar_one_or_none()
    
    if match is None:
        raise HTTPException(status_code=404, detail="No active match")
    
    # Get partner's pseudonym
    partner_id = match.user_b_id if match.user_a_id == current_user.id else match.user_a_id
    result = await db.execute(select(Profile).where(Profile.user_id == partner_id))
    partner_profile = result.scalar_one()
    
    return MatchResponse(
        id=match.id,
        partner_pseudonym=partner_profile.pseudonym or "Mystery Person",
        initial_compatibility=match.initial_compatibility,
        current_compatibility=match.current_compatibility,
        status=match.status,
        created_at=match.created_at
    )


@router.get("/reveal/{match_id}", response_model=ProfileReveal)
async def get_revealed_profile(
    match_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get partner's revealed profile after compatibility threshold is reached."""
    result = await db.execute(
        select(Match).where(Match.id == match_id)
    )
    match = result.scalar_one_or_none()
    
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if current_user.id not in [match.user_a_id, match.user_b_id]:
        raise HTTPException(status_code=403, detail="Not part of this match")
    
    if match.status not in [MatchStatus.REVEALED, MatchStatus.CONTINUED]:
        raise HTTPException(
            status_code=400,
            detail="Profile not yet revealed"
        )
    
    # Get partner's profile
    partner_id = match.user_b_id if match.user_a_id == current_user.id else match.user_a_id
    result = await db.execute(select(Profile).where(Profile.user_id == partner_id))
    partner_profile = result.scalar_one()
    
    # Generate compatibility highlights
    highlights = []
    details = match.compatibility_details or {}
    if details.get("shared_interests"):
        highlights.append(f"You both love: {', '.join(details['shared_interests'][:3])}")
    if details.get("values_alignment", 0) > 0.7:
        highlights.append("Strong values alignment")
    if details.get("humor_compatibility", 0) > 0.7:
        highlights.append("Compatible sense of humor")
    
    return ProfileReveal(
        id=partner_profile.id,
        display_name=partner_profile.display_name or "Unknown",
        age=partner_profile.age or 0,
        location=partner_profile.location or "Unknown",
        bio=partner_profile.bio or "",
        photos=partner_profile.photos or [],
        compatibility_highlights=highlights
    )


@router.post("/{match_id}/decision")
async def submit_decision(
    match_id: str,
    request: MatchDecisionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit decision after profile reveal."""
    result = await db.execute(
        select(Match).where(Match.id == match_id)
    )
    match = result.scalar_one_or_none()
    
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if current_user.id not in [match.user_a_id, match.user_b_id]:
        raise HTTPException(status_code=403, detail="Not part of this match")
    
    if match.status != MatchStatus.REVEALED:
        raise HTTPException(
            status_code=400,
            detail="Match not in revealed state"
        )
    
    # Record decision
    if current_user.id == match.user_a_id:
        match.user_a_decision = request.decision.value
    else:
        match.user_b_decision = request.decision.value
    
    # Check if both have decided
    if match.user_a_decision and match.user_b_decision:
        if match.user_a_decision == "continue" and match.user_b_decision == "continue":
            match.status = MatchStatus.CONTINUED
        else:
            match.status = MatchStatus.ENDED
            # Return both users to active pool
            result = await db.execute(select(User).where(User.id == match.user_a_id))
            user_a = result.scalar_one()
            user_a.status = UserStatus.ACTIVE
            
            result = await db.execute(select(User).where(User.id == match.user_b_id))
            user_b = result.scalar_one()
            user_b.status = UserStatus.ACTIVE
    
    await db.commit()
    
    return {
        "message": "Decision recorded",
        "your_decision": request.decision.value,
        "waiting_for_partner": match.user_a_decision is None or match.user_b_decision is None,
        "match_status": match.status.value
    }


@router.get("/history")
async def get_match_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[MatchResponse]:
    """Get user's match history."""
    result = await db.execute(
        select(Match).where(
            or_(
                Match.user_a_id == current_user.id,
                Match.user_b_id == current_user.id
            )
        ).order_by(Match.created_at.desc())
    )
    matches = result.scalars().all()
    
    response = []
    for match in matches:
        partner_id = match.user_b_id if match.user_a_id == current_user.id else match.user_a_id
        result = await db.execute(select(Profile).where(Profile.user_id == partner_id))
        partner_profile = result.scalar_one_or_none()
        
        response.append(MatchResponse(
            id=match.id,
            partner_pseudonym=partner_profile.pseudonym if partner_profile else "Unknown",
            initial_compatibility=match.initial_compatibility,
            current_compatibility=match.current_compatibility,
            status=match.status,
            created_at=match.created_at
        ))
    
    return response
