from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # OpenAI
    openai_api_key: str
    
    # Database
    database_url: str
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    
    # JWT
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days
    
    # Twilio
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""
    
    # App Settings
    compatibility_reveal_threshold: float = 0.80
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
