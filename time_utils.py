"""utils/time_utils.py — Date / time helpers for Goalwire."""

from datetime import datetime, timezone, timedelta
import pytz


def parse_kickoff(date_str: str) -> datetime:
    """Parse ISO-8601 kickoff string → aware UTC datetime."""
    date_str = date_str.replace("Z", "+00:00")
    return datetime.fromisoformat(date_str).astimezone(timezone.utc)


def to_discord_ts(dt: datetime, style: str = "F") -> str:
    """
    Return a Discord dynamic timestamp token.
    Styles: F=full, R=relative, T=time, D=date, f=short full, t=short time, d=short date
    """
    ts = int(dt.timestamp())
    return f"<t:{ts}:{style}>"


def local_time_str(dt: datetime, tz_name: str = "UTC") -> str:
    """Return kickoff formatted in the given IANA timezone."""
    try:
        tz = pytz.timezone(tz_name)
        local = dt.astimezone(tz)
        return local.strftime("%A %d %B %Y — %I:%M %p %Z")
    except Exception:
        return dt.strftime("%A %d %B %Y — %H:%M UTC")


def minutes_until(dt: datetime) -> int:
    """Minutes from now until the given UTC datetime (negative if past)."""
    delta = dt - datetime.now(timezone.utc)
    return int(delta.total_seconds() / 60)


def humanise_duration(minutes: int) -> str:
    """Convert minutes into '2 Days 14 Hours 25 Minutes'."""
    if minutes <= 0:
        return "Kicked off!"
    days  = minutes // 1440
    hours = (minutes % 1440) // 60
    mins  = minutes % 60
    parts = []
    if days:
        parts.append(f"{days} Day{'s' if days != 1 else ''}")
    if hours:
        parts.append(f"{hours} Hour{'s' if hours != 1 else ''}")
    if mins or not parts:
        parts.append(f"{mins} Minute{'s' if mins != 1 else ''}")
    return " ".join(parts)


def match_end_estimate(kickoff: datetime, extra_time: bool = False) -> datetime:
    """Estimate match end (90 min + 15 min HT buffer + optional 30 min ET)."""
    duration = 105 + (30 if extra_time else 0)  # minutes
    return kickoff + timedelta(minutes=duration)
