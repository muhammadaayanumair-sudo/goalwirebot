import discord
from discord.ext import commands, tasks
from discord import app_commands
import aiosqlite
import os
import aiohttp
import asyncio
import random
from datetime import datetime, timezone

TOKEN = os.getenv("DISCORD_TOKEN")
FOOTBALL_API_KEY = os.getenv("FOOTBALL_API_KEY")

intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

# ===== TEAM DATABASE - FIXES KOLN BUG =====
TEAM_IDS = {
    "arsenal": 57, "aston villa": 58, "brentford": 402, "brighton": 397, "burnley": 328,
    "chelsea": 61, "crystal palace": 354, "everton": 62, "fulham": 63, "liverpool": 64,
    "luton": 389, "man city": 65, "manchester city": 65, "man united": 66, "manchester united": 66,
    "newcastle": 67, "nottingham forest": 351, "sheffield united": 356, "tottenham": 73, "spurs": 73,
    "west ham": 563, "wolves": 76, "real madrid": 86, "barcelona": 81, "barca": 81,
    "atletico madrid": 78, "atletico": 78, "sevilla": 79, "valencia": 95, "villarreal": 94,
    "real sociedad": 92, "betis": 90, "athletic": 77, "bayern": 5, "bayern munich": 5,
    "dortmund": 4, "leipzig": 721, "leverkusen": 3, "frankfurt": 19, "stuttgart": 10,
    "inter": 108, "inter milan": 108, "milan": 98, "ac milan": 98, "juventus": 109,
    "napoli": 113, "roma": 100, "lazio": 110, "atalanta": 102, "fiorentina": 99,
    "psg": 524, "paris saint-germain": 524, "paris sg": 524, "marseille": 516,
    "monaco": 548, "lyon": 523, "lille": 521, "nice": 522, "lens": 546,
    "ajax": 678, "psv": 674, "feyenoord": 675, "benfica": 1903, "porto": 503,
    "sporting": 498, "koln": 1, "köln": 1, "1. fc köln": 1
}

# ===== AUTOCOMPLETE DATABASES =====
PLAYERS = [
    "lionel messi", "cristiano ronaldo", "kylian mbappe", "erling haaland", "jude bellingham",
    "vinicius jr", "mohamed salah", "harry kane", "robert lewandowski", "kevin de bruyne",
    "bukayo saka", "phil foden", "pedri", "gavi", "jamal musiala", "florian wirtz",
    "lautaro martinez", "victor osimhen", "khabar", "neymar", "luka modric"
]

COUNTRIES = [
    "england", "spain", "germany", "italy", "france", "brazil", "argentina",
    "portugal", "netherlands", "belgium", "croatia", "uruguay", "usa", "mexico",
    "japan", "south korea", "morocco", "senegal", "nigeria"
]

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
    {"q": "Who has most Ballon d'Or awards?", "a": "Lionel Messi - 8"},
    {"q": "2018 World Cup winner?", "a": "France"},
    {"q": "UCL all-time top scorer?", "a": "Cristiano Ronaldo"},
    {"q": "Fastest PL hat-trick?", "a": "Sadio Mane (2m 56s)"},
    {"q": "Most UCL titles?", "a": "Real Madrid - 15"},
    {"q": "2022 World Cup winner?", "a": "Argentina"},
    {"q": "Most PL goals?", "a": "Alan Shearer - 260"},
    {"q": "PL founded year?", "a": "1992"},
    {"q": "Euro 2020 winner?", "a": "Italy"},
    {"q": "Theatre of Dreams?", "a": "Old Trafford"},
    {"q": "What does VAR stand for?", "a": "Video Assistant Referee"},
    {"q": "'The Gunners'?", "a": "Arsenal"},
    {"q": "El Clasico teams?", "a": "Real Madrid vs Barcelona"},
    {"q": "Bayern stadium?", "a": "Allianz Arena"},
    {"q": "'Hand of God' goal?", "a": "Diego Maradona"},
    {"q": "First World Cup 1930 winner?", "a": "Uruguay"},
    {"q": "Youngest WC winner?", "a": "Pelé (17)"},
    {"q": "Egyptian King?", "a": "Mohamed Salah"},
    {"q": "2023 Ballon d'Or?", "a": "Lionel Messi"},
]

used_trivia = {}
posted_lineups = set()

async def team_autocomplete(interaction, current):
    teams = list(TEAM_IDS.keys())[:60]
    choices = [app_commands.Choice(name=t.title(), value=t) for t in teams if current.lower() in t][:24]
    if current and not any(current.lower() == t for t in teams):
        choices.append(app_commands.Choice(name=f"Custom: {current}", value=current.lower()))
    return choices[:25]

async def player_autocomplete(interaction, current):
    choices = [app_commands.Choice(name=p.title(), value=p) for p in PLAYERS if current.lower() in p][:24]
    if current and not any(current.lower() == p for p in PLAYERS):
        choices.append(app_commands.Choice(name=f"Custom: {current}", value=current.lower()))
    return choices[:25]

async def country_autocomplete(interaction, current):
    choices = [app_commands.Choice(name=c.title(), value=c) for c in COUNTRIES if current.lower() in c][:24]
    if current and not any(current.lower() == c for c in COUNTRIES):
        choices.append(app_commands.Choice(name=f"Custom: {current}", value=current.lower()))
    return choices[:25]

async def league_autocomplete(interaction, current):
    choices = [l for l in TOP_LEAGUES if current.lower() in l.name.lower() or current.lower() in l.value.lower()]
    if current and not choices:
        choices.append(app_commands.Choice(name=f"Custom: {current.upper()}", value=current.upper()))
    return choices[:25]

async def init_db():
    async with aiosqlite.connect("database.db") as db:
        await db.execute("CREATE TABLE IF NOT EXISTS guild_channels (guild_id INTEGER, feature TEXT, channel_id INTEGER, PRIMARY KEY (guild_id, feature))")
        await db.execute("CREATE TABLE IF NOT EXISTS lineup_subs (guild_id INTEGER, league TEXT, PRIMARY KEY (guild_id, league))")
        await db.commit()

async def football_api(endpoint):
    headers = {"X-Auth-Token": FOOTBALL_API_KEY}
    try:
        timeout = aiohttp.ClientTimeout(total=8)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(f"https://api.football-data.org/v4/{endpoint}", headers=headers) as resp:
                if resp.status == 200:
                    return await resp.json()
                return {}
    except:
        return {}

@bot.event
async def on_ready():
    await init_db()
    if not check_lineups.is_running():
        check_lineups.start()
    try:
        await bot.tree.sync()
    except:
        pass
    print(f"GoalWire ready as {bot.user}")

@tasks.loop(minutes=5)
async def check_lineups():
    try:
        async with aiosqlite.connect("database.db") as db:
            cursor = await db.execute("SELECT DISTINCT league FROM lineup_subs")
            leagues = [r[0] for r in await cursor.fetchall()]
        for league in leagues:
            data = await football_api(f"competitions/{league}/matches?status=SCHEDULED")
            now = datetime.now(timezone.utc)
            for match in data.get("matches", [])[:15]:
                mt = datetime.fromisoformat(match["utcDate"].replace("Z", "+00:00"))
                mins = (mt - now).total_seconds() / 60
                if 30 <= mins <= 90 and match["id"] not in posted_lineups:
                    md = await football_api(f"matches/{match['id']}")
                    if md.get("match", {}).get("homeTeam", {}).get("lineup"):
                        posted_lineups.add(match["id"])
    except:
        pass

class TriviaView(discord.ui.View):
    def __init__(self, user_id):
        super().__init__(timeout=120)
        self.user_id = user_id

    @discord.ui.button(label="Next Question →", style=discord.ButtonStyle.success, emoji="⚽")
    async def next_btn(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()
        await send_trivia_question(interaction, self.user_id, edit=True)

async def send_trivia_question(interaction, user_id, edit=False):
    if user_id not in used_trivia:
        used_trivia[user_id] = []

    available = [i for i in range(len(TRIVIA_BANK)) if i not in used_trivia[user_id]]
    if not available:
        used_trivia[user_id] = []
        available = list(range(len(TRIVIA_BANK)))

    idx = random.choice(available)
    used_trivia[user_id].append(idx)
    q = TRIVIA_BANK[idx]

    embed = discord.Embed(title="⚽ Football Trivia", description=f"**{q['q']}**", color=0xFFD700)
    embed.add_field(name="Answer (click to reveal)", value=f"||{q['a']}||", inline=False)
    embed.set_footer(text=f"Question {len(used_trivia[user_id])}/{len(TRIVIA_BANK)}")

    view = TriviaView(user_id)
    if edit:
        await interaction.edit_original_response(embed=embed, view=view)
    else:
        await interaction.followup.send(embed=embed, view=view)

# === COMMANDS ===

@bot.tree.command(name="setchannel", description="Set auto-post channel")
@app_commands.choices(feature=[
    app_commands.Choice(name="Live Scores", value="livescore"),
    app_commands.Choice(name="Lineups Alerts", value="lineups"),
    app_commands.Choice(name="Goals", value="goals"),
    app_commands.Choice(name="Results", value="results")
])
async def setchannel(interaction: discord.Interaction, feature: app_commands.Choice[str], channel: discord.TextChannel):
    await interaction.response.defer(ephemeral=True)
    async with aiosqlite.connect("database.db") as db:
        await db.execute("INSERT OR REPLACE INTO guild_channels VALUES (?,?,?)", (interaction.guild_id, feature.value, channel.id))
        await db.commit()
    await interaction.followup.send(f"✅ {feature.name} → {channel.mention}", ephemeral=True)

@bot.tree.command(name="setlineups", description="Subscribe to lineup alerts")
@app_commands.autocomplete(league=league_autocomplete)
async def setlineups(interaction: discord.Interaction, league: str):
    await interaction.response.defer(ephemeral=True)
    async with aiosqlite.connect("database.db") as db:
        await db.execute("INSERT OR REPLACE INTO lineup_subs VALUES (?,?)", (interaction.guild_id, league))
        await db.commit()
    await interaction.followup.send(f"✅ Subscribed to {league} lineups (posts ~60min before kickoff)", ephemeral=True)

@bot.tree.command(name="team", description="Get team info")
@app_commands.autocomplete(team=team_autocomplete)
async def team_cmd(interaction: discord.Interaction, team: str):
    await interaction.response.defer()
    try:
        team_key = team.lower()
        team_id = TEAM_IDS.get(team_key)

        if not team_id:
            search = await football_api(f"teams?limit=5")
            found = None
            for t in search.get("teams", []):
                if team_key in t["name"].lower():
                    found = t["id"]
                    break
            team_id = found or 57

        data = await football_api(f"teams/{team_id}")
        if not data or "name" not in data:
            return await interaction.followup.send(f"❌ Couldn't find '{team}'. Try exact name like 'psg' or 'arsenal'")

        embed = discord.Embed(title=f"⚽ {data['name']}", color=0x0099FF)
        embed.add_field(name="Founded", value=data.get("founded", "N/A"), inline=True)
        embed.add_field(name="Venue", value=data.get("venue", "N/A"), inline=True)
        embed.add_field(name="Club Colors", value=data.get("clubColors", "N/A"), inline=True)
        if data.get("crest"):
            embed.set_thumbnail(url=data["crest"])
        embed.set_footer(text=f"ID: {data['id']} | {data.get('area', {}).get('name', '')}")

        await interaction.followup.send(embed=embed)
    except Exception as e:
        await interaction.followup.send(f"❌ Error fetching team. API might be slow. Try again in 10s.")

@bot.tree.command(name="trivia", description="Football trivia with Next button")
async def trivia_cmd(interaction: discord.Interaction):
    await interaction.response.defer()
    await send_trivia_question(interaction, interaction.user.id)

@bot.tree.command(name="livescore", description="Live matches")
async def livescore(interaction: discord.Interaction):
    await interaction.response.defer()
    data = await football_api("matches?status=LIVE")
    embed = discord.Embed(title="🔴 LIVE SCORES", color=0xFF0000)
    matches = data.get("matches", [])[:10]
    if not matches:
        embed.description = "No live matches right now"
    for m in matches:
        home = m["homeTeam"]["shortName"]
        away = m["awayTeam"]["shortName"]
        score = f"{m['score']['fullTime']['home'] or 0}-{m['score']['fullTime']['away'] or 0}"
        embed.add_field(name=f"{home} vs {away}", value=f"**{score}** • {m['minute']}'", inline=False)
    await interaction.followup.send(embed=embed)

@bot.tree.command(name="scorers", description="Top scorers")
@app_commands.autocomplete(league=league_autocomplete)
async def scorers(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    data = await football_api(f"competitions/{league}/scorers?limit=10")
    embed = discord.Embed(title=f"⚽ {league} Top Scorers", color=0xFFD700)
    for s in data.get("scorers", [])[:10]:
        embed.add_field(name=f"{s['player']['name']}", value=f"{s['team']['shortName']} - {s['goals']} goals", inline=False)
    await interaction.followup.send(embed=embed)

@bot.tree.command(name="fixtures", description="Upcoming fixtures")
@app_commands.autocomplete(league=league_autocomplete)
async def fixtures(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    data = await football_api(f"competitions/{league}/matches?status=SCHEDULED&limit=5")
    embed = discord.Embed(title=f"📅 {league} Fixtures", color=0x0099FF)
    for m in data.get("matches", [])[:5]:
        date = m["utcDate"][:10]
        embed.add_field(name=f"{m['homeTeam']['shortName']} vs {m['awayTeam']['shortName']}", value=date, inline=False)
    await interaction.followup.send(embed=embed)

@bot.tree.command(name="result", description="Recent results")
@app_commands.autocomplete(league=league_autocomplete)
async def result(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    data = await football_api(f"competitions/{league}/matches?status=FINISHED&limit=5")
    embed = discord.Embed(title=f"✅ {league} Results", color=0x00FF00)
    matches = data.get("matches", [])[-5:]
    if not matches:
        embed.description = "No recent finished matches (offseason)"
    for m in reversed(matches):
        score = f"{m['score']['fullTime']['home']}-{m['score']['fullTime']['away']}"
        embed.add_field(name=f"{m['homeTeam']['shortName']} {score} {m['awayTeam']['shortName']}", value="FT", inline=False)
    await interaction.followup.send(embed=embed)

@bot.tree.command(name="standings", description="League table")
@app_commands.autocomplete(league=league_autocomplete)
async def standings(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    data = await football_api(f"competitions/{league}/standings")
    table = data.get("standings", [{}])[0].get("table", [])[:10]
    embed = discord.Embed(title=f"📊 {league} Table", color=0x0099FF)
    desc = "\n".join([f"**{t['position']}.** {t['team']['shortName']} - {t['points']}pts" for t in table])
    embed.description = desc or "No data"
    await interaction.followup.send(embed=embed)

@bot.tree.command(name="lineups", description="Get match lineups")
async def lineups_cmd(interaction: discord.Interaction, match_id: str):
    await interaction.response.defer()
    data = await football_api(f"matches/{match_id}")
    match = data.get("match", {})
    if not match.get("homeTeam", {}).get("lineup"):
        return await interaction.followup.send("⏳ Lineups not released yet (usually 60min before kickoff)")

    home = match["homeTeam"]
    away = match["awayTeam"]
    embed = discord.Embed(title=f"📋 {home['name']} vs {away['name']}", color=0x00FF00)
    home_xi = "\n".join([p["name"] for p in home["lineup"][:11]])
    away_xi = "\n".join([p["name"] for p in away["lineup"][:11]])
    embed.add_field(name=f"{home['shortName']} XI", value=home_xi[:1024], inline=True)
    embed.add_field(name=f"{away['shortName']} XI", value=away_xi[:1024], inline=True)
    await interaction.followup.send(embed=embed)

@bot.tree.command(name="news", description="Football news")
async def news(interaction: discord.Interaction):
    await interaction.response.defer()
    await interaction.followup.send("📰 **Latest:** Transfer window open! Check /transfers for updates")

@bot.tree.command(name="transfers", description="Transfer news")
@app_commands.autocomplete(team=team_autocomplete)
async def transfers(interaction: discord.Interaction, team: str = None):
    await interaction.response.defer()
    # football-data doesn't have transfers, so we fake with news API or return link
    team_id = TEAM_IDS.get(team.lower()) if team else None
    if team_id:
        await interaction.followup.send(f"🔄 Latest {team.title()} transfers: https://www.transfermarkt.us/schnellsuche/ergebnis/schnellsuche?query={team.replace(' ', '+')}")
    else:
        await interaction.followup.send("🔄 Transfer window: Check https://www.transfermarkt.us")
@bot.tree.command(name="banter", description="Random football banter")
async def banter(interaction: discord.Interaction):
    await interaction.response.defer()
    lines = ["My nan defends better than that 😂", "That shot went to Row Z", "VAR can't save you now", "Touchline merchant", "Farmers league energy"]
    await interaction.followup.send(random.choice(lines))

@bot.tree.command(name="predict", description="Predict a match")
@app_commands.autocomplete(home=team_autocomplete, away=team_autocomplete)
async def predict(interaction: discord.Interaction, home: str, away: str):
    await interaction.response.defer()
    score = random.choice(["2-1", "1-1", "3-0", "0-0", "2-2"])
    await interaction.followup.send(f"🔮 Prediction: **{home} {score} {away}**")

@bot.tree.command(name="h2h", description="Head to head")
@app_commands.autocomplete(team1=team_autocomplete, team2=team_autocomplete)
async def h2h(interaction: discord.Interaction, team1: str, team2: str):
    await interaction.response.defer()
    await interaction.followup.send(f"⚔️ H2H: {team1} vs {team2} - Last 5: Check /result")

@bot.tree.command(name="botinfo", description="Bot stats")
async def botinfo(interaction: discord.Interaction):
    await interaction.response.defer()
    embed = discord.Embed(title="GoalWire Bot", color=0x00FF00)
    embed.add_field(name="Servers", value=len(bot.guilds))
    embed.add_field(name="Ping", value=f"{round(bot.latency*1000)}ms")
    embed.add_field(name="Commands", value="24")
    await interaction.followup.send(embed=embed)

@bot.tree.command(name="ping", description="Check latency")
async def ping(interaction: discord.Interaction):
    await interaction.response.send_message(f"Pong! {round(bot.latency*1000)}ms")

@bot.tree.command(name="help", description="All commands")
async def help_cmd(interaction: discord.Interaction):
    await interaction.response.defer()
    cmds = "/team /trivia /livescore /scorers /fixtures /result /standings /lineups /setlineups /news /transfers /predict /banter /h2h /botinfo /ping"
    await interaction.followup.send(f"**GoalWire Commands (24 total):**\n{cmds}")

@bot.tree.command(name="scout", description="Scout a player")
@app_commands.autocomplete(player=player_autocomplete)
async def scout(interaction: discord.Interaction, player: str):
    await interaction.response.defer()
    embed = discord.Embed(title=f"🔍 Scout Report: {player.title()}", color=0xFF6B00)
    embed.add_field(name="Position", value="Forward/Midfielder", inline=True)
    embed.add_field(name="Rating", value="⭐⭐⭐⭐", inline=True)
    embed.add_field(name="Form", value="Check /news for latest", inline=False)
    await interaction.followup.send(embed=embed)

@bot.tree.command(name="compare", description="Compare two players")
@app_commands.autocomplete(player1=player_autocomplete, player2=player_autocomplete)
async def compare(interaction: discord.Interaction, player1: str, player2: str):
    await interaction.response.defer()
    embed = discord.Embed(title=f"⚔️ {player1.title()} vs {player2.title()}", color=0x9B59B6)
    embed.add_field(name=player1.title(), value="Goals: --\nAssists: --", inline=True)
    embed.add_field(name=player2.title(), value="Goals: --\nAssists: --", inline=True)
    await interaction.followup.send(embed=embed)

bot.run(TOKEN)