from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
import json
import redis.asyncio as redis

from app.database import get_db
from app.api.deps import get_current_user
from app.api.auth import get_redis
from app.config import get_settings
from app.models.user import User
from app.models.profile import Profile
from app.models.match import Match, MatchStatus
from app.models.message import Message
from app.models.schemas import MessageCreate, MessageResponse, ChatResponse, MatchResponse
from app.agents.chat_facilitator import ChatFacilitator
from app.agents.compatibility_scorer import CompatibilityScorer
from app.services.llm_service import LLMService

router = APIRouter()
settings = get_settings()

# Store active WebSocket connections
active_connections: dict = {}


@router.get("/{match_id}", response_model=ChatResponse)
async def get_chat(
    match_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get chat messages for a match."""
    result = await db.execute(
        select(Match).where(Match.id == match_id)
    )
    match = result.scalar_one_or_none()
    
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if current_user.id not in [match.user_a_id, match.user_b_id]:
        raise HTTPException(status_code=403, detail="Not part of this match")
    
    # Get partner's pseudonym
    partner_id = match.user_b_id if match.user_a_id == current_user.id else match.user_a_id
    result = await db.execute(select(Profile).where(Profile.user_id == partner_id))
    partner_profile = result.scalar_one()
    
    # Get messages
    result = await db.execute(
        select(Message)
        .where(Message.match_id == match_id)
        .order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()
    
    # Get AI suggestion for conversation
    llm_service = LLMService()
    facilitator = ChatFacilitator(llm_service)
    
    # Get both profiles for context
    result = await db.execute(select(Profile).where(Profile.user_id == current_user.id))
    user_profile = result.scalar_one()
    
    ai_suggestion = None
    if len(messages) < 3:
        ai_suggestion = await facilitator.get_conversation_starter(
            user_profile,
            partner_profile,
            [m.content for m in messages]
        )
    
    return ChatResponse(
        match=MatchResponse(
            id=match.id,
            partner_pseudonym=partner_profile.pseudonym or "Mystery Person",
            initial_compatibility=match.initial_compatibility,
            current_compatibility=match.current_compatibility,
            status=match.status,
            created_at=match.created_at
        ),
        messages=[
            MessageResponse(
                id=m.id,
                sender_id=m.sender_id,
                content=m.content,
                created_at=m.created_at,
                is_mine=m.sender_id == current_user.id
            )
            for m in messages
        ],
        ai_suggestion=ai_suggestion
    )


@router.post("/{match_id}/send", response_model=MessageResponse)
async def send_message(
    match_id: str,
    request: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    r: redis.Redis = Depends(get_redis)
):
    """Send a message in a chat."""
    result = await db.execute(
        select(Match).where(Match.id == match_id)
    )
    match = result.scalar_one_or_none()
    
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if current_user.id not in [match.user_a_id, match.user_b_id]:
        raise HTTPException(status_code=403, detail="Not part of this match")
    
    if match.status == MatchStatus.ENDED:
        raise HTTPException(status_code=400, detail="Match has ended")
    
    # Create message
    llm_service = LLMService()
    facilitator = ChatFacilitator(llm_service)
    
    # Analyze message
    ai_analysis = await facilitator.analyze_message(request.content)
    
    message = Message(
        match_id=match.id,
        sender_id=current_user.id,
        content=request.content,
        ai_analysis=ai_analysis
    )
    db.add(message)
    
    # Update compatibility score
    scorer = CompatibilityScorer(llm_service)
    
    # Get all messages for context
    result = await db.execute(
        select(Message)
        .where(Message.match_id == match_id)
        .order_by(Message.created_at.asc())
    )
    all_messages = result.scalars().all()
    
    # Get both profiles
    result = await db.execute(select(Profile).where(Profile.user_id == match.user_a_id))
    profile_a = result.scalar_one()
    result = await db.execute(select(Profile).where(Profile.user_id == match.user_b_id))
    profile_b = result.scalar_one()
    
    # Calculate new compatibility
    new_compatibility, details = await scorer.calculate_compatibility(
        profile_a,
        profile_b,
        [{"sender_id": str(m.sender_id), "content": m.content, "analysis": m.ai_analysis} for m in all_messages],
        match.compatibility_details
    )
    
    match.current_compatibility = new_compatibility
    match.compatibility_details = details
    
    # Check if reveal threshold reached
    reveal_triggered = False
    if new_compatibility >= settings.compatibility_reveal_threshold and match.status == MatchStatus.CHATTING:
        match.status = MatchStatus.REVEALED
        match.revealed_at = datetime.utcnow()
        reveal_triggered = True
    
    await db.commit()
    
    # Publish to Redis for real-time updates
    partner_id = match.user_b_id if match.user_a_id == current_user.id else match.user_a_id
    await r.publish(
        f"chat:{match_id}",
        json.dumps({
            "type": "message",
            "data": {
                "id": str(message.id),
                "sender_id": str(message.sender_id),
                "content": message.content,
                "created_at": message.created_at.isoformat()
            }
        })
    )
    
    # Publish compatibility update
    await r.publish(
        f"chat:{match_id}",
        json.dumps({
            "type": "compatibility_update",
            "data": {
                "score": new_compatibility,
                "reveal_triggered": reveal_triggered
            }
        })
    )
    
    return MessageResponse(
        id=message.id,
        sender_id=message.sender_id,
        content=message.content,
        created_at=message.created_at,
        is_mine=True
    )


@router.websocket("/ws/{match_id}")
async def websocket_chat(
    websocket: WebSocket,
    match_id: str,
    db: AsyncSession = Depends(get_db)
):
    """WebSocket endpoint for real-time chat."""
    await websocket.accept()
    
    # Get Redis for pub/sub
    r = await get_redis()
    pubsub = r.pubsub()
    await pubsub.subscribe(f"chat:{match_id}")
    
    try:
        # Store connection
        if match_id not in active_connections:
            active_connections[match_id] = []
        active_connections[match_id].append(websocket)
        
        # Listen for messages
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])
                
    except WebSocketDisconnect:
        if match_id in active_connections:
            active_connections[match_id].remove(websocket)
    finally:
        await pubsub.unsubscribe(f"chat:{match_id}")


@router.get("/{match_id}/suggestion")
async def get_ai_suggestion(
    match_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI-powered conversation suggestion."""
    result = await db.execute(
        select(Match).where(Match.id == match_id)
    )
    match = result.scalar_one_or_none()
    
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if current_user.id not in [match.user_a_id, match.user_b_id]:
        raise HTTPException(status_code=403, detail="Not part of this match")
    
    # Get profiles
    result = await db.execute(select(Profile).where(Profile.user_id == current_user.id))
    user_profile = result.scalar_one()
    
    partner_id = match.user_b_id if match.user_a_id == current_user.id else match.user_a_id
    result = await db.execute(select(Profile).where(Profile.user_id == partner_id))
    partner_profile = result.scalar_one()
    
    # Get recent messages
    result = await db.execute(
        select(Message)
        .where(Message.match_id == match_id)
        .order_by(Message.created_at.desc())
        .limit(10)
    )
    messages = result.scalars().all()
    
    llm_service = LLMService()
    facilitator = ChatFacilitator(llm_service)
    
    suggestion = await facilitator.get_whisper_suggestion(
        user_profile,
        partner_profile,
        [m.content for m in reversed(messages)],
        match.compatibility_details
    )
    
    return {"suggestion": suggestion}
