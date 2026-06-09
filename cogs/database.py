import discord
import aiosqlite
from discord.ext import commands

class Database(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def cog_load(self):
        async with aiosqlite.connect("goalwire.db") as db:
            await db.execute("""CREATE TABLE IF NOT EXISTS guild_settings 
                               (guild_id TEXT PRIMARY KEY, trivia_channel TEXT, timezone TEXT)""")
            await db.commit()

async def setup(bot):
    await bot.add_cog(Database(bot))
