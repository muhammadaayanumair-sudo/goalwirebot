import discord
import aiohttp
import os

# Base URL for Football-Data.org v4
BASE_URL = "https://api.football-data.org/v4"

def get_headers():
    # Football-Data.org uses 'X-Auth-Token'
    return {"X-Auth-Token": os.getenv("FOOTBALL_API_KEY")}

async def api_get(endpoint, params={}):
    url = f"{BASE_URL}/{endpoint}"
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=get_headers(), params=params) as resp:
            if resp.status == 200:
                return await resp.json()
            else:
                return {"error": f"Status {resp.status}"}

def create_embed(title, description, color=0x3498DB):
    embed = discord.Embed(title=title, description=description, color=color)
    embed.set_footer(text="Powered by Goal Wire | Data: Football-Data.org")
    return embed
