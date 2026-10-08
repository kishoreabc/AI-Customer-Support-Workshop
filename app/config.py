import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

class Settings:
    PORT: int = int(os.getenv("PORT", "3000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-jwt-secret-workshop-2026-secure")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_DAYS: int = 7
    
    # OpenAI Settings
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "your-openai-api-key")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # Database Settings
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", str(Path(__file__).resolve().parent / "data" / "telecom.sqlite"))

settings = Settings()
