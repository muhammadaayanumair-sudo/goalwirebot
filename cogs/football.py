import discord
from discord.ext import commands
from discord import app_commands
# Import your helpers from the utils file you created
from cogs.utils import api_get, embed_reply

class Football(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="fixtures", description="Get today's fixtures")
    async def fixtures(self, interaction: discord.Interaction, league: str):
        await interaction.response.send_message(f"Fetching {league} data...")

async def setup(bot):
    await bot.add_cog(Football(bot))
