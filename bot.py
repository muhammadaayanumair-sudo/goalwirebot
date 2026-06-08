import discord
from discord.ext import commands, tasks
from discord import app_commands
import aiosqlite
import os
import aiohttp
import asyncio
import random
from datetime import datetime, timedelta, timezone

TOKEN = os.getenv("DISCORD_TOKEN")
FOOTBALL_API_KEY = os.getenv("FOOTBALL_API_KEY")

intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

# ===== 200+ TEAM IDS =====
TEAM_IDS = {
    "arsenal": 57, "arsenal fc": 57, "aston villa": 58, "aston villa fc": 58,
    "brentford": 402, "brentford fc": 402, "brighton": 397, "brighton & hove albion": 397,
    "burnley": 328, "burnley fc": 328, "chelsea": 61, "chelsea fc": 61,
    "crystal palace": 354, "crystal palace fc": 354, "everton": 62, "everton fc": 62,
    "fulham": 63, "fulham fc": 63, "liverpool": 64, "liverpool fc": 64,
    "luton": 389, "luton town": 389, "man city": 65, "manchester city": 65, "manchester city fc": 65,
    "man united": 66, "manchester united": 66, "manchester united fc": 66,
    "newcastle": 67, "newcastle united": 67, "newcastle united fc": 67,
    "nottingham": 351, "nottingham forest": 351, "sheffield united": 356, "sheffield utd": 356,
    "tottenham": 73, "tottenham hotspur": 73, "spurs": 73, "tottenham hotspur fc": 73,
    "west ham": 563, "west ham united": 563, "wolves": 76, "wolverhampton": 76, "wolverhampton wanderers": 76,
    "real madrid": 86, "real madrid cf": 86, "barcelona": 81, "fc barcelona": 81, "barca": 81,
    "atletico": 78, "atletico madrid": 78, "atlético de madrid": 78, "real sociedad": 92,
    "real betis": 90, "villarreal": 94, "villarreal cf": 94, "athletic": 77, "athletic club": 77, "athletic bilbao": 77,
    "sevilla": 79, "sevilla fc": 79, "valencia": 95, "valencia cf": 95,
    "getafe": 82, "getafe cf": 82, "las palmas": 275, "alaves": 263, "mallorca": 89, "rcd mallorca": 89,
    "cadiz": 264, "granada": 83, "almeria": 267, "celta": 558, "celta vigo": 558, "girona": 298,
    "bayern": 5, "bayern munich": 5, "fc bayern münchen": 5, "dortmund": 4, "borussia dortmund": 4,
    "leipzig": 721, "rb leipzig": 721, "leverkusen": 3, "bayer leverkusen": 3, "bayer 04 leverkusen": 3,
    "frankfurt": 19, "eintracht frankfurt": 19, "union berlin": 28, "freiburg": 17, "sc freiburg": 17,
    "mainz": 15, "mainz 05": 15, "wolfsburg": 11, "vfl wolfsburg": 11, "gladbach": 18, "borussia mönchengladbach": 18,
    "köln": 1, "fc köln": 1, "1. fc köln": 1, "koln": 1, "hoffenheim": 2, "tsg hoffenheim": 2,
    "augsburg": 16, "fc augsburg": 16, "stuttgart": 10, "vfb stuttgart": 10, "werder": 12, "werder bremen": 12,
    "bochum": 36, "vfl bochum": 36, "heidenheim": 44, "darmstadt": 20,
    "inter": 108, "inter milan": 108, "fc internazionale milano": 108, "milan": 98, "ac milan": 98,
    "juventus": 109, "juventus fc": 109, "napoli": 113, "ssc napoli": 113, "roma": 100, "as roma": 100,
    "lazio": 110, "ss lazio": 110, "atalanta": 102, "atalanta bc": 102, "fiorentina": 99, "bologna": 103,
    "torino": 586, "monza": 5911, "lecce": 5890, "genoa": 107, "cagliari": 104, "verona": 450,
    "frosinone": 470, "udinese": 115, "empoli": 445, "sassuolo": 471, "salernitana": 455,
    "psg": 524, "paris saint-germain": 524, "paris saint-germain fc": 524, "marseille": 516, "olympique de marseille": 516,
    "monaco": 548, "as monaco": 548, "as monaco fc": 548, "lyon": 523, "olympique lyonnais": 523,
    "lille": 521, "losc lille": 521, "nice": 522, "ogc nice": 522, "lens": 546, "rc lens": 546,
    "rennes": 529, "stade rennais": 529, "reims": 547, "montpellier": 518, "strasbourg": 526,
    "nantes": 543, "toulouse": 511, "lorient": 525, "metz": 545, "brest": 512, "clermont": 541, "le havre": 533,
    "ajax": 678, "afc ajax": 678, "psv": 674, "feyenoord": 675, "benfica": 1903, "sl benfica": 1903,
    "porto": 503, "fc porto": 503, "sporting": 498, "sporting cp": 498, "celtic": 732, "rangers": 733,
    "inter miami": 11548, "inter miami cf": 11548, "al nassr": 536, "al nassr fc": 536, "al hilal": 449, "al hilal sfc": 449,
}

TOP_LEAGUES = [
    app_commands.Choice(name="🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League", value="PL"),
    app_commands.Choice(name="🇪🇸 La Liga", value="PD"),
    app_commands.Choice(name="🇩🇪 Bundesliga", value="BL1"),
    app_commands.Choice(name="🇮🇹 Serie A", value="SA"),
    app_commands.Choice(name="🇫🇷 Ligue 1", value="FL1"),
    app_commands.Choice(name="🏆 Champions League", value="CL"),
]

TRIVIA_BANK = [
    {"q": "Which club won the first Premier League?", "a": "Manchester United"},
    {"q": "Most Ballon d'Or awards?", "a": "Lionel Messi - 8"},
    {"q": "2018 World Cup winner?", "a": "France"},
    {"q": "UCL top scorer all time?", "a": "Cristiano Ronaldo"},
    {"q": "Fastest PL hat-trick?", "a": "Sadio Mane"},
    {"q": "Most UCL titles?", "a": "Real Madrid - 15"},
    {"q": "2022 World Cup winner?", "a": "Argentina"},
    {"q": "Most PL goals?", "a": "Alan Shearer - 260"},
    {"q": "PL founded year?", "a": "1992"},
    {"q": "Euro 2020 winner?", "a": "Italy"},
    {"q": "'Theatre of Dreams'?", "a": "Old Trafford"},
    {"q": "CR7 is?", "a": "Cristiano Ronaldo"},
    {"q": "2014 World Cup host?", "a": "Brazil"},
    {"q": "Man City manager?", "a": "Pep Guardiola"},
    {"q": "VAR stands for?", "a": "Video Assistant Referee"},
    {"q": "'The Gunners'?", "a": "Arsenal"},
    {"q": "2021 Copa America?", "a": "Argentina"},
    {"q": "Players on pitch?", "a": "22"},
    {"q": "El Clásico teams?", "a": "Real Madrid vs Barcelona"},
    {"q": "2023 Ballon d'Or?", "a": "Lionel Messi"},
    {"q": "'Egyptian King'?", "a": "Mohamed Salah"},
    {"q": "Bayern stadium?", "a": "Allianz Arena"},
    {"q": "'Hand of God'?", "a": "Diego Maradona"},
    {"q": "First World Cup 1930?", "a": "Uruguay"},
    {"q": "Youngest WC winner?", "a": "Pelé"},
]

used_trivia = {}
posted_lineups = set()

async def league_autocomplete(interaction, current):
    choices = [l for l in TOP_LEAGUES if current.lower() in l.name.lower() or current.lower() in l.value.lower()]
    if current and not choices:
        choices.append(app_commands.Choice(name=f"Custom: {current.upper()}", value=current.upper()))
    return choices[:25]

async def team_autocomplete(interaction, current):
    teams = [app_commands.Choice(name="PSG", value="psg"), app_commands.Choice(name="Arsenal", value="arsenal"),
             app_commands.Choice(name="Man City", value="man city"), app_commands.Choice(name="Liverpool", value="liverpool"),
             app_commands.Choice(name="Chelsea", value="chelsea"), app_commands.Choice(name="Man United", value="man united"),
             app_commands.Choice(name="Tottenham", value="tottenham"), app_commands.Choice(name="Real Madrid", value="real madrid"),
             app_commands.Choice(name="Barcelona", value="barcelona"), app_commands.Choice(name="Bayern", value="bayern"),
             app_commands.Choice(name="Dortmund", value="dortmund"), app_commands.Choice(name="Inter", value="inter"),
             app_commands.Choice(name="Milan", value="milan"), app_commands.Choice(name="Juventus", value="juventus")]
    return [t for t in teams if not current or current.lower() in t.name.lower()][:25]

async def init_db():
    async with aiosqlite.connect("database.db") as db:
        await db.execute("CREATE TABLE IF NOT EXISTS guild_channels (guild_id INTEGER, feature TEXT, channel_id INTEGER, PRIMARY KEY (guild_id, feature))")
        await db.execute("CREATE TABLE IF NOT EXISTS lineup_subs (guild_id INTEGER, league TEXT, PRIMARY KEY (guild_id, league))")
        await db.commit()

async def football_api_request(endpoint):
    headers = {"X-Auth-Token": FOOTBALL_API_KEY}
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"https://api.football-data.org/v4/{endpoint}", headers=headers, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status == 200:
                    return await resp.json()
                return {"error": f"API {resp.status}"}
    except:
        return {"error": "Timeout"}

@bot.event
async def on_ready():
    await init_db()
    print(f"Logged in as {bot.user}")
    check_lineups.start()
    await bot.tree.sync()

@tasks.loop(minutes=5)
async def check_lineups():
    async with aiosqlite.connect("database.db") as db:
        cursor = await db.execute("SELECT DISTINCT league FROM lineup_subs")
        leagues = [r[0] for r in await cursor.fetchall()]
    for league in leagues:
        data = await football_api_request(f"competitions/{league}/matches?status=SCHEDULED")
        if "matches" not in data: continue
        now = datetime.now(timezone.utc)
        for match in data["matches"][:20]:
            mt = datetime.fromisoformat(match["utcDate"].replace("Z", "+00:00"))
            if 30 <= (mt-now).total_seconds()/60 <= 90 and match["id"] not in posted_lineups:
                md = await football_api_request(f"matches/{match['id']}")
                if "match" in md and md["match"].get("lineups"):
                    posted_lineups.add(match["id"])
                    async with aiosqlite.connect("database.db") as db:
                        cur = await db.execute("SELECT guild_id FROM lineup_subs WHERE league=?", (league,))
                        for gid in await cur.fetchall():
                            cur2 = await db.execute("SELECT channel_id FROM guild_channels WHERE guild_id=? AND feature='lineups'", (gid[0],))
                            row = await cur2.fetchone()
                            if row and (ch:=bot.get_channel(row[0])):
                                m = md["match"]
                                hx = ", ".join([p["name"] for p in m["lineups"]["homeTeam"]["startXI"][:5]])
                                ax = ", ".join([p["name"] for p in m["lineups"]["awayTeam"]["startXI"][:5]])
                                e = discord.Embed(title="📋 Lineups", description=f"{m['homeTeam']['name']} vs {m['awayTeam']['name']}", color=0x00ff00)
                                e.add_field(name="Home", value=hx, inline=False)
                                e.add_field(name="Away", value=ax, inline=False)
                                await ch.send(embed=e)

# 1. SETCHANNEL
@bot.tree.command(name="setchannel", description="Set auto-post channel")
@app_commands.choices(feature=[app_commands.Choice(name="Live Scores", value="livescore"), app_commands.Choice(name="Goals", value="goals"), app_commands.Choice(name="Results", value="results"), app_commands.Choice(name="Fixtures", value="fixtures"), app_commands.Choice(name="Scorers", value="scorers"), app_commands.Choice(name="Lineups Alerts", value="lineups")])
async def setchannel(interaction: discord.Interaction, feature: app_commands.Choice[str], channel: discord.TextChannel):
    await interaction.response.defer(ephemeral=True)
    async with aiosqlite.connect("database.db") as db:
        await db.execute("INSERT OR REPLACE INTO guild_channels VALUES (?,?,?)", (interaction.guild_id, feature.value, channel.id))
        await db.commit()
    await interaction.followup.send(f"✅ {feature.name} → {channel.mention}", ephemeral=True)

# 2. SETLINEUPS
@bot.tree.command(name="setlineups", description="Subscribe to lineup alerts")
@app_commands.autocomplete(league=league_autocomplete)
async def setlineups(interaction: discord.Interaction, league: str):
    await interaction.response.defer(ephemeral=True)
    async with aiosqlite.connect("database.db") as db:
        await db.execute("INSERT OR REPLACE INTO lineup_subs VALUES (?,?)", (interaction.guild_id, league))
        await db.commit()
    await interaction.followup.send(f"✅ Subscribed to {league} lineups", ephemeral=True)

# 3. BOTINFO
@bot.tree.command(name="botinfo", description="Bot info")
async def botinfo(interaction: discord.Interaction):
    await interaction.response.defer()
    e = discord.Embed(title="GoalWire", color=0x00ff00)
    e.add_field(name="Servers", value=len(bot.guilds))
    e.add_field(name="Ping", value=f"{round(bot.latency*1000)}ms")
    await interaction.followup.send(embed=e)

# 4. LIVESCORE
@bot.tree.command(name="livescore", description="Live scores")
async def livescore(interaction: discord.Interaction):
    await interaction.response.defer()
    d = await football_api_request("matches?status=LIVE")
    e = discord.Embed(title="🔴 Live", color=0xff0000)
    for m in d.get("matches", [])[:10]:
        e.add_field(name=f"{m['homeTeam']['name']} vs {m['awayTeam']['name']}", value=f"{m['score']['fullTime']['home'] or 0}-{m['score']['fullTime']['away'] or 0}", inline=False)
    await interaction.followup.send(embed=e)

# 5. FIXTURES
@bot.tree.command(name="fixtures", description="Fixtures")
@app_commands.autocomplete(league=league_autocomplete)
async def fixtures(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    d = await football_api_request(f"competitions/{league}/matches?status=SCHEDULED")
    e = discord.Embed(title=f"{league} Fixtures", color=0x0099ff)
    for m in d.get("matches", [])[:5]:
        e.add_field(name=f"{m['homeTeam']['name']} vs {m['awayTeam']['name']}", value=m["utcDate"][:10], inline=False)
    await interaction.followup.send(embed=e)

# 6. RESULT
@bot.tree.command(name="result", description="Results")
@app_commands.autocomplete(league=league_autocomplete)
async def result(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    d = await football_api_request(f"competitions/{league}/matches?status=FINISHED")
    e = discord.Embed(title=f"{league} Results", color=0x00ff00)
    for m in d.get("matches", [])[-5:]:
        e.add_field(name=f"{m['homeTeam']['name']} vs {m['awayTeam']['name']}", value=f"{m['score']['fullTime']['home']}-{m['score']['fullTime']['away']}", inline=False)
    await interaction.followup.send(embed=e)

# 7. SCORERS
@bot.tree.command(name="scorers", description="Top scorers")
@app_commands.autocomplete(league=league_autocomplete)
async def scorers(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    d = await football_api_request(f"competitions/{league}/scorers")
    e = discord.Embed(title=f"{league} Scorers", color=0xffd700)
    for s in d.get("scorers", [])[:10]:
        e.add_field(name=s["player"]["name"], value=f"{s['team']['name']} - {s['goals']}", inline=False)
    await interaction.followup.send(embed=e)

# 8. H2H
@bot.tree.command(name="h2h", description="Head to head")
async def h2h(interaction: discord.Interaction, team1: str, team2: str):
    await interaction.response.defer()
    await interaction.followup.send(f"H2H: {team1} vs {team2} - use /team for details")

# 9. STANDINGS
@bot.tree.command(name="standings", description="Standings")
@app_commands.autocomplete(league=league_autocomplete)
async def standings(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    d = await football_api_request(f"competitions/{league}/standings")
    e = discord.Embed(title=f"{league} Table", color=0x0099ff)
    for t in d.get("standings", [{}])[0].get("table", [])[:10]:
        e.add_field(name=f"{t['position']}. {t['team']['name']}", value=f"{t['points']}pts", inline=True)
    await interaction.followup.send(embed=e)

# 10. TEAM
@bot.tree.command(name="team", description="Team info")
@app_commands.autocomplete(team=team_autocomplete)
async def team(interaction: discord.Interaction, team: str):
    await interaction.response.defer()
    tid = TEAM_IDS.get(team.lower(), 57)
    d = await football_api_request(f"teams/{tid}")
    e = discord.Embed(title=d["name"], color=0x0099ff)
    e.add_field(name="Founded", value=d.get("founded", "N/A"))
    e.set_thumbnail(url=d.get("crest"))
    await interaction.followup.send(embed=e)

# 11. TEAMSEARCH
@bot.tree.command(name="teamsearch", description="Search teams")
async def teamsearch(interaction: discord.Interaction, query: str):
    await interaction.response.defer()
    d = await football_api_request(f"teams?name={query}")
    e = discord.Embed(title=f"Results for {query}")
    for t in d.get("teams", [])[:5]:
        e.add_field(name=t["name"], value=f"ID: {t['id']}", inline=False)
    await interaction.followup.send(embed=e)

# 12. PREVIEW
@bot.tree.command(name="preview", description="Match preview")
async def preview(interaction: discord.Interaction, match: str):
    await interaction.response.defer()
    await interaction.followup.send(f"Preview: {match}")

# 13. PREDICT
@bot.tree.command(name="predict", description="Predict score")
async def predict(interaction: discord.Interaction, match: str):
    await interaction.response.defer()
    await interaction.followup.send(f"Prediction for {match}: {random.choice(['2-1','1-1','3-0'])}")

# 14. SUMMARIZE
@bot.tree.command(name="summarize", description="Summarize")
async def summarize(interaction: discord.Interaction, match: str):
    await interaction.response.defer()
    await interaction.followup.send(f"Summary for {match}")

# 15. SCOUT
@bot.tree.command(name="scout", description="Player info")
async def scout(interaction: discord.Interaction, player: str):
    await interaction.response.defer()
    await interaction.followup.send(f"Scouting {player}...")

# 16. BANTER
@bot.tree.command(name="banter", description="Banter")
async def banter(interaction: discord.Interaction):
    await interaction.response.defer()
    await interaction.followup.send(random.choice(["My grandma defends better 😂","That shot went to row Z","VAR can't save you"]))

# 17. TRIVIA
@bot.tree.command(name="trivia", description="Trivia")
async def trivia(interaction: discord.Interaction):
    await interaction.response.defer()
    uid = interaction.user.id
    if uid not in used_trivia: used_trivia[uid] = []
    avail = [i for i in range(len(TRIVIA_BANK)) if i not in used_trivia[uid]]
    if not avail: used_trivia[uid] = []; avail = list(range(len(TRIVIA_BANK)))
    q = random.choice(avail); used_trivia[uid].append(q)
    await interaction.followup.send(f"**{TRIVIA_BANK[q]['q']}**\n||{TRIVIA_BANK[q]['a']}||")

# 18. NEWS
@bot.tree.command(name="news", description="Football news")
async def news(interaction: discord.Interaction):
    await interaction.response.defer()
    await interaction.followup.send("Latest: Transfer window open!")

# 19. INJURIES
@bot.tree.command(name="injuries", description="Injury updates")
async def injuries(interaction: discord.Interaction, team: str):
    await interaction.response.defer()
    await interaction.followup.send(f"Injuries for {team}: Check official sources")

# 20. TRANSFERS
@bot.tree.command(name="transfers", description="Transfers")
async def transfers(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    await interaction.followup.send(f"Transfers for {league}")

# 21. COMPARE
@bot.tree.command(name="compare", description="Compare players")
async def compare(interaction: discord.Interaction, player1: str, player2: str):
    await interaction.response.defer()
    await interaction.followup.send(f"{player1} vs {player2}")

# 22. LINEUPS
@bot.tree.command(name="lineups", description="Get match lineups")
async def lineups(interaction: discord.Interaction, match_id: str):
    await interaction.response.defer()
    d = await football_api_request(f"matches/{match_id}")
    if "match" not in d: return await interaction.followup.send("Match not found")
    m = d["match"]
    if not m.get("lineups"): return await interaction.followup.send("Lineups not released yet")
    hx = "\n".join([p["name"] for p in m["lineups"]["homeTeam"]["startXI"]])
    ax = "\n".join([p["name"] for p in m["lineups"]["awayTeam"]["startXI"]])
    e = discord.Embed(title=f"{m['homeTeam']['name']} vs {m['awayTeam']['name']}", color=0x00ff00)
    e.add_field(name="Home XI", value=hx[:1024], inline=True)
    e.add_field(name="Away XI", value=ax[:1024], inline=True)
    await interaction.followup.send(embed=e)

# 23. HELP
@bot.tree.command(name="help", description="Help")
async def help_cmd(interaction: discord.Interaction):
    await interaction.response.defer()
    await interaction.followup.send("Commands: /team /livescore /fixtures /lineups /setlineups /trivia etc (24 total)")

# 24. PING
@bot.tree.command(name="ping", description="Ping")
async def ping(interaction: discord.Interaction):
    await interaction.response.defer()
    await interaction.followup.send(f"Pong! {round(bot.latency*1000)}ms")

bot.run(TOKEN)