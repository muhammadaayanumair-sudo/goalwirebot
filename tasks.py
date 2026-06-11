"""

import asyncio
import logging
import discord
from discord.ext import tasks, commands
from datetime import datetime, timezone, timedelta

import config
from config import Colours, COMPETITION_IDS
from database import Database
from services.football_api import FootballAPI

log = logging.getLogger("goalwire.tasks")

class GoalwireTasks(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        # Start our async loop iterations on startup
        self.live_telemetry_loop.start()
        self.transfer_news_loop.start()
        self.kickoff_reminder_loop.start()

    def cog_unload(self):
        self.live_telemetry_loop.cancel()
        self.transfer_news_loop.cancel()
        self.kickoff_reminder_loop.cancel()

    # ─── 1. LIVE TELEMETRY LOOP (Runs every 60 seconds) ──────────────────────
    @tasks.loop(seconds=60)
    async def live_telemetry_loop(self):
        """Scans active fixtures for live timeline events and updates match embeds."""
        try:
            live_fixtures = await FootballAPI.get_all_live_fixtures()
            if not live_fixtures:
                return

            for fix in live_fixtures:
                fixture_id = fix["fixture"]["id"]
                home_team = fix["teams"]["home"]["name"]
                away_team = fix["teams"]["away"]["name"]
                hg = fix["goals"].get("home", 0) or 0
                ag = fix["goals"].get("away", 0) or 0
                elapsed = fix["fixture"]["status"].get("elapsed", 0) or 0

                # Check if this match has an active tracking message registered in our database
                db_record = await Database.get_live_message(fixture_id)
                if not db_record:
                    continue

                channel = self.bot.get_channel(db_record["channel_id"])
                if not channel:
                    continue

                try:
                    message = await channel.fetch_message(db_record["message_id"])
                except discord.NotFound:
                    await Database.delete_live_message(fixture_id)
                    continue

                # Fetch deep timeline events (Goals, Cards, VAR) from API
                events_data = await FootballAPI._get("fixtures/events", {"fixture": fixture_id})
                events = events_data.get("response", []) if events_data else []

                # Parse and log new events to the database
                timeline_lines = []
                for ev in events[-5:]:  # Show the 5 most recent timeline events
                    time_p = ev["time"]["elapsed"]
                    extra = ev["time"]["extra"]
                    display_time = f"{time_p}+{extra}" if extra else f"{time_p}"
                    
                    p_name = ev["player"]["name"] or "Unknown Player"
                    team_name = ev["team"]["name"]
                    ev_type = ev["type"]
                    detail = ev["detail"]

                    # Format event strings visually
                    icon = "⚽" if ev_type == "Goal" else "🟨" if detail == "Yellow Card" else "🟥" if detail == "Red Card" else "🔄"
                    timeline_lines.append(f"`{display_time}'` {icon} **{p_name}** ({team_name}) — *{detail}*")

                    # Persist event logs to database to prevent duplicated entries
                    await Database.log_match_event(fixture_id, ev_type, time_p, team_name, p_name, detail)

                # Construct updated live match layout
                embed = discord.Embed(
                    title=f"🔴 Live Match Tracker: {home_team} vs {away_team}",
                    color=Colours.RED,
                    timestamp=datetime.now(timezone.utc)
                )
                embed.add_field(name="📊 Live Scoreline", value=f"🏟️ **{home_team}** `{hg} - {ag}` **{away_team}**", inline=False)
                embed.add_field(name="⏱️ Match Progress", value=f"Game Minute: `{elapsed}'`", inline=True)
                
                if timeline_lines:
                    embed.add_field(name="📋 Recent Match Timeline Events", value="\n".join(timeline_lines), inline=False)
                else:
                    embed.add_field(name="📋 Recent Match Timeline Events", value="*Tactical battle ongoing. No major events recorded yet.*", inline=False)

                embed.set_footer(text="Goalwire Live Match Sync Loop Engine")
                await message.edit(embed=embed)

        except Exception as e:
            log.error("Error running live match telemetry sync task loop: %s", e)

    @live_telemetry_loop.before_loop
    async def before_live_loop(self):
        await self.bot.wait_until_ready()
# ─── 2. TRANSFER BREAKING NEWS TASK (Runs every 10 minutes) ─────────────
    @tasks.loop(minutes=10)
    async def transfer_news_loop(self):
        """Pulls recent global player transfers and alerts configured server channels."""
        try:
            today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            # Fetch global market actions via API
            data = await FootballAPI._get("transfers", {"date": today_str})
            transfers = data.get("response", []) if data else []

            if not transfers:
                return

            # Process top 5 arrivals
            for trans in transfers[:5]:
                player_name = trans["player"]["name"]
                for move in trans["transfers"][:1]:
                    transfer_date = move["date"]
                    m_type = move["type"] or "Permanent Deal"
                    teams = move["teams"]
                    # Add your logic here to send the Discord embed
                    
        except Exception as e:
            log.error("Error in transfer_news_loop: %s", e)
