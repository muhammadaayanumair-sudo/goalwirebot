import discord
from discord.ext import commands
from discord import app_commands
from models.database import SessionLocal, Guild
from sqlalchemy import select
from config import Config

LEAGUE_CHOICES = [
    app_commands.Choice(name=v, value=k)
    for k, v in Config.LEAGUES.items()
]


class AdminCog(commands.Cog, name="Admin"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # ── /setup ────────────────────────────────────────────────────────────

    @app_commands.command(name="setup", description="Set up GoalWire for this server")
    @app_commands.describe(
        alert_channel="Channel where all match alerts will be posted",
        default_league="Default league for commands",
    )
    @app_commands.choices(default_league=LEAGUE_CHOICES)
    @app_commands.checks.has_permissions(administrator=True)
    async def setup(
        self,
        interaction: discord.Interaction,
        alert_channel: discord.TextChannel,
        default_league: app_commands.Choice[str] = None,
    ):
        await interaction.response.defer(ephemeral=True)
        league_code = default_league.value if default_league else "PL"

        async with SessionLocal() as session:
            result = await session.execute(select(Guild).where(Guild.id == interaction.guild_id))
            guild = result.scalar_one_or_none()
            if guild:
                guild.alert_channel_id = alert_channel.id
                guild.default_league = league_code
            else:
                session.add(Guild(
                    id=interaction.guild_id,
                    alert_channel_id=alert_channel.id,
                    default_league=league_code,
                ))
            await session.commit()

        league_name = Config.LEAGUES.get(league_code, league_code)
        embed = discord.Embed(
            title="✅ GoalWire configured!",
            color=discord.Color.green(),
        )
        embed.add_field(name="Alert channel", value=alert_channel.mention, inline=True)
        embed.add_field(name="Default league", value=league_name, inline=True)
        embed.add_field(
            name="Next steps",
            value="• Use `/alert add` to set up team alerts\n• Use `/livescore` to test\n• Use `/fpllink` to link your FPL team",
            inline=False
        )
        await interaction.followup.send(embed=embed, ephemeral=True)

    # ── /botinfo ──────────────────────────────────────────────────────────

    @app_commands.command(name="botinfo", description="Info about this bot and all available commands")
    async def botinfo(self, interaction: discord.Interaction):
        embed = discord.Embed(
            title="⚽ GoalWire",
            description="Your all-in-one football companion for Discord.",
            color=discord.Color.green(),
        )

        commands_map = {
            "📺 Matches": "`/livescore` `/fixtures` `/result` `/scorers` `/h2h`",
            "📊 Stats": "`/standings` `/team` `/teamsearch`",
            "🤖 AI": "`/preview` `/predict` `/summarize` `/scout`",
            "🏅 Fantasy": "`/fpllink` `/myfpl` `/fplplayer` `/fplleague`",
            "🔔 Alerts": "`/alert add` `/alert list` `/alert remove`",
            "🎉 Fun": "`/trivia` `/poll` `/banter` `/whoami`",
            "⚙️ Admin": "`/setup` `/botinfo`",
        }
        for cat, cmds in commands_map.items():
            embed.add_field(name=cat, value=cmds, inline=False)

        embed.add_field(
            name="🔑 Data sources",
            value="football-data.org • Fantasy Premier League API • GoalWire AI",
            inline=False
        )
        embed.set_footer(text=f"GoalWire • Serving {len(self.bot.guilds)} servers")
        await interaction.response.send_message(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(AdminCog(bot))
