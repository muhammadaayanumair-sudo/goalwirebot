import discord
from discord.ext import commands
from discord import app_commands

class Football(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="fixtures", description="Get today's fixtures")
    async def fixtures(self, interaction: discord.Interaction, league: str):
        # Your API logic goes here
        await interaction.response.send_message(f"Fetching {league} data...")

async def setup(bot):
    await bot.add_cog(Football(bot))
  
