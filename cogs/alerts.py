import discord
from discord.ext import commands, tasks
from discord import app_commands
from services.football_api import FootballAPI
from embeds.embeds import build_alert_embed
from models.database import SessionLocal, Alert, Guild, MatchCache
from sqlalchemy import select
import json
import logging

log = logging.getLogger("alerts")


class AlertsCog(commands.Cog, name="Alerts"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.api = FootballAPI()
        self.poll_live.start()

    def cog_unload(self):
        self.poll_live.cancel()

    # ── Background task: poll live matches every 60s ──────────────────────

    @tasks.loop(seconds=60)
    async def poll_live(self):
        try:
            matches = await self.api.get_live_matches()
            for match in matches:
                await self._process_match(match)
        except Exception as e:
            log.error(f"Poll error: {e}")

    @poll_live.before_loop
    async def before_poll(self):
        await self.bot.wait_until_ready()

    async def _process_match(self, match: dict):
        match_id = str(match.get("id"))
        home = match.get("homeTeam", {}).get("name", "")
        away = match.get("awayTeam", {}).get("name", "")
        status = match.get("status")
        score = match.get("score", {}).get("fullTime", {})

        async with SessionLocal() as session:
            # Load previous cached state
            result = await session.execute(select(MatchCache).where(MatchCache.match_id == match_id))
            cached = result.scalar_one_or_none()
            prev = cached.data if cached else {}

            prev_home = prev.get("home_goals", -1)
            prev_away = prev.get("away_goals", -1)
            prev_status = prev.get("status", "")

            cur_home = score.get("home", 0) or 0
            cur_away = score.get("away", 0) or 0

            events = []

            # Detect kickoff
            if prev_status != "IN_PLAY" and status == "IN_PLAY":
                events.append("kickoff")

            # Detect goal
            if cur_home > prev_home or cur_away > prev_away:
                events.append("goal")

            # Detect half time
            if prev_status == "IN_PLAY" and status == "PAUSED":
                events.append("halftime")

            # Detect full time
            if status == "FINISHED" and prev_status not in ("FINISHED",):
                events.append("fulltime")

            # Update cache
            new_data = {"home_goals": cur_home, "away_goals": cur_away, "status": status}
            if cached:
                cached.data = new_data
            else:
                session.add(MatchCache(match_id=match_id, data=new_data))
            await session.commit()

            if not events:
                return

            # Find alert rules that match either team
            alerts_q = await session.execute(
                select(Alert).where(Alert.active == True)
            )
            alerts = alerts_q.scalars().all()

            for alert in alerts:
                team_lower = alert.team.lower()
                if team_lower not in home.lower() and team_lower not in away.lower():
                    continue
                if alert.alert_type not in events and alert.alert_type != "all":
                    continue

                channel = self.bot.get_channel(alert.channel_id)
                if not channel:
                    continue

                for event in events:
                    if alert.alert_type in (event, "all"):
                        embed = build_alert_embed(match, event)
                        try:
                            await channel.send(embed=embed)
                        except discord.Forbidden:
                            log.warning(f"No permission to send to channel {alert.channel_id}")

    # ── /alert add ────────────────────────────────────────────────────────

    alert_group = app_commands.Group(name="alert", description="Manage match alerts")

    @alert_group.command(name="add", description="Add a goal/kickoff/fulltime alert for a team")
    @app_commands.describe(
        team="Team name to watch (e.g. Arsenal)",
        alert_type="What to alert on",
        channel="Channel to post alerts in (defaults to current)"
    )
    @app_commands.choices(alert_type=[
        app_commands.Choice(name="Goal scored", value="goal"),
        app_commands.Choice(name="Kick off", value="kickoff"),
        app_commands.Choice(name="Half time", value="halftime"),
        app_commands.Choice(name="Full time", value="fulltime"),
        app_commands.Choice(name="All events", value="all"),
    ])
    @app_commands.checks.has_permissions(manage_guild=True)
    async def alert_add(
        self,
        interaction: discord.Interaction,
        team: str,
        alert_type: app_commands.Choice[str],
        channel: discord.TextChannel = None,
    ):
        await interaction.response.defer(ephemeral=True)
        ch = channel or interaction.channel

        async with SessionLocal() as session:
            # Ensure guild exists
            result = await session.execute(select(Guild).where(Guild.id == interaction.guild_id))
            guild = result.scalar_one_or_none()
            if not guild:
                session.add(Guild(id=interaction.guild_id))
                await session.flush()

            session.add(Alert(
                guild_id=interaction.guild_id,
                channel_id=ch.id,
                team=team,
                alert_type=alert_type.value,
            ))
            await session.commit()

        await interaction.followup.send(
            f"✅ Alert set! I'll post **{alert_type.name}** alerts for **{team}** in {ch.mention}.",
            ephemeral=True
        )

    # ── /alert list ───────────────────────────────────────────────────────

    @alert_group.command(name="list", description="List all active alerts for this server")
    @app_commands.checks.has_permissions(manage_guild=True)
    async def alert_list(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        async with SessionLocal() as session:
            result = await session.execute(
                select(Alert).where(Alert.guild_id == interaction.guild_id, Alert.active == True)
            )
            alerts = result.scalars().all()

        if not alerts:
            return await interaction.followup.send("No active alerts. Use `/alert add` to create one.", ephemeral=True)

        embed = discord.Embed(title="📋 Active Alerts", color=discord.Color.blue())
        rows = []
        for a in alerts:
            ch = f"<#{a.channel_id}>"
            rows.append(f"`#{a.id}` **{a.team}** — {a.alert_type} → {ch}")
        embed.description = "\n".join(rows)
        embed.set_footer(text="Use /alert remove <id> to delete one")
        await interaction.followup.send(embed=embed, ephemeral=True)

    # ── /alert remove ─────────────────────────────────────────────────────

    @alert_group.command(name="remove", description="Remove an alert by its ID")
    @app_commands.describe(alert_id="Alert ID from /alert list")
    @app_commands.checks.has_permissions(manage_guild=True)
    async def alert_remove(self, interaction: discord.Interaction, alert_id: int):
        await interaction.response.defer(ephemeral=True)
        async with SessionLocal() as session:
            result = await session.execute(
                select(Alert).where(Alert.id == alert_id, Alert.guild_id == interaction.guild_id)
            )
            alert = result.scalar_one_or_none()
            if not alert:
                return await interaction.followup.send("❌ Alert not found.", ephemeral=True)
            alert.active = False
            await session.commit()

        await interaction.followup.send(f"✅ Alert `#{alert_id}` removed.", ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(AlertsCog(bot))
