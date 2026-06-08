import os
import discord
from discord.ext import commands, tasks
from discord import app_commands
from dotenv import load_dotenv
import aiohttp
import aiosqlite
import asyncio
from openai import AsyncOpenAI
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import datetime
import time

load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
FOOTBALL_KEY = os.getenv("FOOTBALL_API_KEY")
OPENAI_KEY = os.getenv("OPENAI_API_KEY")

LEAGUES = [39,140,78,135,61,2] # EPL, La Liga, Bundesliga, Serie A, Ligue 1, UCL
intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)
openai_client = AsyncOpenAI(api_key=OPENAI_KEY)
api_cache = {}

# ===== DATABASE =====
async def setup_db():
    bot.db = await aiosqlite.connect("bot.db")
    await bot.db.execute("CREATE TABLE IF NOT EXISTS settings (guild_id INTEGER PRIMARY KEY, channel_id INTEGER)")
    await bot.db.commit()

async def save_channel(guild_id, channel_id):
    await bot.db.execute("INSERT OR REPLACE INTO settings VALUES(?,?)", (guild_id, channel_id))
    await bot.db.commit()

async def get_channel_id(guild_id):
    async with bot.db.execute("SELECT channel_id FROM settings WHERE guild_id=?", (guild_id,)) as cur:
        row = await cur.fetchone()
    return row[0] if row else None

# ===== FOOTBALL API =====
async def football_api(endpoint, params):
    key = f"{endpoint}:{str(params)}"
    now = time.time()
    if key in api_cache and now - api_cache[key]["time"] < 300:
        return api_cache[key]["data"]
    headers = {"x-apisports-key": FOOTBALL_KEY}
    async with aiohttp.ClientSession() as s:
        async with s.get(f"https://v3.football.api-sports.io/{endpoint}", headers=headers, params=params) as r:
            data = await r.json()
    api_cache[key] = {"time": now, "data": data}
    return data

# ===== EMBEDS =====
def live_embed(f):
    h,a,g,s = f['teams']['home'], f['teams']['away'], f['goals'], f['fixture']['status']
    title = f"🔴 LIVE {s['elapsed']}'" if s['short'] in ['1H','2H'] else f"{s['long']}"
    e = discord.Embed(title=title, description=f"**{h['name']} {g['home']} - {g['away']} {a['name']}**", color=0x00ff00 if s['short']!= 'FT' else 0x95a5a6)
    e.set_thumbnail(url=h['logo'])
    e.set_author(name=f['league']['name'], icon_url=f['league']['logo'])
    return e

def fixtures_embed(data):
    if not data.get('response'): return None
    e = discord.Embed(title="Today's Top 5 League Fixtures", color=0x3498db)
    count = 0
    for fix in data['response']:
        if fix['league']['id'] not in LEAGUES or count >= 8: continue
        time = fix['fixture']['date'][11:16]
        e.add_field(name=fix['league']['name'], value=f"{fix['teams']['home']['name']} vs {fix['teams']['away']['name']} - {time} UTC", inline=False)
        count += 1
    return e if count > 0 else None

# ===== COMMANDS =====
@bot.tree.command(name="setup", description="Set channel for auto football updates")
async def setup_cmd(interaction: discord.Interaction, channel: discord.TextChannel):
    if not interaction.user.guild_permissions.administrator:
        return await interaction.response.send_message("Admin only", ephemeral=True)
    await save_channel(interaction.guild.id, channel.id)
    e = discord.Embed(title="GoalWire Autopilot Enabled", description=f"Posting to {channel.mention}", color=0x00ff00)
    e.add_field(name="Auto Features", value="✓ Fixtures 9am GMT\n✓ Live Updates Every 15min\n✓ Top Scorers Monday\n✓ /vs Team Compare\n✓ /compare Players")
    await interaction.response.send_message(embed=e)

@bot.tree.command(name="vs", description="Compare teams + AI predicts winner")
async def vs(interaction: discord.Interaction, team1: str, team2: str):
    await interaction.response.defer()
    t1 = await football_api("teams", {"search": team1})
    t2 = await football_api("teams", {"search": team2})
    if not t1['response'] or not t2['response']:
        return await interaction.followup.send("Team not found. Use full name like 'Manchester City'")
    t1_id, t2_id = t1['response'][0]['team']['id'], t2['response'][0]['team']['id']
    s1 = await football_api("teams/statistics", {"team": t1_id, "league": 39, "season": 2023})
    s2 = await football_api("teams/statistics", {"team": t2_id, "league": 39, "season": 2023})
    prompt = f"Team A: {t1['response'][0]['team']['name']}, Form: {s1['response']['form']}, Goals/game: {s1['response']['goals']['for']['average']['total']}. Team B: {t2['response'][0]['team']['name']}, Form: {s2['response']['form']}, Goals/game: {s2['response']['goals']['for']['average']['total']}. Give win % for each + 1 sentence reason. Be a witty UK pundit."
    res = await openai_client.chat.completions.create(model="gpt-4o-mini", messages=[{"role": "user", "content": prompt}])
    e = discord.Embed(title=f"{s1['response']['team']['name']} vs {s2['response']['team']['name']}", color=0xe74c3c)
    e.add_field(name=s1['response']['team']['name'], value=f"Form: {s1['response']['form']}\nGoals/Game: {s1['response']['goals']['for']['average']['total']}", inline=True)
    e.add_field(name=s2['response']['team']['name'], value=f"Form: {s2['response']['form']}\nGoals/Game: {s2['response']['goals']['for']['average']['total']}", inline=True)
    e.add_field(name="AI Win Prediction", value=res.choices[0].message.content, inline=False)
    e.set_thumbnail(url=s1['response']['team']['logo'])
    await interaction.followup.send(embed=e)

@bot.tree.command(name="compare", description="Compare two players")
async def compare(interaction: discord.Interaction, player1: str, player2: str):
    await interaction.response.defer()
    p1 = await football_api("players", {"search": player1, "league": 39, "season": 2023})
    p2 = await football_api("players", {"search": player2, "league": 39, "season": 2023})
    if not p1['response'] or not p2['response']:
        return await interaction.followup.send("Player not found")
    s1, s2 = p1['response'][0]['statistics'][0], p2['response'][0]['statistics'][0]
    e = discord.Embed(title=f"{p1['response'][0]['player']['name']} vs {p2['response'][0]['player']['name']}", color=0x9b59b6)
    e.add_field(name=p1['response'][0]['player']['name'], value=f"Goals: {s1['goals']['total'] or 0}\nAssists: {s1['goals']['assists'] or 0}\nRating: {s1['games']['rating'] or 'N/A'}", inline=True)
    e.add_field(name=p2['response'][0]['player']['name'], value=f"Goals: {s2['goals']['total'] or 0}\nAssists: {s2['goals']['assists'] or 0}\nRating: {s2['games']['rating'] or 'N/A'}", inline=True)
    e.set_thumbnail(url=p1['response'][0]['player']['photo'])
    await interaction.followup.send(embed=e)

@bot.tree.command(name="live", description="Show all live Top 5 league games")
async def live(interaction: discord.Interaction):
    await interaction.response.defer()
    data = await football_api("fixtures", {"live": "all"})
    count = 0
    for fix in data.get('response', []):
        if fix['league']['id'] in LEAGUES:
            await interaction.followup.send(embed=live_embed(fix))
            count += 1
    if count == 0: await interaction.followup.send("No Top 5 league games live right now")

# ===== AUTO POSTING =====
scheduler = AsyncIOScheduler()

async def post_fixtures():
    data = await football_api("fixtures", {"date": datetime.date.today().isoformat(), "status": "NS"})
    embed = fixtures_embed(data)
    if not embed: return
    for guild in bot.guilds:
        cid = await get_channel_id(guild.id)
        if cid and (ch := guild.get_channel(cid)): 
            try: await ch.send(embed=embed)
            except: pass

async def post_scorers():
    for guild in bot.guilds:
        cid = await get_channel_id(guild.id)
        if not cid: continue
        ch = guild.get_channel(cid)
        if not ch: continue
        for league in [39, 140]:
            data = await football_api("players/topscorers", {"league": league, "season": 2023})
            if data.get('response'):
                names = {39: "EPL", 140: "La Liga"}
                e = discord.Embed(title=f"{names.get(league)} Top Scorers", color=0xf1c40f)
                for p in data['response'][:5]:
                    e.add_field(name=p['player']['name'], value=f"{p['statistics'][0]['goals']['total']} goals", inline=False)
                try: await ch.send(embed=e)
                except: pass

@tasks.loop(seconds=900) # 15 min to save API calls on free tier
async def live_loop():
    await bot.wait_until_ready()
    data = await football_api("fixtures", {"live": "all"})
    for fixture in data.get('response', []):
        if fixture['league']['id'] not in LEAGUES: continue
        for guild in bot.guilds:
            cid = await get_channel_id(guild.id)
            if not cid: continue
            ch = guild.get_channel(cid)
            if not ch: continue
            try: await ch.send(embed=live_embed(fixture))
            except: pass

@bot.event
async def on_ready():
    await setup_db()
    scheduler.add_job(post_fixtures, 'cron', hour=9, minute=0)
    scheduler.add_job(post_scorers, 'cron', day_of_week='mon', hour=10)
    scheduler.start()
    live_loop.start()
    try:
        synced = await bot.tree.sync()
        print(f"Synced {len(synced)} commands")
    except Exception as e:
        print(e)
    print(f"Logged in as {bot.user} | SQLite DB Ready")

bot.run(TOKEN)