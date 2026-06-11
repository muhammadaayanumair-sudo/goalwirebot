"""
config.py — Centralised configuration for Goalwire.
All environment variables are read here; nothing else imports os.environ directly.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ─── Discord ──────────────────────────────────────────────────────────────────
DISCORD_BOT_TOKEN   = os.getenv("DISCORD_BOT_TOKEN", "")
DISCORD_GUILD_ID    = int(os.getenv("DISCORD_GUILD_ID", 0) or 0)

# ─── Football API ─────────────────────────────────────────────────────────────
FOOTBALL_API_KEY    = os.getenv("FOOTBALL_API_KEY", "")
FOOTBALL_API_HOST   = os.getenv("FOOTBALL_API_HOST", "v3.football.api-sports.io")
FOOTBALL_API_BASE   = f"https://{FOOTBALL_API_HOST}"

# ─── Channels ─────────────────────────────────────────────────────────────────
def _ch(name: str) -> int | None:
    v = os.getenv(name, "")
    return int(v) if v.strip() else None

LIVE_SCORES_CHANNEL_ID   = _ch("LIVE_SCORES_CHANNEL_ID")
FIXTURES_CHANNEL_ID      = _ch("FIXTURES_CHANNEL_ID")
NEWS_CHANNEL_ID          = _ch("NEWS_CHANNEL_ID")
TRANSFERS_CHANNEL_ID     = _ch("TRANSFERS_CHANNEL_ID")
STANDINGS_CHANNEL_ID     = _ch("STANDINGS_CHANNEL_ID")
RESULTS_CHANNEL_ID       = _ch("RESULTS_CHANNEL_ID")
REMINDERS_CHANNEL_ID     = _ch("REMINDERS_CHANNEL_ID")
TOURNAMENT_CATEGORY_ID   = _ch("TOURNAMENT_CATEGORY_ID")

# ─── Database ─────────────────────────────────────────────────────────────────
DB_PATH = os.getenv("DB_PATH", "goalwire.db")

# ─── Bot Settings ─────────────────────────────────────────────────────────────
BOT_PREFIX              = os.getenv("BOT_PREFIX", "!")
LOG_LEVEL               = os.getenv("LOG_LEVEL", "INFO")
LIVE_UPDATE_INTERVAL    = int(os.getenv("LIVE_UPDATE_INTERVAL", 60))
FIXTURE_LOOKAHEAD_DAYS  = int(os.getenv("FIXTURE_LOOKAHEAD_DAYS", 7))
NEWS_POLL_INTERVAL      = int(os.getenv("NEWS_POLL_INTERVAL", 300))
REMINDER_CHECK_INTERVAL = int(os.getenv("REMINDER_CHECK_INTERVAL", 60))
DEFAULT_TIMEZONE        = os.getenv("DEFAULT_TIMEZONE", "UTC")

# ─── Competition Map ──────────────────────────────────────────────────────────
# competition name → API-Football league ID
COMPETITION_IDS: dict[str, int] = {
    "FIFA World Cup":             1,
    "UEFA Champions League":      2,
    "UEFA Europa League":         3,
    "Nations League":             5,
    "Copa America":               9,
    "FIFA Club World Cup":       15,
    "Premier League":            39,
    "UEFA Conference League":   848,
    "La Liga":                  140,
    "Bundesliga":                78,
    "Serie A":                  135,
    "Ligue 1":                   61,
    "UEFA Euro":                960,
}

# Competitions that always get live tracking
HIGH_PRIORITY_COMPETITIONS = [
    "FIFA World Cup",
    "UEFA Champions League",
    "UEFA Europa League",
    "UEFA Conference League",
    "Premier League",
    "UEFA Euro",
    "Copa America",
    "FIFA Club World Cup",
]

# ─── Reminder Offsets (minutes before kickoff) ────────────────────────────────
REMINDER_OFFSETS_MINUTES = [1440, 720, 360, 60, 30, 10, 0]
# labels matching each offset
REMINDER_LABELS = {
    1440: "24 Hours",
    720:  "12 Hours",
    360:  "6 Hours",
    60:   "1 Hour",
    30:   "30 Minutes",
    10:   "10 Minutes",
    0:    "Match Started",
}

# ─── Embed Colours ────────────────────────────────────────────────────────────
class Colours:
    GREEN      = 0x00B140   # fixtures / general
    RED        = 0xFF0000   # live / urgent
    GOLD       = 0xFFD700   # top scorers / awards
    BLUE       = 0x5865F2   # standings / info
    ORANGE     = 0xFF6B00   # countdown / reminder
    PURPLE     = 0x9B59B6   # tournament mode
    DARK_GREY  = 0x2F3136   # neutral embeds
    WHITE      = 0xFFFFFF
    CYAN       = 0x00CED1   # transfers
    TEAL       = 0x1ABC9C   # results / completed

# ─── Validation ───────────────────────────────────────────────────────────────
def validate() -> list[str]:
    """Return a list of missing critical config keys."""
    missing = []
    if not DISCORD_BOT_TOKEN:
        missing.append("DISCORD_BOT_TOKEN")
    if not FOOTBALL_API_KEY:
        missing.append("FOOTBALL_API_KEY")
    return missing
