import discord
from discord import app_commands
from discord.ext import commands
from cogs.utils import api_get, create_embed

class Football(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def player_autocomplete(self, interaction: discord.Interaction, current: str):
        if len(current) < 3: return []
        results = await api_get("players", {"search": current})
        # Limits to 25 results, returns ID as value for command logic
        return [app_commands.Choice(name=p['player']['name'], value=str(p['player']['id'])) 
                for p in results.get("response", [])[:25]]

    @app_commands.command(name="player", description="Search for any player")
    @app_commands.autocomplete(name=player_autocomplete)
    async def player(self, interaction: discord.Interaction, name: str):
        await interaction.response.defer()
        # If input is a numeric ID, fetch directly. If raw string, search.
        data = await api_get("players", {"id": name} if name.isdigit() else {"search": name})
        await interaction.followup.send(embed=create_embed("Player Profile", str(data)))

async def setup(bot):
    await bot.add_cog(Football(bot))
