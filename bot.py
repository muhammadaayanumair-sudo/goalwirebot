import discord
import os
import asyncio
from discord.ext import commands

# Define your intents (ensure these match your Discord Developer Portal settings)
intents = discord.Intents.default()
intents.message_content = True  # If you need prefix commands

bot = commands.Bot(command_prefix="!", intents=intents)

async def load_extensions():
    # Looks into the 'cogs' folder
    for filename in os.listdir('./cogs'):
        if filename.endswith('.py'):
            # Loads the file (e.g., cogs.football)
            await bot.load_extension(f'cogs.{filename[:-3]}')
            print(f"Loaded extension: {filename}")

async def main():
    async with bot:
        await load_extensions()
        # Ensure your TOKEN is set in your Railway Environment Variables
        await bot.start(os.getenv("DISCORD_TOKEN"))

if __name__ == "__main__":
    asyncio.run(main())
