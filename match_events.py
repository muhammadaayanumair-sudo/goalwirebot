"""
events/match_events.py — Processes raw API match event payloads and determines
whether a significant event occurred (goal, red card, penalty, etc.) so the
live cog can decide to push an instant update.
"""

from __future__ import annotations
import logging
from database import Database

log = logging.getLogger("goalwire.match_events")


# ── Event significance scoring ────────────────────────────────────────────────
_SIGNIFICANCE: dict[str, int] = {
    "Goal":           10,
    "Own Goal":        9,
    "Penalty":        10,
    "Missed Penalty":  8,
    "Red Card":        9,
    "Yellow Card":     3,
    "Second Yellow":   9,
    "Subst":           2,
    "Var":             7,
}


class MatchEventProcessor:
    """
    Maintains a snapshot of previous match events per fixture and exposes
    helpers to detect new, significant events since last poll.
    """

    def __init__(self) -> None:
        # fixture_id → list[str] of seen event fingerprints
        self._seen: dict[int, set[str]] = {}

    @staticmethod
    def _fingerprint(event: dict) -> str:
        """Deterministic string key for a match event."""
        t  = event.get("time", {}).get("elapsed", 0)
        et = event.get("type", "")
        p  = event.get("player", {}).get("name", "")
        tm = event.get("team", {}).get("id", 0)
        return f"{t}:{et}:{p}:{tm}"

    @staticmethod
    def _significance(event: dict) -> int:
        etype  = event.get("type", "")
        detail = event.get("detail", "")
        if etype == "Card" and "Red" in detail:
            return _SIGNIFICANCE.get("Red Card", 5)
        if etype == "Card" and "Yellow" in detail and "Second" in detail:
            return _SIGNIFICANCE.get("Second Yellow", 5)
        return _SIGNIFICANCE.get(etype, 2)

    def new_events(self, fixture_id: int, events: list[dict]) -> list[dict]:
        """
        Return only the events that are new since the last call for this fixture.
        Also persist them to the database.
        """
        seen = self._seen.setdefault(fixture_id, set())
        new  = []
        for ev in events:
            fp = self._fingerprint(ev)
            if fp not in seen:
                seen.add(fp)
                new.append(ev)
        return new

    def has_high_priority_event(self, new_events: list[dict]) -> bool:
        """Return True if any new event is important enough for an instant post."""
        return any(self._significance(ev) >= 7 for ev in new_events)

    @staticmethod
    def format_event_line(ev: dict) -> str:
        """Format a single match event into one readable line."""
        t      = ev.get("time", {}).get("elapsed", "?")
        etype  = ev.get("type", "")
        detail = ev.get("detail", "")
        team   = ev.get("team", {}).get("name", "")
        player = ev.get("player", {}).get("name", "?")
        assist = ev.get("assist", {}).get("name")

        icons = {
            "Goal":   "⚽",
            "Card":   "🟥" if "Red" in detail else "🟨",
            "Subst":  "🔄",
            "Var":    "📺",
        }
        icon = icons.get(etype, "📌")
        line = f"`{t}'` {icon} **{player}** ({team})"
        if etype == "Goal" and assist:
            line += f" _(Assist: {assist})_"
        if etype == "Subst":
            sub_in = ev.get("assist", {}).get("name", "?")
            line += f" → {sub_in}"
        return line

    @staticmethod
    async def log_to_db(fixture_id: int, events: list[dict]) -> None:
        for ev in events:
            await Database.log_match_event(
                fixture_id=fixture_id,
                event_type=ev.get("type", ""),
                minute=ev.get("time", {}).get("elapsed"),
                team=ev.get("team", {}).get("name", ""),
                player=ev.get("player", {}).get("name", ""),
                detail=ev.get("detail", ""),
            )

    def clear_fixture(self, fixture_id: int) -> None:
        """Remove a finished fixture from memory."""
        self._seen.pop(fixture_id, None)
