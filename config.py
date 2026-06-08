import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Discord
    DISCORD_TOKEN: str = os.environ["DISCORD_TOKEN"]
    GUILD_ID: int = int(os.getenv("GUILD_ID", 0))

    # Football APIs
    FOOTBALL_DATA_API_KEY: str = os.environ["FOOTBALL_DATA_API_KEY"]
    API_FOOTBALL_KEY: str = os.getenv("API_FOOTBALL_KEY", "")

    # AI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")

    # Database (Railway provides DATABASE_URL automatically)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite+aiosqlite:///./football_bot.db"
    )
    # Railway uses postgres://, SQLAlchemy needs postgresql+asyncpg://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)

    # Redis (optional, falls back to in-memory cache)
    REDIS_URL: str = os.getenv("REDIS_URL", "")

    # Bot settings
    DEFAULT_LEAGUE: str = os.getenv("DEFAULT_LEAGUE", "PL")   # Premier League
    CACHE_TTL: int = int(os.getenv("CACHE_TTL", 60))           # seconds
    ALERT_POLL_INTERVAL: int = int(os.getenv("ALERT_POLL_INTERVAL", 60))

    # Supported league codes (football-data.org)
    LEAGUES = {
        "PL":  "Premier League",
        "BL1": "Bundesliga",
        "SA":  "Serie A",
        "PD":  "La Liga",
        "FL1": "Ligue 1",
        "CL":  "Champions League",
        "EL":  "Europa League",
    }
