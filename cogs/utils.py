import aiohttp
import discord

API_URL = "https://v3.football.api-sports.io"

async def api_get(endpoint: str, headers: dict, params: dict = {}):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{API_URL}/{endpoint}", headers=headers, params=params, timeout=10) as r:
                return await r.json() if r.status == 200 else {"response": []}
    except:
        return {"response": []}

def embed_reply(title: str = None, desc: str = None, color: int = 0x3498db):
    e = discord.Embed(color=color)
    if title: e.title = title
    if desc: e.description = desc
    return e
