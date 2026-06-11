"""
services/reminder_service.py — Checks pending reminders every minute
and fires Discord DMs / channel pings when kickoff is approaching.
"""

from __future__ import annotations
import logging
from datetime import datetime, timezone

from database import Database
from services.football_api import FootballAPI
from utils.embeds import EmbedBuilder
from config import REMINDER_LABELS

log = logging.getLogger("goalwire.reminders")


class ReminderService:
    def __init__(self, bot) -> None:
        self.bot = bot

    async def check_and_fire(self) -> None:
        """Called every REMINDER_CHECK_INTERVAL seconds by the scheduler."""
        pending = await Database.get_pending_reminders()
        if not pending:
            return

        now = datetime.now(timezone.utc)

        for row in pending:
            fixture_id    = row["fixture_id"]
            user_id       = row["user_id"]
            guild_id      = row["guild_id"]
            offset_mins   = row["offset_minutes"]
            reminder_id   = row["id"]

            fix = await FootballAPI.get_fixture_by_id(fixture_id)
            if not fix:
                continue

            kickoff_str = fix["fixture"]["date"]
            kickoff_str = kickoff_str.replace("Z", "+00:00")
            kickoff = datetime.fromisoformat(kickoff_str).astimezone(timezone.utc)

            # Window: fire within ±2 minutes of the intended offset
            target = kickoff - __import__("datetime").timedelta(minutes=offset_mins)
            diff   = abs((now - target).total_seconds())

            if diff > 120:   # not yet in window
                continue

            label = REMINDER_LABELS.get(offset_mins, f"{offset_mins}m")
            embed = EmbedBuilder.reminder(fix, label)

            # Try DM first
            try:
                user = await self.bot.fetch_user(user_id)
                if user:
                    await user.send(embed=embed)
                    log.info("Sent DM reminder to %s for fixture %s (%s)",
                             user_id, fixture_id, label)
            except Exception as exc:
                log.debug("DM failed for user %s: %s", user_id, exc)
                # Fallback: post in guild reminders channel if configured
                guild = self.bot.get_guild(guild_id)
                if guild:
                    from config import REMINDERS_CHANNEL_ID
                    ch_id = REMINDERS_CHANNEL_ID
                    if ch_id:
                        ch = guild.get_channel(ch_id)
                        if ch:
                            try:
                                await ch.send(
                                    content=f"<@{user_id}>",
                                    embed=embed
                                )
                            except Exception as exc2:
                                log.error("Channel reminder failed: %s", exc2)

            await Database.mark_reminder_sent(reminder_id)
