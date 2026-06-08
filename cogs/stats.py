import discord
from discord.ext import commands
from discord import app_commands
from services.football_api import FootballAPI
from embeds.embeds import build_standings_embed, build_player_embed
from config import Config

LEAGUE_CHOICES = [
    app_commands.Choice(name=v, value=k)
    for k, v in Config.LEAGUES.items()
]


class StatsCog(commands.Cog, name="Stats"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.api = FootballAPI()

    # ── /standings ────────────────────────────────────────────────────────

    @app_commands.command(name="standings", description="League table standings")
    @app_commands.describe(league="Which league?")
    @app_commands.choices(league=LEAGUE_CHOICES)
    async def standings(self, interaction: discord.Interaction, league: app_commands.Choice[str] = None):
        await interaction.response.defer()
        code = league.value if league else Config.DEFAULT_LEAGUE
        name = league.name if league else Config.LEAGUES.get(code, code)

        table = await self.api.get_standings(league=code)
        if not table:
            return await interaction.followup.send(f"Standings not available for {name}.")

        embed = build_standings_embed(table, name, page=0)
        view = StandingsView(table, name)
        await interaction.followup.send(embed=embed, view=view)

    # ── /team ─────────────────────────────────────────────────────────────

    @app_commands.command(name="team", description="Info and recent form for a team")
    @app_commands.describe(team_id="Team ID (use /teamsearch to find it)")
    async def team(self, interaction: discord.Interaction, team_id: int):
        await interaction.response.defer()
        data = await self.api.get_team(team_id)
        if not data:
            return await interaction.followup.send("❌ Team not found.")

        embed = discord.Embed(
            title=data.get("name", "Unknown"),
            description=data.get("address", ""),
            color=discord.Color.blue(),
        )
        embed.add_field(name="Short name", value=data.get("shortName", "N/A"), inline=True)
        embed.add_field(name="Founded", value=str(data.get("founded", "N/A")), inline=True)
        embed.add_field(name="Stadium", value=data.get("venue", "N/A"), inline=True)
        embed.add_field(name="Website", value=data.get("website", "N/A"), inline=False)

        crest = data.get("crest")
        if crest:
            embed.set_thumbnail(url=crest)

        # Recent form
        recent = await self.api.get_team_matches(team_id, status="FINISHED", limit=5)
        if recent:
            form_chars = []
            for m in recent:
                score = m.get("score", {}).get("fullTime", {})
                is_home = m.get("homeTeam", {}).get("id") == team_id
                home_goals = score.get("home", 0)
                away_goals = score.get("away", 0)
                if is_home:
                    result = "W" if home_goals > away_goals else ("D" if home_goals == away_goals else "L")
                else:
                    result = "W" if away_goals > home_goals else ("D" if home_goals == away_goals else "L")
                emoji = {"W": "🟢", "D": "🟡", "L": "🔴"}.get(result, "⚪")
                form_chars.append(emoji)
            embed.add_field(name="Recent form (oldest→newest)", value=" ".join(form_chars), inline=False)

        await interaction.followup.send(embed=embed)

    # ── /teamsearch ───────────────────────────────────────────────────────

    @app_commands.command(name="teamsearch", description="Search for a team by name to get its ID")
    @app_commands.describe(name="Team name to search")
    async def teamsearch(self, interaction: discord.Interaction, name: str):
        await interaction.response.defer()
        teams = await self.api.search_team(name)
        if not teams:
            return await interaction.followup.send(f"No teams found matching '{name}'.")

        embed = discord.Embed(title=f"🔍 Teams matching '{name}'", color=discord.Color.blue())
        lines = []
        for t in teams[:8]:
            lines.append(f"**{t.get('name')}** (ID: `{t.get('id')}`) — {t.get('area', {}).get('name', '')}")
        embed.description = "\n".join(lines)
        embed.set_footer(text="Use the ID with /team or /alerts add")
        await interaction.followup.send(embed=embed)


# ── Standings Paginator ───────────────────────────────────────────────────────

class StandingsView(discord.ui.View):
    def __init__(self, table: list, league_name: str):
        super().__init__(timeout=120)
        self.table = table
        self.league_name = league_name
        self.page = 0
        self.max_page = (len(table) - 1) // 10

    @discord.ui.button(label="◀ Prev", style=discord.ButtonStyle.secondary)
    async def prev_page(self, interaction: discord.Interaction, button: discord.ui.Button):
        if self.page > 0:
            self.page -= 1
        embed = build_standings_embed(self.table, self.league_name, self.page)
        await interaction.response.edit_message(embed=embed, view=self)

    @discord.ui.button(label="Next ▶", style=discord.ButtonStyle.secondary)
    async def next_page(self, interaction: discord.Interaction, button: discord.ui.Button):
        if self.page < self.max_page:
            self.page += 1
        embed = build_standings_embed(self.table, self.league_name, self.page)
        await interaction.response.edit_message(embed=embed, view=self)


async def setup(bot: commands.Bot):
    await bot.add_cog(StatsCog(bot))
