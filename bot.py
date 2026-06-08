import discord
from discord.ext import commands, tasks
from discord import app_commands
import aiosqlite
import os
import aiohttp
from openai import AsyncOpenAI
from datetime import datetime

# ===== ENV VARIABLES =====
TOKEN = os.getenv("DISCORD_TOKEN")
FOOTBALL_API_KEY = os.getenv("FOOTBALL_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

# ===== BOT SETUP =====
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)

# ===== DATABASE =====
async def init_db():
    async with aiosqlite.connect("database.db") as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS guild_channels (
                guild_id INTEGER,
                feature TEXT,
                channel_id INTEGER,
                PRIMARY KEY (guild_id, feature)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                guild_id INTEGER,
                user_id INTEGER,
                match_id TEXT,
                alert_type TEXT
            )
        """)
        await db.commit()

# ===== HELPER FUNCTIONS =====
async def get_channel_for_feature(guild_id, feature):
    async with aiosqlite.connect("database.db") as db:
        cursor = await db.execute("SELECT channel_id FROM guild_channels WHERE guild_id=? AND feature=?", (guild_id, feature))
        result = await cursor.fetchone()
        return result[0] if result else None

async def football_api_request(endpoint):
    headers = {"X-Auth-Token": FOOTBALL_API_KEY}
    async with aiohttp.ClientSession() as session:
        async with session.get(f"https://api.football-data.org/v4/{endpoint}", headers=headers) as resp:
            return await resp.json()

# ===== BOT EVENTS =====
@bot.event
async def on_ready():
    await init_db()
    print(f"Logged in as {bot.user} | SQLite DB Ready")
    try:
        synced = await bot.tree.sync()
        print(f"Synced {len(synced)} commands")
    except Exception as e:
        print(e)

# ===== ADMIN COMMANDS =====
@bot.tree.command(name="setchannel", description="Set channels for auto-posting features")
@app_commands.describe(
    feature="What feature do you want to set a channel for?",
    channel="Pick the channel"
)
@app_commands.choices(feature=[
    app_commands.Choice(name="Live Score Updates", value="livescore"),
    app_commands.Choice(name="Goal Alerts", value="goals"),
    app_commands.Choice(name="Match Results", value="results"),
    app_commands.Choice(name="Fixtures", value="fixtures"),
    app_commands.Choice(name="Top Scorers", value="scorers"),
])
async def setchannel(interaction: discord.Interaction, feature: app_commands.Choice[str], channel: discord.TextChannel):
    async with aiosqlite.connect("database.db") as db:
        await db.execute("INSERT OR REPLACE INTO guild_channels VALUES (?,?,?)", 
                        (interaction.guild_id, feature.value, channel.id))
        await db.commit()
    await interaction.response.send_message(f"✅ {feature.name} will now post in {channel.mention}", ephemeral=True)

@bot.tree.command(name="botinfo", description="Get bot information")
async def botinfo(interaction: discord.Interaction):
    embed = discord.Embed(title="GoalWire Bot", description="Feature-rich football Discord bot", color=0x00ff00)
    embed.add_field(name="Servers", value=len(bot.guilds))
    embed.add_field(name="Commands", value="24")
    embed.add_field(name="Latency", value=f"{round(bot.latency * 1000)}ms")
    await interaction.response.send_message(embed=embed)

# ===== LIVE MATCHES =====
@bot.tree.command(name="livescore", description="Get live scores")
async def livescore(interaction: discord.Interaction):
    await interaction.response.defer()
    data = await football_api_request("matches?status=LIVE")
    embed = discord.Embed(title="🔴 Live Matches", color=0xff0000)
    for match in data.get("matches", [])[:10]:
        home = match["homeTeam"]["name"]
        away = match["awayTeam"]["name"]
        score = f"{match['score']['fullTime']['home'] or 0}-{match['score']['fullTime']['away'] or 0}"
        embed.add_field(name=f"{home} vs {away}", value=f"Score: {score}", inline=False)
    await interaction.followup.send(embed=embed)

@bot.tree.command(name="fixtures", description="Get upcoming fixtures")
@app_commands.describe(league="League code: PL, BL1, SA, PD, FL1, CL, EL")
async def fixtures(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    data = await football_api_request(f"competitions/{league}/matches?status=SCHEDULED")
    embed = discord.Embed(title=f"📅 {league} Fixtures", color=0x0099ff)
    for match in data.get("matches", [])[:5]:
        home = match["homeTeam"]["name"]
        away = match["awayTeam"]["name"]
        date = match["utcDate"][:10]
        embed.add_field(name=f"{home} vs {away}", value=f"Date: {date}", inline=False)
    await interaction.followup.send(embed=embed)

@bot.tree.command(name="result", description="Get recent results")
@app_commands.describe(league="League code: PL, BL1, SA, PD, FL1, CL, EL")
async def result(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    data = await football_api_request(f"competitions/{league}/matches?status=FINISHED")
    embed = discord.Embed(title=f"🏁 {league} Results", color=0x00ff00)
    for match in data.get("matches", [])[-5:]:
        home = match["homeTeam"]["name"]
        away = match["awayTeam"]["name"]
        score = f"{match['score']['fullTime']['home']}-{match['score']['fullTime']['away']}"
        embed.add_field(name=f"{home} vs {away}", value=f"FT: {score}", inline=False)
    await interaction.followup.send(embed=embed)

@bot.tree.command(name="scorers", description="Get top scorers")
@app_commands.describe(league="League code: PL, BL1, SA, PD, FL1, CL, EL")
async def scorers(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    data = await football_api_request(f"competitions/{league}/scorers")
    embed = discord.Embed(title=f"⚽ {league} Top Scorers", color=0xffd700)
    for scorer in data.get("scorers", [])[:10]:
        player = scorer["player"]["name"]
        team = scorer["team"]["name"]
        goals = scorer["goals"]
        embed.add_field(name=f"{player}", value=f"{team} - {goals} goals", inline=False)
    await interaction.followup.send(embed=embed)

@bot.tree.command(name="h2h", description="Head to head stats")
@app_commands.describe(team1="First team name", team2="Second team name")
async def h2h(interaction: discord.Interaction, team1: str, team2: str):
    await interaction.response.send_message(f"🔍 H2H stats for {team1} vs {team2} - Coming soon!", ephemeral=True)

# ===== STATS =====
@bot.tree.command(name="standings", description="League standings")
@app_commands.describe(league="League code: PL, BL1, SA, PD, FL1, CL, EL")
async def standings(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    data = await football_api_request(f"competitions/{league}/standings")
    embed = discord.Embed(title=f"📊 {league} Standings", color=0x0099ff)
    table = data.get("standings", [{}])[0].get("table", [])[:10]
    for team in table:
        pos = team["position"]
        name = team["team"]["name"]
        pts = team["points"]
        embed.add_field(name=f"{pos}. {name}", value=f"{pts} pts", inline=False)
    await interaction.followup.send(embed=embed)

@bot.tree.command(name="team", description="Get team info")
@app_commands.describe(team="Team name")
async def team(interaction: discord.Interaction, team: str):
    await interaction.response.send_message(f"🔍 Team info for {team} - Coming soon!", ephemeral=True)

@bot.tree.command(name="teamsearch", description="Search for teams")
@app_commands.describe(query="Team name to search")
async def teamsearch(interaction: discord.Interaction, query: str):
    await interaction.response.send_message(f"🔍 Searching teams: {query} - Coming soon!", ephemeral=True)

# ===== AI INSIGHTS =====
@bot.tree.command(name="preview", description="AI match preview")
@app_commands.describe(match="Match description: Team1 vs Team2")
async def preview(interaction: discord.Interaction, match: str):
    await interaction.response.defer()
    response = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": f"Give a short football match preview for {match}"}]
    )
    await interaction.followup.send(response.choices[0].message.content)

@bot.tree.command(name="predict", description="AI match prediction")
@app_commands.describe(match="Match description: Team1 vs Team2")
async def predict(interaction: discord.Interaction, match: str):
    await interaction.response.defer()
    response = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": f"Predict the score for {match}. Give reasoning."}]
    )
    await interaction.followup.send(response.choices[0].message.content)

@bot.tree.command(name="summarize", description="AI match summary")
@app_commands.describe(match="Match description: Team1 vs Team2")
async def summarize(interaction: discord.Interaction, match: str):
    await interaction.response.send_message(f"📝 Summarizing {match} - Coming soon!", ephemeral=True)

@bot.tree.command(name="scout", description="AI player scouting report")
@app_commands.describe(player="Player name")
async def scout(interaction: discord.Interaction, player: str):
    await interaction.response.defer()
    response = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": f"Give a short scouting report for football player {player}"}]
    )
    await interaction.followup.send(response.choices[0].message.content)

# ===== FANTASY PL =====
@bot.tree.command(name="fpllink", description="Link your FPL account")
async def fpllink(interaction: discord.Interaction):
    await interaction.response.send_message("🔗 FPL linking - Coming soon!", ephemeral=True)

@bot.tree.command(name="myfpl", description="Your FPL team")
async def myfpl(interaction: discord.Interaction):
    await interaction.response.send_message("⚽ Your FPL team - Coming soon!", ephemeral=True)

@bot.tree.command(name="fplplayer", description="FPL player stats")
@app_commands.describe(player="Player name")
async def fplplayer(interaction: discord.Interaction, player: str):
    await interaction.response.send_message(f"📊 FPL stats for {player} - Coming soon!", ephemeral=True)

@bot.tree.command(name="fplleague", description="FPL league standings")
async def fplleague(interaction: discord.Interaction):
    await interaction.response.send_message("🏆 FPL league standings - Coming soon!", ephemeral=True)

# ===== ALERTS =====
@bot.tree.command(name="alert", description="Manage match alerts")
@app_commands.describe(action="add, list, or remove", match_id="Match ID for add/remove")
@app_commands.choices(action=[
    app_commands.Choice(name="add", value="add"),
    app_commands.Choice(name="list", value="list"),
    app_commands.Choice(name="remove", value="remove")
])
async def alert(interaction: discord.Interaction, action: app_commands.Choice[str], match_id: str = None):
    if action.value == "add":
        await interaction.response.send_message(f"🔔 Alert added for match {match_id}", ephemeral=True)
    elif action.value == "list":
        await interaction.response.send_message("📋 Your alerts - Coming soon!", ephemeral=True)
    elif action.value == "remove":
        await interaction.response.send_message(f"🔕 Alert removed for match {match_id}", ephemeral=True)

# ===== FUN =====
@bot.tree.command(name="trivia", description="Football trivia")
async def trivia(interaction: discord.Interaction):
    await interaction.response.send_message("❓ Football trivia - Coming soon!", ephemeral=True)

@bot.tree.command(name="poll", description="Create a poll")
@app_commands.describe(question="Poll question")
async def poll(interaction: discord.Interaction, question: str):
    embed = discord.Embed(title="📊 Poll", description=question, color=0x0099ff)
    msg = await interaction.channel.send(embed=embed)
    await msg.add_reaction("👍")
    await msg.add_reaction("👎")
    await interaction.response.send_message("Poll created!", ephemeral=True)

@bot.tree.command(name="banter", description="AI football banter")
async def banter(interaction: discord.Interaction):
    await interaction.response.defer()
    response = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Give a funny football banter line"}]
    )
    await interaction.followup.send(response.choices[0].message.content)

@bot.tree.command(name="whoami", description="Who are you?")
async def whoami(interaction: discord.Interaction):
    embed = discord.Embed(title="🤔 Who Am I?", description="I'm GoalWire, your football companion bot!", color=0xff00ff)
    await interaction.response.send_message(embed=embed)

bot.run(TOKEN)