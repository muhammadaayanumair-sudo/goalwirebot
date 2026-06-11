"""utils/helpers.py — Miscellaneous helper functions."""

from config import COMPETITION_IDS


def ordinal(n: int) -> str:
    """Return ordinal string for integer: 1 → '1st', 2 → '2nd', …"""
    if 11 <= (n % 100) <= 13:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suffix}"


def flag_emoji(country: str) -> str:
    """Best-effort country → flag emoji mapping."""
    mapping = {
        "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
        "France":  "🇫🇷",
        "Germany": "🇩🇪",
        "Spain":   "🇪🇸",
        "Italy":   "🇮🇹",
        "Portugal": "🇵🇹",
        "Netherlands": "🇳🇱",
        "Belgium": "🇧🇪",
        "Brazil":  "🇧🇷",
        "Argentina": "🇦🇷",
        "United States": "🇺🇸",
        "World":   "🌍",
        "Europe":  "🇪🇺",
    }
    return mapping.get(country, "🏳️")


def competition_emoji(competition: str) -> str:
    """Return a representative emoji for each competition."""
    mapping = {
        "FIFA World Cup":          "🌍",
        "UEFA Champions League":   "⭐",
        "UEFA Europa League":      "🟠",
        "UEFA Conference League":  "🟢",
        "Premier League":          "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
        "La Liga":                 "🇪🇸",
        "Bundesliga":              "🇩🇪",
        "Serie A":                 "🇮🇹",
        "Ligue 1":                 "🇫🇷",
        "FIFA Club World Cup":     "🏆",
        "UEFA Euro":               "🇪🇺",
        "Copa America":            "🌎",
        "Nations League":          "🌐",
    }
    return mapping.get(competition, "⚽")


def format_duration(seconds: int) -> str:
    """Format seconds → 'Xm Ys'."""
    m, s = divmod(int(seconds), 60)
    return f"{m}m {s}s" if m else f"{s}s"


def chunk_list(lst: list, size: int) -> list[list]:
    """Split a list into chunks of at most `size`."""
    return [lst[i:i + size] for i in range(0, len(lst), size)]


def safe_int(val, default: int = 0) -> int:
    try:
        return int(val)
    except (TypeError, ValueError):
        return default


def league_id_for(competition: str) -> int | None:
    """Look up API-Football league ID for a competition name."""
    return COMPETITION_IDS.get(competition)


def match_importance(competition: str, round_str: str) -> str:
    """Return a human-friendly importance label."""
    round_lower = (round_str or "").lower()
    if any(x in round_lower for x in ["final", "semi", "quarter"]):
        return "🔥 HIGH IMPORTANCE"
    if competition in ("FIFA World Cup", "UEFA Champions League", "UEFA Euro", "Copa America"):
        return "⭐ MAJOR COMPETITION"
    return "📅 Regular Fixture"
