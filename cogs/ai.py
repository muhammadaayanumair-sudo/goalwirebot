import discord
from discord.ext import commands
from discord import app_commands
from services.ai_service import AIService
from services.football_api import FootballAPI
from config import Config

LEAGUE_CHOICES = [
    app_commands.Choice(name=v, value=k)
    for k, v in Config.LEAGUES.items()
]


class AICog(commands.Cog, name="AI"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.ai = AIService()
        self.football = FootballAPI()

    # ── /preview ──────────────────────────────────────────────────────────

    @app_commands.command(name="preview", description="AI-generated pre-match preview for a match")
    @app_commands.describe(match_id="Match ID (from /livescore or /fixtures)")
    async def preview(self, interaction: discord.Interaction, match_id: int):
        await interaction.response.defer()
        match = await self.football.get_match(match_id)
        if not match:
            return await interaction.followup.send("❌ Match not found.")

        home = match.get("homeTeam", {}).get("name", "Home")
        away = match.get("awayTeam", {}).get("name", "Away")
        h2h_data = await self.football.get_head_to_head(match_id)
        h2h_matches = h2h_data.get("matches", []) if h2h_data else []

        await interaction.followup.send(f"🤖 Generating preview for **{home} vs {away}**...")
        preview_text = await self.ai.match_preview(home, away, h2h_matches)

        embed = discord.Embed(
            title=f"📋 Match Preview: {home} vs {away}",
            description=preview_text,
            color=discord.Color.blue(),
        )
        embed.set_footer(text="Powered by GoalWire AI • Not financial/betting advice")
        await interaction.channel.send(embed=embed)

    # ── /predict ──────────────────────────────────────────────────────────

    @app_commands.command(name="predict", description="AI score prediction for a match")
    @app_commands.describe(home="Home team name", away="Away team name")
    async def predict(self, interaction: discord.Interaction, home: str, away: str):
        await interaction.response.defer()
        await interaction.followup.send(f"🤖 Analysing **{home} vs {away}**...")
        prediction = await self.ai.predict_match(home, away)

        embed = discord.Embed(
            title=f"🎯 Prediction: {home} vs {away}",
            description=prediction,
            color=discord.Color.purple(),
        )
        embed.set_footer(text="Powered by GoalWire AI • For entertainment only")
        await interaction.channel.send(embed=embed)

    # ── /summarize ────────────────────────────────────────────────────────

    @app_commands.command(name="summarize", description="AI match report for a finished match")
    @app_commands.describe(match_id="Match ID of a finished match")
    async def summarize(self, interaction: discord.Interaction, match_id: int):
        await interaction.response.defer()
        match = await self.football.get_match(match_id)
        if not match:
            return await interaction.followup.send("❌ Match not found.")
        if match.get("status") != "FINISHED":
            return await interaction.followup.send("⚠️ Match hasn't finished yet.")

        home = match.get("homeTeam", {}).get("name", "Home")
        away = match.get("awayTeam", {}).get("name", "Away")
        summary = await self.ai.summarize_match(match)

        embed = discord.Embed(
            title=f"📰 Match Report",
            description=summary,
            color=discord.Color.green(),
        )
        score = match.get("score", {}).get("fullTime", {})
        embed.set_author(name=f"{home} {score.get('home')}-{score.get('away')} {away}")
        embed.set_footer(text="Powered by GoalWire AI")
        await interaction.followup.send(embed=embed)

    # ── /scout ────────────────────────────────────────────────────────────

    @app_commands.command(name="scout", description="AI scout report for a player")
    @app_commands.describe(player="Player name")
    async def scout(self, interaction: discord.Interaction, player: str):
        await interaction.response.defer()
        insight = await self.ai.player_insight(player, "Based on current season form")

        embed = discord.Embed(
            title=f"🔭 Scout Report: {player}",
            description=insight,
            color=discord.Color.orange(),
        )
        embed.set_footer(text="Powered by GoalWire AI")
        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(AICog(bot))
