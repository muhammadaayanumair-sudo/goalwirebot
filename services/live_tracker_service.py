"""
services/live_tracker_service.py — Background service that continuously loops 
over live fixtures, evaluates significant events, and pushes real-time match alerts.
"""

from __future__ import annotations
import asyncio
import logging
from datetime import datetime, timezone

import discord
from config import LIVE_SCORES_CHANNEL_ID, LIVE_UPDATE_INTERVAL, Colours[cite: 8]
from services.football_api import FootballAPI
from events.match_events import MatchEventProcessor[cite: 4, 9]

log = logging.getLogger("goalwire.live_tracker")

class LiveTrackerService:
    def __init__(self, bot: discord.Client) -> None:
        self.bot = bot
        self.processor = MatchEventProcessor()[cite: 4]
        self._running = False
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        """Starts the background live match polling loop."""
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._loop())
            log.info("Live Tracker Service has been started.")

    async def stop(self) -> None:
        """Stops the background live match polling loop."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        log.info("Live Tracker Service has been stopped.")

    async def _loop(self) -> None:
        while self._running:
            try:
                await self.poll_live_matches()
            except Exception as exc:
                log.error("Error encountered in live tracker loop: %s", exc, exc_info=True)
            
            # Sleep interval controlled safely via config.py[cite: 8]
            await asyncio.sleep(LIVE_UPDATE_INTERVAL)[cite: 8]

    async def poll_live_matches(self) -> None:
        """Fetch active live fixtures and broadcast unexpected event configurations."""
        channel_id = LIVE_SCORES_CHANNEL_ID[cite: 8]
        if not channel_id:
            return
        
        channel = self.bot.get_channel(channel_id)
        if not channel:
            return

        from config import HIGH_PRIORITY_COMPETITIONS, COMPETITION_IDS[cite: 8]
        
        # Loop through your tracked, active high-priority tournaments
        for comp_name in HIGH_PRIORITY_COMPETITIONS:[cite: 8]
            league_id = COMPETITION_IDS.get(comp_name)[cite: 8]
            if not league_id:
                continue

            # Fetch active matches from your API wrapper
            live_fixtures = await FootballAPI.get_live_fixtures(league_id)
            if not live_fixtures:
                continue

            for fix in live_fixtures:
                fixture_id = fix["fixture"]["id"]
                raw_events = fix.get("events", [])

                # Process state updates and catch new event lists[cite: 4]
                new_events = self.processor.new_events(fixture_id, raw_events)[cite: 4]
                if not new_events:
                    continue

                # Immediately store them safely inside your database history layer[cite: 4]
                await self.processor.log_to_db(fixture_id, new_events)[cite: 4]

                # Evaluate priority importance levels (Goals, Cards, VAR)[cite: 4]
                if self.processor.has_high_priority_event(new_events):[cite: 4]
                    home_team = fix["teams"]["home"]["name"]
                    away_team = fix["teams"]["away"]["name"]
                    home_score = fix["goals"]["home"]
                    away_score = fix["goals"]["away"]
                    status_elapsed = fix["fixture"]["status"].get("elapsed", 0)

                    for ev in new_events:
                        # Ensure we only ring channel alerts for tier-1 elements[cite: 4]
                        if self.processor._significance(ev) >= 7:[cite: 4]
                            event_line = self.processor.format_event_line(ev)[cite: 4]

                            # Formulate our real-time alert frame
                            embed = discord.Embed(
                                title=f"🚨 LIVE ALERT: {home_team} {home_score} – {away_score} {away_team}",
                                description=f"{event_line}\n\n⏱️ Match Progress: `{status_elapsed}'`",
                                color=Colours.RED[cite: 8]
                            )
                            embed.set_footer(text=f"Live Tracker • {comp_name}")
                            embed.timestamp = datetime.now(timezone.utc)

                            # Import our interactive buttons from Step 2
                            from utils.embeds import MatchHubView
                            view = MatchHubView(fixture_id=fixture_id, match_data=fix)

                            # Push to Discord instantly!
                            await channel.send(embed=embed, view=view)
