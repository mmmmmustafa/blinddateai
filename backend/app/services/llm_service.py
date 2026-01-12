from typing import List, Dict, Any, Optional
import json
from openai import AsyncOpenAI

from app.config import get_settings

settings = get_settings()


class LLMService:
    """Service for interacting with OpenAI LLM."""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = "gpt-4-turbo-preview"
        self.embedding_model = "text-embedding-3-small"
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1000,
        json_mode: bool = False
    ) -> str:
        """Send chat completion request."""
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"} if json_mode else {"type": "text"}
        )
        return response.choices[0].message.content
    
    async def chat_with_json(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> Dict[str, Any]:
        """Send chat completion and parse JSON response."""
        response = await self.chat(messages, temperature, max_tokens, json_mode=True)
        return json.loads(response)
    
    async def get_embedding(self, text: str) -> List[float]:
        """Get embedding vector for text."""
        response = await self.client.embeddings.create(
            model=self.embedding_model,
            input=text
        )
        return response.data[0].embedding
    
    async def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment and emotional tone of text."""
        messages = [
            {
                "role": "system",
                "content": """Analyze the sentiment and emotional tone of the message. 
                Return JSON with: sentiment (positive/negative/neutral), 
                emotions (list), engagement_level (1-10), humor_detected (bool)."""
            },
            {"role": "user", "content": text}
        ]
        return await self.chat_with_json(messages, temperature=0.3)
