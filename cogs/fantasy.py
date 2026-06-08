import discord
from discord.ext import commands
from discord import app_commands
from services.fpl_service import FPLService
from embeds.embeds import build_fpl_team_embed
from models.database import SessionLocal, User
from sqlalchemy import select


class FantasyCog(commands.Cog, name="Fantasy"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.fpl = FPLService()

    # ── /fpl link ─────────────────────────────────────────────────────────

    @app_commands.command(name="fpllink", description="Link your FPL team ID to your Discord account")
    @app_commands.describe(team_id="Your FPL team ID (found in your FPL team URL)")
    async def fpllink(self, interaction: discord.Interaction, team_id: int):
        await interaction.response.defer(ephemeral=True)
        entry = await self.fpl.get_team(team_id)
        if not entry:
            return await interaction.followup.send("❌ FPL team not found. Double-check the ID.", ephemeral=True)

        async with SessionLocal() as session:
            result = await session.execute(select(User).where(User.id == interaction.user.id))
            user = result.scalar_one_or_none()
            if user:
                user.fpl_team_id = team_id
            else:
                session.add(User(id=interaction.user.id, fpl_team_id=team_id))
            await session.commit()

        name = entry.get("name", "your team")
        await interaction.followup.send(f"✅ Linked to **{name}**! Use `/myfpl` to see your stats.", ephemeral=True)

    # ── /myfpl ────────────────────────────────────────────────────────────

    @app_commands.command(name="myfpl", description="Your FPL team stats for the current gameweek")
    async def myfpl(self, interaction: discord.Interaction):
        await interaction.response.defer()
        async with SessionLocal() as session:
            result = await session.execute(select(User).where(User.id == interaction.user.id))
            user = result.scalar_one_or_none()

        if not user or not user.fpl_team_id:
            return await interaction.followup.send("❌ You haven't linked an FPL team yet. Use `/fpllink <team_id>`.")

        gw = await self.fpl.get_current_gameweek()
        entry = await self.fpl.get_team(user.fpl_team_id)
        picks = await self.fpl.get_team_picks(user.fpl_team_id, gw) if gw else None

        if not entry:
            return await interaction.followup.send("❌ Could not fetch your FPL data.")

        embed = build_fpl_team_embed(entry, picks, gw)

        # Show captain if picks available
        if picks and gw:
            bootstrap = await self.fpl.get_bootstrap()
            if bootstrap:
                elements = {e["id"]: e for e in bootstrap.get("elements", [])}
                captain_id = next((p["element"] for p in picks.get("picks", []) if p.get("is_captain")), None)
                if captain_id and captain_id in elements:
                    captain = elements[captain_id]
                    embed.add_field(name="Captain (C)", value=captain.get("web_name", "?"), inline=True)

        await interaction.followup.send(embed=embed)

    # ── /fplplayer ────────────────────────────────────────────────────────

    @app_commands.command(name="fplplayer", description="FPL stats for a player")
    @app_commands.describe(name="Player name to search")
    async def fplplayer(self, interaction: discord.Interaction, name: str):
        await interaction.response.defer()
        players = await self.fpl.search_player(name)
        if not players:
            return await interaction.followup.send(f"No FPL players found matching '{name}'.")

        bootstrap = await self.fpl.get_bootstrap()
        teams = {}
        if bootstrap:
            teams = {t["id"]: t["name"] for t in bootstrap.get("teams", [])}

        embeds = []
        for p in players[:3]:
            team_name = teams.get(p.get("team", 0), "Unknown")
            embed = discord.Embed(
                title=f"👤 {p.get('first_name')} {p.get('second_name')}",
                color=discord.Color.purple(),
            )
            embed.add_field(name="Club", value=team_name, inline=True)
            embed.add_field(name="Price", value=f"£{p.get('now_cost', 0)/10:.1f}m", inline=True)
            embed.add_field(name="Total pts", value=str(p.get("total_points", 0)), inline=True)
            embed.add_field(name="Form", value=p.get("form", "N/A"), inline=True)
            embed.add_field(name="Selected by", value=f"{p.get('selected_by_percent','?')}%", inline=True)
            embed.add_field(name="Goals", value=str(p.get("goals_scored", 0)), inline=True)
            embed.add_field(name="Assists", value=str(p.get("assists", 0)), inline=True)
            embed.add_field(name="xG", value=str(p.get("expected_goals", "N/A")), inline=True)
            embeds.append(embed)

        await interaction.followup.send(embeds=embeds)

    # ── /fplleague ────────────────────────────────────────────────────────

    @app_commands.command(name="fplleague", description="Show standings for an FPL mini-league")
    @app_commands.describe(league_id="Your FPL mini-league ID")
    async def fplleague(self, interaction: discord.Interaction, league_id: int):
        await interaction.response.defer()
        data = await self.fpl.get_league_standings(league_id)
        if not data:
            return await interaction.followup.send("❌ League not found. Make sure the league is public.")

        league_name = data.get("league", {}).get("name", f"League {league_id}")
        results = data.get("standings", {}).get("results", [])[:10]

        embed = discord.Embed(title=f"🏆 {league_name}", color=discord.Color.gold())
        rows = []
        for r in results:
            rank = r.get("rank", "?")
            entry_name = r.get("entry_name", "Unknown")
            player = r.get("player_name", "")
            pts = r.get("total", 0)
            rows.append(f"`{rank:>2}.` **{entry_name}** ({player}) — `{pts}pts`")

        embed.description = "\n".join(rows)
        embed.set_footer(text="Fantasy Premier League")
        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(FantasyCog(bot))
