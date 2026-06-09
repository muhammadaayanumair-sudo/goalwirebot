import discord
import aiosqlite
from discord.ext import commands

class Database(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def cog_load(self):
        # Runs when the Cog is loaded
        async with aiosqlite.connect("football.db") as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS predictions 
                (guild_id TEXT, user_id TEXT, points INTEGER, pick TEXT)
            """)
            await db.commit()

async def setup(bot):
    await bot.add_cog(Database(bot))
  
