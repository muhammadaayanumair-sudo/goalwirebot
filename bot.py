import discord
import os
import asyncio
from discord.ext import commands
from dotenv import load_dotenv

load_dotenv()

intents = discord.Intents.default()
intents.message_content = True

bot = commands.Bot(command_prefix="!", intents=intents)

async def load_extensions():
    # Only load files in cogs/ that are NOT utils.py
    for filename in os.listdir('./cogs'):
        if filename.endswith('.py') and filename != 'utils.py':
            await bot.load_extension(f'cogs.{filename[:-3]}')
            print(f"Loaded extension: {filename}")

@bot.event
async def on_ready():
    await bot.tree.sync() # Syncs your Slash Commands to Discord
    print(f"Logged in as {bot.user} | Commands synced.")

async def main():
    async with bot:
        await load_extensions()
        await bot.start(os.getenv("DISCORD_TOKEN"))

if __name__ == "__main__":
    asyncio.run(main())
