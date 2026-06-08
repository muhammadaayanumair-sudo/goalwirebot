from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, BigInteger, Boolean, DateTime, ForeignKey, Text, JSON
from datetime import datetime, timezone
from config import Config


class Base(DeclarativeBase):
    pass


# ── Models ──────────────────────────────────────────────────────────────────

class Guild(Base):
    """Per-server configuration."""
    __tablename__ = "guilds"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)  # Discord guild ID
    alert_channel_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    default_league: Mapped[str] = mapped_column(String(10), default="PL")
    language: Mapped[str] = mapped_column(String(5), default="en")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    alerts: Mapped[list["Alert"]] = relationship(back_populates="guild", cascade="all, delete-orphan")


class User(Base):
    """Discord user linked to FPL team."""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)  # Discord user ID
    fpl_team_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    favourite_team: Mapped[str | None] = mapped_column(String(100), nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), default="UTC")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class Alert(Base):
    """Goal / match-start alert rule per guild."""
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    guild_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("guilds.id"))
    channel_id: Mapped[int] = mapped_column(BigInteger)
    team: Mapped[str] = mapped_column(String(100))
    alert_type: Mapped[str] = mapped_column(String(30))  # "goal" | "kickoff" | "fulltime"
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    guild: Mapped["Guild"] = relationship(back_populates="alerts")


class MatchCache(Base):
    """Cached match state to detect goal changes."""
    __tablename__ = "match_cache"

    match_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


# ── Engine & Session ─────────────────────────────────────────────────────────

engine = create_async_engine(Config.DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:
    async with SessionLocal() as session:
        yield session
