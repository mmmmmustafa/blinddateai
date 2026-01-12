from typing import List, Dict, Any, Optional
import random

from app.services.llm_service import LLMService
from app.models.profile import Profile


class OnboardingAgent:
    """AI agent for conducting onboarding conversations and building user profiles."""
    
    SYSTEM_PROMPT = """You are a friendly, witty dating app wingman/wingwoman. Your job is to have a natural conversation with the user to learn about them and what they're looking for in a partner.

CONVERSATION STYLE:
- Be warm, casual, and genuinely curious
- Use humor appropriately (not forced)
- Ask follow-up questions based on their responses
- Never be judgmental
- Keep responses concise (2-3 sentences max)
- Feel like a friend, not an interview

INFORMATION TO GATHER (don't ask directly, extract from conversation):
1. Name (first name only)
2. Age
3. Location (city)
4. Occupation and career ambitions
5. Personality traits (introvert/extrovert, humor style, communication preferences)
6. Core values (family, career, adventure, etc.)
7. Hobbies and interests
8. Dealbreakers (things they absolutely won't accept)
9. What they're looking for (relationship type, partner qualities)

CONVERSATION FLOW:
- Start with getting to know them (name, what they do, interests)
- Naturally transition to values and what makes them tick
- Then explore what they're looking for in a partner
- End with any dealbreakers

When you have enough information (all 9 areas covered), include "PROFILE_COMPLETE" in your response.

ALWAYS return a JSON object with:
{
    "message": "Your conversational response",
    "extracted_data": {
        "display_name": "extracted name or null",
        "age": "extracted age or null",
        "location": "extracted location or null",
        "personality": {"introversion": 0.0-1.0, "humor_style": [], "communication": ""},
        "values": {"career_ambition": 0.0-1.0, "family_orientation": 0.0-1.0, ...},
        "interests": ["list", "of", "interests"],
        "dealbreakers": ["list"],
        "looking_for": {"relationship_type": "", "age_range": [min, max], "must_haves": [], "nice_to_haves": []},
        "bio": "AI-generated bio based on conversation or null"
    },
    "profile_complete": false,
    "areas_covered": ["list of covered areas"],
    "areas_remaining": ["list of areas still to cover"]
}"""

    OPENING_MESSAGES = [
        "Hey there! 👋 I'm your dating wingman. Instead of boring forms, let's just chat! So tell me - what's your name and what gets you excited to start your day?",
        "Hi! I'm here to help you find your person. But first, let's skip the typical profile stuff. What's your name, and what do you do when you're not swiping on dating apps? 😄",
        "Welcome! I'm your AI matchmaker, and I promise this won't feel like a job interview. What should I call you, and what's something you're passionate about?"
    ]
    
    def __init__(self, llm_service: LLMService):
        self.llm = llm_service
    
    async def process_message(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        current_profile: Profile
    ) -> Dict[str, Any]:
        """Process a user message and generate response."""
        
        # If no history, return opening message
        if not conversation_history:
            opening = random.choice(self.OPENING_MESSAGES)
            return {
                "message": opening,
                "extracted_data": None,
                "profile_complete": False
            }
        
        # Build messages for LLM
        messages = [{"role": "system", "content": self.SYSTEM_PROMPT}]
        
        # Add current profile context
        profile_context = self._build_profile_context(current_profile)
        if profile_context:
            messages.append({
                "role": "system",
                "content": f"Current profile data collected so far: {profile_context}"
            })
        
        # Add conversation history
        for msg in conversation_history:
            messages.append(msg)
        
        # Add current user message
        messages.append({"role": "user", "content": user_message})
        
        # Get LLM response
        response = await self.llm.chat_with_json(messages, temperature=0.8)
        
        return response
    
    def _build_profile_context(self, profile: Profile) -> str:
        """Build context string from current profile data."""
        data = {}
        if profile.display_name:
            data["name"] = profile.display_name
        if profile.age:
            data["age"] = profile.age
        if profile.location:
            data["location"] = profile.location
        if profile.personality:
            data["personality"] = profile.personality
        if profile.values:
            data["values"] = profile.values
        if profile.interests:
            data["interests"] = profile.interests
        if profile.dealbreakers:
            data["dealbreakers"] = profile.dealbreakers
        if profile.looking_for:
            data["looking_for"] = profile.looking_for
        
        return str(data) if data else ""
    
    async def generate_profile_embedding(self, profile: Profile) -> List[float]:
        """Generate embedding vector for the profile."""
        # Build text representation of profile
        profile_text = f"""
        Name: {profile.display_name}
        Age: {profile.age}
        Location: {profile.location}
        Bio: {profile.bio or ''}
        
        Personality: {profile.personality}
        Values: {profile.values}
        Interests: {', '.join(profile.interests or [])}
        
        Looking for: {profile.looking_for}
        Dealbreakers: {', '.join(profile.dealbreakers or [])}
        """
        
        return await self.llm.get_embedding(profile_text)
    
    async def generate_pseudonym(self, profile: Profile) -> str:
        """Generate a creative anonymous pseudonym based on profile."""
        messages = [
            {
                "role": "system",
                "content": """Generate a creative, anonymous pseudonym for a dating app user. 
                The pseudonym should be two words that hint at their personality or interests 
                without revealing identity. Examples: "Sunset Hiker", "Midnight Chef", "Jazz Wanderer".
                Return JSON: {"pseudonym": "Two Word Name"}"""
            },
            {
                "role": "user",
                "content": f"Interests: {profile.interests}, Personality: {profile.personality}"
            }
        ]
        
        response = await self.llm.chat_with_json(messages, temperature=0.9)
        return response.get("pseudonym", "Mystery Person")
