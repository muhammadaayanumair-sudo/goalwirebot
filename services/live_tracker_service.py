"""
services/live_tracker_service.py — Background automation loop for Goalwire.
Continuously polls active live fixtures, detects goals/cards via MatchEventProcessor,
and deploys interactive Match Hub views into your live score channel.
"""

from __future__ import annotations
import asyncio
import logging
from datetime import datetime, timezone

import discord
from config import LIVE_SCORES_CHANNEL_ID, HIGH_PRIORITY_COMPETITIONS, COMPETITION_IDS
from services.football_api import FootballAPI
from events.match_events import MatchEventProcessor
from utils.embeds import EmbedBuilder, MatchHubView

log = logging.getLogger("goalwire.live_tracker")

class LiveTrackerService:
    def __init__(self, bot: discord.Client) -> None:
        self.bot = bot
        self.processor = MatchEventProcessor()
        self._running = False
        self._task: asyncio.Task | None = None
        # How frequently the loop checks live games (e.g., every 60 seconds)
        self.poll_interval = 60 

    async def start(self) -> None:
        """Spins up the asynchronous background live match poller."""
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._loop())
            log.info("🚀 Live Tracker Service successfully initialized.")

    async def stop(self) -> None:
        """Gracefully halts the live match poller."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        log.info("🛑 Live Tracker Service has been suspended.")

    async def _loop(self) -> None:
        while self._running:
            try:
                await self.poll_live_matches()
            except Exception as exc:
                log.error("Error encountered inside live tracker runtime: %s", exc, exc_info=True)
            
            await asyncio.sleep(self.poll_interval)

    async def poll_live_matches(self) -> None:
        """Queries the football API layer for active fixtures and posts live updates."""
        channel_id = LIVE_SCORES_CHANNEL_ID
        if not channel_id:
            return
        
        channel = self.bot.get_channel(channel_id)
        if not channel:
            return

        # Scan active premium tournaments configured in config.py
        for comp_name in HIGH_PRIORITY_COMPETITIONS:
            league_id = COMPETITION_IDS.get(comp_name)
            if not league_id:
                continue

            # Request real-time ongoing matches from your API wrapper
            live_fixtures = await FootballAPI.get_live_fixtures(league_id)
            if not live_fixtures:
                continue

            for fix in live_fixtures:
                fixture_id = fix["fixture"]["id"]
                raw_events = fix.get("events", [])

                # Use your processor to isolate brand new match events
                new_events = self.processor.new_events(fixture_id, raw_events)
                if not new_events:
                    continue

                # Immediately store new events into the data layer persistence tables
                await self.processor.log_to_db(fixture_id, new_events)

                # Check if any high-priority events just took place (Goals, Red Cards, VAR)
                if self.processor.has_high_priority_event(new_events):
                    
                    # Filter events to ensure we only trigger channel alerts for major actions
                    significant_events = [
                        ev for ev in new_events 
                        if self.processor._significance(ev) >= 7
                    ]
                    
                    if not significant_events:
                        continue

                    # Render the beautiful live score card embed using your existing logic
                    embed = EmbedBuilder.live_score(fix, events=raw_events)
                    
                    # Attach the sleek interactive toggle menus we just built!
                    view = MatchHubView(fixture_id=fixture_id, match_data=fix)

                    # Post instantly to your live updates feed!
                    try:
                        await channel.send(embed=embed, view=view)
                        log.info("Sent instant goal/match alert for fixture %s", fixture_id)
                    except discord.DiscordException as exc:
                        log.error("Failed to post live update message: %s", exc)
