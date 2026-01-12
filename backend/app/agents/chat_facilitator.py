from typing import List, Dict, Any, Optional

from app.services.llm_service import LLMService
from app.models.profile import Profile


class ChatFacilitator:
    """AI agent that facilitates blind chat conversations."""
    
    def __init__(self, llm_service: LLMService):
        self.llm = llm_service
    
    async def analyze_message(self, content: str) -> Dict[str, Any]:
        """Analyze a message for various conversation signals."""
        messages = [
            {
                "role": "system",
                "content": """Analyze this dating chat message and return JSON with:
                {
                    "sentiment": "positive/negative/neutral",
                    "engagement_level": 1-10,
                    "conversation_depth": "surface/medium/deep",
                    "humor_detected": true/false,
                    "questions_asked": number,
                    "vulnerability_shown": true/false,
                    "interest_signals": ["list of topics/interests mentioned"],
                    "value_signals": ["any values or beliefs expressed"],
                    "red_flags": ["any concerning patterns"],
                    "connection_indicators": 1-10
                }"""
            },
            {"role": "user", "content": content}
        ]
        
        return await self.llm.chat_with_json(messages, temperature=0.3)
    
    async def get_conversation_starter(
        self,
        user_profile: Profile,
        partner_profile: Profile,
        existing_messages: List[str]
    ) -> Optional[str]:
        """Generate a conversation starter suggestion based on shared interests."""
        if existing_messages and len(existing_messages) > 2:
            return None
        
        # Find shared interests
        user_interests = set(user_profile.interests or [])
        partner_interests = set(partner_profile.interests or [])
        shared = user_interests.intersection(partner_interests)
        
        messages = [
            {
                "role": "system",
                "content": """You're helping someone start a conversation on a blind dating app.
                Generate a casual, friendly conversation starter based on shared interests.
                Keep it short, natural, and NOT cheesy. No pickup lines.
                Return JSON: {"suggestion": "your suggestion", "topic": "the topic it relates to"}"""
            },
            {
                "role": "user",
                "content": f"""
                Shared interests: {list(shared) if shared else 'Not much overlap found'}
                Your interests: {list(user_interests)}
                Their vibe (from personality): {partner_profile.personality}
                """
            }
        ]
        
        response = await self.llm.chat_with_json(messages, temperature=0.8)
        return response.get("suggestion")
    
    async def get_whisper_suggestion(
        self,
        user_profile: Profile,
        partner_profile: Profile,
        recent_messages: List[str],
        compatibility_details: Dict[str, Any]
    ) -> str:
        """Generate a private 'whisper' suggestion to help the conversation."""
        messages = [
            {
                "role": "system",
                "content": """You're a helpful dating coach giving real-time advice during a conversation.
                Based on the chat context, provide a brief, helpful suggestion.
                Be specific and actionable. Keep it to 1-2 sentences.
                
                Types of suggestions:
                - Topic to explore based on shared interests
                - Question to ask to deepen connection
                - Observation about something positive in their messages
                - Gentle nudge if conversation is stalling
                
                Return JSON: {"whisper": "your suggestion", "type": "topic/question/observation/nudge"}"""
            },
            {
                "role": "user",
                "content": f"""
                Recent messages: {recent_messages[-5:] if recent_messages else 'No messages yet'}
                Your interests: {user_profile.interests}
                Their interests: {partner_profile.interests}
                Shared interests discovered: {compatibility_details.get('shared_interests', [])}
                Current compatibility: {compatibility_details.get('current_score', 'Unknown')}
                """
            }
        ]
        
        response = await self.llm.chat_with_json(messages, temperature=0.7)
        return response.get("whisper", "Try asking about something they mentioned!")
    
    async def check_safety(self, content: str) -> Dict[str, Any]:
        """Check message for safety concerns."""
        messages = [
            {
                "role": "system",
                "content": """Analyze this message for safety concerns in a dating context.
                Check for:
                - Personal information sharing (phone, address, full name, social media)
                - Inappropriate content
                - Pressure tactics or manipulation
                - Scam indicators
                
                Return JSON: {
                    "is_safe": true/false,
                    "concerns": ["list of concerns if any"],
                    "should_warn": true/false,
                    "warning_message": "message to show user if needed"
                }"""
            },
            {"role": "user", "content": content}
        ]
        
        return await self.llm.chat_with_json(messages, temperature=0.2)
