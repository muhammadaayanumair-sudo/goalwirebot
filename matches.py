import discord
from discord.ext import commands
from discord import app_commands
from services.football_api import FootballAPI
from embeds.embeds import build_match_embed, build_scorers_embed, MatchDetailView
from config import Config

LEAGUE_CHOICES = [
    app_commands.Choice(name=v, value=k)
    for k, v in Config.LEAGUES.items()
]


class MatchesCog(commands.Cog, name="Matches"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.api = FootballAPI()

    # ── /livescore ────────────────────────────────────────────────────────

    @app_commands.command(name="livescore", description="Show all live matches right now")
    @app_commands.describe(league="Filter by league (optional)")
    @app_commands.choices(league=LEAGUE_CHOICES)
    async def livescore(self, interaction: discord.Interaction, league: app_commands.Choice[str] = None):
        await interaction.response.defer()
        league_code = league.value if league else None
        matches = await self.api.get_live_matches(league=league_code)

        if not matches:
            label = f"in {league.name}" if league else "right now"
            return await interaction.followup.send(f"⚽ No live matches {label}. Check back later!")

        # Send each match with its own detail buttons
        await interaction.followup.send(content=f"🟢 **{len(matches)} live match(es)**")
        for m in matches[:5]:
            embed = build_match_embed(m)
            view  = MatchDetailView(m)
            await interaction.channel.send(embed=embed, view=view)

    # ── /match ────────────────────────────────────────────────────────────

    @app_commands.command(name="match", description="Full details for a specific match by ID")
    @app_commands.describe(match_id="Match ID (from /livescore or /fixtures)")
    async def match(self, interaction: discord.Interaction, match_id: int):
        await interaction.response.defer()
        match = await self.api.get_match(match_id)
        if not match:
            return await interaction.followup.send("❌ Match not found. Check the ID.")
        embed = build_match_embed(match)
        view  = MatchDetailView(match)
        await interaction.followup.send(embed=embed, view=view)

    # ── /fixtures ─────────────────────────────────────────────────────────

    @app_commands.command(name="fixtures", description="Upcoming fixtures for a league")
    @app_commands.describe(league="League to show fixtures for")
    @app_commands.choices(league=LEAGUE_CHOICES)
    async def fixtures(self, interaction: discord.Interaction, league: app_commands.Choice[str] = None):
        await interaction.response.defer()
        code = league.value if league else Config.DEFAULT_LEAGUE
        name = league.name if league else Config.LEAGUES.get(code, code)

        matches  = await self.api.get_competition_matches(code)
        upcoming = [m for m in matches if m.get("status") in ("SCHEDULED", "TIMED")][:8]

        if not upcoming:
            return await interaction.followup.send(f"No upcoming fixtures found for {name}.")

        await interaction.followup.send(content=f"📅 **Upcoming {name} fixtures**")
        for m in upcoming[:5]:
            embed = build_match_embed(m)
            view  = MatchDetailView(m)
            await interaction.channel.send(embed=embed, view=view)

    # ── /result ───────────────────────────────────────────────────────────

    @app_commands.command(name="result", description="Latest match results for a league")
    @app_commands.describe(league="League to check results for")
    @app_commands.choices(league=LEAGUE_CHOICES)
    async def result(self, interaction: discord.Interaction, league: app_commands.Choice[str] = None):
        await interaction.response.defer()
        code     = league.value if league else Config.DEFAULT_LEAGUE
        name     = league.name if league else Config.LEAGUES.get(code, code)
        matches  = await self.api.get_competition_matches(code)
        finished = [m for m in matches if m.get("status") == "FINISHED"][-5:]

        if not finished:
            return await interaction.followup.send(f"No recent results for {name}.")

        await interaction.followup.send(content=f"✅ **Latest {name} results**")
        for m in finished:
            # Fetch full match data to get goals list
            full = await self.api.get_match(m.get("id")) or m
            embed = build_match_embed(full)
            view  = MatchDetailView(full)
            await interaction.channel.send(embed=embed, view=view)

    # ── /scorers ──────────────────────────────────────────────────────────

    @app_commands.command(name="scorers", description="Top scorers in a league")
    @app_commands.describe(league="League to check top scorers for")
    @app_commands.choices(league=LEAGUE_CHOICES)
    async def scorers(self, interaction: discord.Interaction, league: app_commands.Choice[str] = None):
        await interaction.response.defer()
        code    = league.value if league else Config.DEFAULT_LEAGUE
        name    = league.name if league else Config.LEAGUES.get(code, code)
        scorers = await self.api.get_scorers(league=code, limit=10)
        if not scorers:
            return await interaction.followup.send(f"No scorer data for {name}.")
        embed = build_scorers_embed(scorers, name)
        await interaction.followup.send(embed=embed)

    # ── /h2h ──────────────────────────────────────────────────────────────

    @app_commands.command(name="h2h", description="Head-to-head record for a match ID")
    @app_commands.describe(match_id="The match ID (get from /livescore or /fixtures)")
    async def h2h(self, interaction: discord.Interaction, match_id: int):
        await interaction.response.defer()
        data = await self.api.get_head_to_head(match_id)
        if not data:
            return await interaction.followup.send("❌ Match not found. Check the match ID.")

        aggregates = data.get("aggregates", {})
        home_team  = aggregates.get("homeTeam", {}).get("name", "Home")
        away_team  = aggregates.get("awayTeam", {}).get("name", "Away")
        home_wins  = aggregates.get("homeTeam", {}).get("wins", 0)
        away_wins  = aggregates.get("awayTeam", {}).get("wins", 0)
        draws      = aggregates.get("numberOfDraws", 0)
        total      = aggregates.get("numberOfMatches", 0)

        embed = discord.Embed(
            title=f"🔁 H2H: {home_team} vs {away_team}",
            color=discord.Color.orange(),
        )
        embed.add_field(name=f"{home_team} wins", value=str(home_wins), inline=True)
        embed.add_field(name="Draws",              value=str(draws),     inline=True)
        embed.add_field(name=f"{away_team} wins",  value=str(away_wins), inline=True)
        embed.add_field(name="Total played",       value=str(total),     inline=True)

        matches = data.get("matches", [])[:5]
        if matches:
            lines = []
            for m in matches:
                h  = m.get("homeTeam", {}).get("shortName", "?")
                a  = m.get("awayTeam", {}).get("shortName", "?")
                ft = m.get("score", {}).get("fullTime", {})
                lines.append(f"**{h}** {ft.get('home','?')} – {ft.get('away','?')} **{a}**")
            embed.add_field(name="📋 Recent meetings", value="\n".join(lines), inline=False)

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(MatchesCog(bot))
