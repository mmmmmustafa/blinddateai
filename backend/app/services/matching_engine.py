from typing import Optional, Tuple, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, not_
from uuid import UUID

from app.models.user import User, UserStatus
from app.models.profile import Profile
from app.models.match import Match, MatchStatus
from app.agents.compatibility_scorer import CompatibilityScorer
from app.services.llm_service import LLMService


class MatchingEngine:
    """Engine for finding compatible matches."""
    
    MINIMUM_COMPATIBILITY = 0.50  # 50% minimum for initial match
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm_service = LLMService()
        self.scorer = CompatibilityScorer(self.llm_service)
    
    async def find_best_match(
        self,
        user_id: UUID,
        user_profile: Profile
    ) -> Optional[Tuple[Profile, float, Dict[str, Any]]]:
        """Find the best compatible match for a user."""
        
        # Get all potential matches (active users not already matched)
        potential_matches = await self._get_potential_matches(user_id)
        
        if not potential_matches:
            return None
        
        # Score each potential match
        scored_matches: List[Tuple[Profile, float, Dict[str, Any]]] = []
        
        for profile in potential_matches:
            score, details = self.scorer.calculate_initial_compatibility(
                user_profile,
                profile
            )
            
            # Check dealbreaker conflicts
            if not details.get("dealbreaker_conflict"):
                scored_matches.append((profile, score, details))
        
        if not scored_matches:
            return None
        
        # Filter by minimum compatibility
        qualified_matches = [
            m for m in scored_matches
            if m[1] >= self.MINIMUM_COMPATIBILITY
        ]
        
        if not qualified_matches:
            # If no qualified matches, return the best we have (above 40%)
            qualified_matches = [m for m in scored_matches if m[1] >= 0.40]
        
        if not qualified_matches:
            return None
        
        # Sort by score descending
        qualified_matches.sort(key=lambda x: x[1], reverse=True)
        
        # Return the best match
        return qualified_matches[0]
    
    async def _get_potential_matches(self, user_id: UUID) -> List[Profile]:
        """Get all profiles that could potentially be matched with user."""
        
        # Get IDs of users already matched with
        result = await self.db.execute(
            select(Match).where(
                or_(
                    Match.user_a_id == user_id,
                    Match.user_b_id == user_id
                )
            )
        )
        existing_matches = result.scalars().all()
        
        # Extract partner IDs from existing matches
        matched_user_ids = set()
        for match in existing_matches:
            if match.user_a_id == user_id:
                matched_user_ids.add(match.user_b_id)
            else:
                matched_user_ids.add(match.user_a_id)
        
        # Get active users with completed profiles
        query = (
            select(Profile)
            .join(User)
            .where(
                and_(
                    User.status == UserStatus.ACTIVE,
                    User.id != user_id,
                    Profile.onboarding_completed.isnot(None),
                    Profile.profile_vector.isnot(None)
                )
            )
        )
        
        # Exclude already matched users
        if matched_user_ids:
            query = query.where(not_(Profile.user_id.in_(matched_user_ids)))
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def vector_similarity_search(
        self,
        user_profile: Profile,
        limit: int = 10
    ) -> List[Tuple[Profile, float]]:
        """Find similar profiles using vector similarity (pgvector)."""
        if user_profile.profile_vector is None:
            return []
        
        # Use pgvector's cosine similarity
        # Note: This requires pgvector extension to be installed
        result = await self.db.execute(
            select(
                Profile,
                Profile.profile_vector.cosine_distance(user_profile.profile_vector).label("distance")
            )
            .where(
                and_(
                    Profile.user_id != user_profile.user_id,
                    Profile.profile_vector.isnot(None)
                )
            )
            .order_by("distance")
            .limit(limit)
        )
        
        rows = result.all()
        # Convert distance to similarity (1 - distance for cosine)
        return [(row[0], 1 - row[1]) for row in rows]
