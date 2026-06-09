import discord
from discord.ext import commands
from discord import app_commands
from cogs.utils import api_get, embed_reply
import os

class Football(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.headers = {"x-apisports-key": os.getenv("API_FOOTBALL_KEY")}

    @app_commands.command(name="fixtures", description="Get today's fixtures")
    async def fixtures(self, interaction: discord.Interaction, league: str):
        await interaction.response.defer()
        # Use your utility function here
        data = await api_get("fixtures", self.headers, {"league": league, "live": "all"})
        await interaction.followup.send(embed=embed_reply("Fixtures", str(data)))

async def setup(bot):
    await bot.add_cog(Football(bot))
