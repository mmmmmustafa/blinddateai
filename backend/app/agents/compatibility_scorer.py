from typing import List, Dict, Any, Tuple

from app.services.llm_service import LLMService
from app.models.profile import Profile


class CompatibilityScorer:
    """AI agent that calculates and updates compatibility scores during chat."""
    
    # Weights for different compatibility dimensions
    WEIGHTS = {
        "values_alignment": 0.30,
        "personality_fit": 0.25,
        "interest_overlap": 0.20,
        "preference_match": 0.15,
        "complementary_traits": 0.10
    }
    
    # Weights for conversation signals
    CONVERSATION_WEIGHTS = {
        "engagement": 0.15,
        "depth": 0.20,
        "humor_compatibility": 0.15,
        "value_discovery": 0.25,
        "conflict_handling": 0.15,
        "mutual_curiosity": 0.10
    }
    
    def __init__(self, llm_service: LLMService):
        self.llm = llm_service
    
    def calculate_initial_compatibility(
        self,
        profile_a: Profile,
        profile_b: Profile
    ) -> Tuple[float, Dict[str, Any]]:
        """Calculate initial compatibility score from profiles."""
        details = {}
        
        # Values alignment
        values_a = profile_a.values or {}
        values_b = profile_b.values or {}
        if values_a and values_b:
            shared_keys = set(values_a.keys()).intersection(values_b.keys())
            if shared_keys:
                value_diffs = [abs(values_a[k] - values_b[k]) for k in shared_keys]
                details["values_alignment"] = 1 - (sum(value_diffs) / len(value_diffs))
            else:
                details["values_alignment"] = 0.5
        else:
            details["values_alignment"] = 0.5
        
        # Interest overlap
        interests_a = set(profile_a.interests or [])
        interests_b = set(profile_b.interests or [])
        if interests_a and interests_b:
            shared = interests_a.intersection(interests_b)
            total = interests_a.union(interests_b)
            details["interest_overlap"] = len(shared) / len(total) if total else 0.5
            details["shared_interests"] = list(shared)
        else:
            details["interest_overlap"] = 0.5
            details["shared_interests"] = []
        
        # Personality fit
        personality_a = profile_a.personality or {}
        personality_b = profile_b.personality or {}
        if personality_a and personality_b:
            # Check complementary communication styles
            comm_a = personality_a.get("communication", "")
            comm_b = personality_b.get("communication", "")
            if comm_a and comm_b:
                # Similar communication styles are good
                details["personality_fit"] = 0.7 if comm_a == comm_b else 0.5
            else:
                details["personality_fit"] = 0.5
            
            # Humor style match
            humor_a = set(personality_a.get("humor_style", []))
            humor_b = set(personality_b.get("humor_style", []))
            if humor_a and humor_b:
                shared_humor = humor_a.intersection(humor_b)
                details["humor_compatibility"] = len(shared_humor) / max(len(humor_a), len(humor_b))
            else:
                details["humor_compatibility"] = 0.5
        else:
            details["personality_fit"] = 0.5
            details["humor_compatibility"] = 0.5
        
        # Preference match
        prefs_a = profile_a.looking_for or {}
        prefs_b = profile_b.looking_for or {}
        pref_score = 0.5
        
        # Check age preferences
        age_range_a = prefs_a.get("age_range", [18, 100])
        age_range_b = prefs_b.get("age_range", [18, 100])
        if profile_a.age and profile_b.age:
            a_in_b_range = age_range_b[0] <= profile_a.age <= age_range_b[1]
            b_in_a_range = age_range_a[0] <= profile_b.age <= age_range_a[1]
            if a_in_b_range and b_in_a_range:
                pref_score = 0.8
            elif a_in_b_range or b_in_a_range:
                pref_score = 0.5
            else:
                pref_score = 0.2
        
        # Check relationship type match
        rel_type_a = prefs_a.get("relationship_type", "")
        rel_type_b = prefs_b.get("relationship_type", "")
        if rel_type_a and rel_type_b:
            if rel_type_a == rel_type_b:
                pref_score = min(pref_score + 0.2, 1.0)
        
        details["preference_match"] = pref_score
        
        # Dealbreaker check
        dealbreakers_a = set(profile_a.dealbreakers or [])
        dealbreakers_b = set(profile_b.dealbreakers or [])
        interests_combined = interests_a.union(interests_b)
        
        # If someone's interest is another's dealbreaker, reduce score
        conflict_a = dealbreakers_a.intersection(interests_b)
        conflict_b = dealbreakers_b.intersection(interests_a)
        
        if conflict_a or conflict_b:
            details["dealbreaker_conflict"] = True
            details["preference_match"] *= 0.5
        else:
            details["dealbreaker_conflict"] = False
        
        # Complementary traits (simplified)
        details["complementary_traits"] = 0.5
        
        # Calculate weighted score
        score = (
            details["values_alignment"] * self.WEIGHTS["values_alignment"] +
            details["interest_overlap"] * self.WEIGHTS["interest_overlap"] +
            details["personality_fit"] * self.WEIGHTS["personality_fit"] +
            details["preference_match"] * self.WEIGHTS["preference_match"] +
            details["complementary_traits"] * self.WEIGHTS["complementary_traits"]
        )
        
        details["initial_score"] = score
        
        return score, details
    
    async def calculate_compatibility(
        self,
        profile_a: Profile,
        profile_b: Profile,
        messages: List[Dict[str, Any]],
        current_details: Dict[str, Any]
    ) -> Tuple[float, Dict[str, Any]]:
        """Calculate updated compatibility based on conversation."""
        if not messages:
            return current_details.get("initial_score", 0.5), current_details
        
        # Analyze conversation dynamics
        analysis = await self._analyze_conversation(messages)
        
        # Update details with conversation signals
        details = current_details.copy()
        details["conversation_analysis"] = analysis
        
        # Calculate conversation-based adjustment
        conv_signals = {
            "engagement": analysis.get("avg_engagement", 5) / 10,
            "depth": {"surface": 0.3, "medium": 0.6, "deep": 0.9}.get(
                analysis.get("overall_depth", "medium"), 0.5
            ),
            "humor_compatibility": 0.7 if analysis.get("humor_match", False) else 0.4,
            "value_discovery": len(analysis.get("shared_values_discovered", [])) * 0.1 + 0.4,
            "conflict_handling": analysis.get("conflict_resolution_score", 0.5),
            "mutual_curiosity": analysis.get("question_balance", 0.5)
        }
        
        # Calculate conversation adjustment
        conv_adjustment = sum(
            conv_signals[k] * self.CONVERSATION_WEIGHTS[k]
            for k in self.CONVERSATION_WEIGHTS
        )
        
        # Blend initial compatibility with conversation signals
        # As more messages are exchanged, weight conversation more
        message_factor = min(len(messages) / 50, 0.6)  # Max 60% weight to conversation
        
        initial_score = current_details.get("initial_score", 0.5)
        new_score = initial_score * (1 - message_factor) + conv_adjustment * message_factor
        
        # Apply message-specific boosts
        for msg in messages[-5:]:  # Last 5 messages
            msg_analysis = msg.get("analysis", {})
            if msg_analysis.get("vulnerability_shown"):
                new_score = min(new_score + 0.02, 1.0)
            if msg_analysis.get("connection_indicators", 0) > 7:
                new_score = min(new_score + 0.01, 1.0)
        
        details["current_score"] = new_score
        details["conversation_signals"] = conv_signals
        
        return new_score, details
    
    async def _analyze_conversation(
        self,
        messages: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze overall conversation dynamics."""
        if not messages:
            return {}
        
        # Aggregate message analyses
        analyses = [m.get("analysis", {}) for m in messages if m.get("analysis")]
        
        if not analyses:
            return {}
        
        # Calculate averages
        avg_engagement = sum(a.get("engagement_level", 5) for a in analyses) / len(analyses)
        
        # Determine overall depth
        depths = [a.get("conversation_depth", "medium") for a in analyses]
        depth_scores = {"surface": 1, "medium": 2, "deep": 3}
        avg_depth_score = sum(depth_scores.get(d, 2) for d in depths) / len(depths)
        overall_depth = "surface" if avg_depth_score < 1.5 else "deep" if avg_depth_score > 2.5 else "medium"
        
        # Humor match - both should have humor or neither
        humor_msgs = [a.get("humor_detected", False) for a in analyses]
        humor_match = sum(humor_msgs) / len(humor_msgs) > 0.3  # At least 30% humorous
        
        # Collect discovered values
        all_values = []
        for a in analyses:
            all_values.extend(a.get("value_signals", []))
        
        # Question balance (mutual curiosity)
        total_questions = sum(a.get("questions_asked", 0) for a in analyses)
        question_balance = min(total_questions / (len(messages) * 0.5), 1.0)  # Expect ~0.5 questions per message
        
        return {
            "avg_engagement": avg_engagement,
            "overall_depth": overall_depth,
            "humor_match": humor_match,
            "shared_values_discovered": list(set(all_values)),
            "question_balance": question_balance,
            "conflict_resolution_score": 0.5,  # Would need more complex analysis
            "message_count": len(messages)
        }
