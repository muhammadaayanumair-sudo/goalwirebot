"""
events/discord_events.py — Creates and manages Discord Scheduled Events
for upcoming football fixtures.
"""

from __future__ import annotations
import logging
from datetime import datetime, timezone, timedelta

import discord
from database import Database
from services.football_api import FootballAPI
from utils.helpers import competition_emoji, match_importance
from utils.time_utils import parse_kickoff, match_end_estimate
from config import COMPETITION_IDS, HIGH_PRIORITY_COMPETITIONS

log = logging.getLogger("goalwire.discord_events")


def _build_description(fix: dict) -> str:
    f      = fix["fixture"]
    league = fix["league"]
    teams  = fix["teams"]
    venue  = f.get("venue", {})
    dt     = parse_kickoff(f["date"])
    home   = teams["home"]["name"]
    away   = teams["away"]["name"]
    comp   = league["name"]
    rnd    = league.get("round", "")
    emoji  = competition_emoji(comp)
    importance = match_importance(comp, rnd)

    lines = [
        f"{emoji} Competition: {comp}",
        f"🏠 Home Team: {home}  ✈️ Away Team: {away}",
        f"📅 Date: {dt.strftime('%A, %d %B %Y')}",
        f"🕒 Kickoff Time: {dt.strftime('%I:%M %p UTC')}",
        f"🏟 Stadium: {venue.get('name', 'TBD')} — {venue.get('city', '')}",
        "",
        importance,
        "",
        "Don't miss this massive football clash! ⚽🔥",
        "",
        "Powered by Goalwire • Football OS for Discord",
    ]
    return "\n".join(lines)[:1000]


class DiscordEventManager:
    def __init__(self, bot: discord.Client) -> None:
        self.bot = bot

    # ── Create a single event ─────────────────────────────────────────────────
    async def create_event(self, guild: discord.Guild, fix: dict) -> discord.ScheduledEvent | None:
        f       = fix["fixture"]
        league  = fix["league"]
        teams   = fix["teams"]
        fixture_id = f["id"]

        if await Database.event_exists(fixture_id, guild.id):
            log.debug("Event already exists for fixture %s in guild %s", fixture_id, guild.id)
            return None

        home = teams["home"]["name"]
        away = teams["away"]["name"]
        comp = league["name"]
        emoji = competition_emoji(comp)

        title = f"⚽ {home} vs {away} | {comp}"
        if len(title) > 100:
            title = title[:97] + "…"

        kickoff  = parse_kickoff(f["date"])
        end_time = match_end_estimate(kickoff)
        venue    = f.get("venue", {}).get("name", "TBD")
        desc     = _build_description(fix)

        try:
            event = await guild.create_scheduled_event(
                name=title,
                description=desc,
                start_time=kickoff,
                end_time=end_time,
                entity_type=discord.EntityType.external,
                privacy_level=discord.PrivacyLevel.guild_only,
                location=venue[:100],
            )
            await Database.save_discord_event(fixture_id, str(event.id), guild.id)
            log.info("Created Discord event: %s (fixture %s)", title, fixture_id)
            return event
        except discord.Forbidden:
            log.error("Missing permissions to create events in guild %s", guild.id)
        except discord.HTTPException as exc:
            log.error("HTTPException creating event for fixture %s: %s", fixture_id, exc)
        return None

    # ── Bulk create for all high-priority competitions ─────────────────────────
    async def sync_upcoming_events(self, guild: discord.Guild,
                                    days: int = 7) -> int:
        created = 0
        for comp in HIGH_PRIORITY_COMPETITIONS:
            lid = COMPETITION_IDS.get(comp)
            if not lid:
                continue
            fixtures = await FootballAPI.get_fixtures(lid, days_ahead=days)
            for fix in fixtures:
                ev = await self.create_event(guild, fix)
                if ev:
                    created += 1
        return created

    # ── Update event (e.g., venue change) ────────────────────────────────────
    async def update_event_if_needed(self, guild: discord.Guild,
                                      fix: dict) -> None:
        # For future extension — e.g. update venue, postponed match
        pass

    # ── Start event at kickoff ─────────────────────────────────────────────────
    async def start_event(self, guild: discord.Guild, fixture_id: int) -> None:
        """Mark the corresponding Discord event as started."""
        from database import Database as DB
        cur = await DB.conn().execute(
            "SELECT event_id FROM discord_events WHERE fixture_id=? AND guild_id=?",
            (fixture_id, guild.id)
        )
        row = await cur.fetchone()
        if not row:
            return
        try:
            event = await guild.fetch_scheduled_event(int(row["event_id"]))
            await event.start()
        except Exception as exc:
            log.debug("Could not start event for fixture %s: %s", fixture_id, exc)
