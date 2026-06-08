import discord
from discord.ext import commands, tasks
from discord import app_commands
import aiosqlite
import os
import aiohttp
from openai import AsyncOpenAI
from datetime import datetime

TOKEN = os.getenv("DISCORD_TOKEN")
FOOTBALL_API_KEY = os.getenv("FOOTBALL_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

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
        await db.commit()

async def football_api_request(endpoint):
    headers = {"X-Auth-Token": FOOTBALL_API_KEY}
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"https://api.football-data.org/v4/{endpoint}", headers=headers) as resp:
                if resp.status == 200:
                    return await resp.json()
                return {"error": f"API returned {resp.status}"}
    except Exception as e:
        return {"error": str(e)}

@bot.event
async def on_ready():
    await init_db()
    print(f"Logged in as {bot.user} | SQLite DB Ready")
    try:
        synced = await bot.tree.sync()
        print(f"Synced {len(synced)} commands")
    except Exception as e:
        print(e)

# ===== ADMIN =====
@bot.tree.command(name="setchannel", description="Set channels for auto-posting features")
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
    if "error" in data:
        return await interaction.followup.send(f"❌ API Error: {data['error']}")
    
    embed = discord.Embed(title="🔴 Live Matches", color=0xff0000, timestamp=datetime.now())
    matches = data.get("matches", [])[:10]
    if not matches:
        embed.description = "No live matches right now"
    for match in matches:
        home = match["homeTeam"]["name"]
        away = match["awayTeam"]["name"]
        score = f"{match['score']['fullTime']['home'] or 0}-{match['score']['fullTime']['away'] or 0}"
        minute = match.get("minute", "?")
        embed.add_field(name=f"{home} vs {away}", value=f"Score: {score} | {minute}'", inline=False)
    await interaction.followup.send(embed=embed)

@bot.tree.command(name="fixtures", description="Get upcoming fixtures")
@app_commands.describe(league="League code: PL, BL1, SA, PD, FL1, CL, EL")
async def fixtures(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    data = await football_api_request(f"competitions/{league}/matches?status=SCHEDULED")
    if "error" in data:
        return await interaction.followup.send(f"❌ API Error: {data['error']}")
    
    embed = discord.Embed(title=f"📅 {league} Fixtures", color=0x0099ff)
    matches = data.get("matches", [])[:5]
    if not matches:
        embed.description = "No scheduled fixtures found"
    for match in matches:
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
    if "error" in data:
        return await interaction.followup.send(f"❌ API Error: {data['error']}")
    
    embed = discord.Embed(title=f"🏁 {league} Results", color=0x00ff00)
    matches = data.get("matches", [])[-5:]
    if not matches:
        embed.description = "No recent results"
    for match in matches:
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
    if "error" in data:
        return await interaction.followup.send(f"❌ API Error: {data['error']}")
    
    embed = discord.Embed(title=f"⚽ {league} Top Scorers", color=0xffd700)
    scorers_list = data.get("scorers", [])
    if not scorers_list:
        embed.description = "No scorer data available for this league yet"
        return await interaction.followup.send(embed=embed)
    
    for scorer in scorers_list[:10]:
        if "player" not in scorer:
            continue
        player = scorer["player"]["name"]
        team = scorer["team"]["name"]
        goals = scorer["goals"]
        embed.add_field(name=f"{player}", value=f"{team} - {goals} goals", inline=False)
    
    await interaction.followup.send(embed=embed)

@bot.tree.command(name="h2h", description="Head to head stats")
@app_commands.describe(team1="First team name", team2="Second team name")
async def h2h(interaction: discord.Interaction, team1: str, team2: str):
    await interaction.response.send_message(f"🔍 H2H for {team1} vs {team2} needs team IDs from API. Use /teamsearch first.", ephemeral=True)

# ===== STATS =====
@bot.tree.command(name="standings", description="League standings")
@app_commands.describe(league="League code: PL, BL1, SA, PD, FL1, CL, EL")
async def standings(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    data = await football_api_request(f"competitions/{league}/standings")
    if "error" in data:
        return await interaction.followup.send(f"❌ API Error: {data['error']}")
    
    embed = discord.Embed(title=f"📊 {league} Standings", color=0x0099ff)
    table = data.get("standings", [{}])[0].get("table", [])[:10]
    for team in table:
        pos = team["position"]
        name = team["team"]["name"]
        pts = team["points"]
        embed.add_field(name=f"{pos}. {name}", value=f"{pts} pts", inline=True)
    await interaction.followup.send(embed=embed)

@bot.tree.command(name="team", description="Get team info")
@app_commands.describe(team="Team name like 'Arsenal'")
async def team(interaction: discord.Interaction, team: str):
    await interaction.response.defer()
    # Football-data needs team ID, so we search first
    search_data = await football_api_request(f"teams?name={team}")
    if "error" in search_data or not search_data.get("teams"):
        return await interaction.followup.send(f"❌ Could not find team '{team}'")
    
    team_info = search_data["teams"][0]
    embed = discord.Embed(title=f"🔍 {team_info['name']}", color=0x0099ff)
    embed.add_field(name="Founded", value=team_info.get("founded", "N/A"))
    embed.add_field(name="Stadium", value=team_info.get("venue", "N/A"))
    embed.set_thumbnail(url=team_info.get("crest", ""))
    await interaction.followup.send(embed=embed)

@bot.tree.command(name="teamsearch", description="Search for teams")
@app_commands.describe(query="Team name to search")
async def teamsearch(interaction: discord.Interaction, query: str):
    await interaction.response.defer()
    data = await football_api_request(f"teams?name={query}")
    if "error" in data or not data.get("teams"):
        return await interaction.followup.send(f"❌ No teams found for '{query}'")
    
    embed = discord.Embed(title=f"🔍 Teams matching '{query}'", color=0x0099ff)
    for team in data["teams"][:5]:
        embed.add_field(name=team["name"], value=f"ID: {team['id']}", inline=False)
    await interaction.followup.send(embed=embed)

# ===== AI INSIGHTS =====
@bot.tree.command(name="preview", description="AI match preview")
@app_commands.describe(match="Match description: Team1 vs Team2")
async def preview(interaction: discord.Interaction, match: str):
    if not openai_client:
        return await interaction.response.send_message("❌ OpenAI API key not set", ephemeral=True)
    await interaction.response.defer()
    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": f"Give a short football match preview for {match}. Max 3 sentences."}]
        )
        await interaction.followup.send(response.choices[0].message.content)
    except Exception as e:
        await interaction.followup.send(f"❌ OpenAI error: {str(e)}")

@bot.tree.command(name="predict", description="AI match prediction")
@app_commands.describe(match="Match description: Team1 vs Team2")
async def predict(interaction: discord.Interaction, match: str):
    if not openai_client:
        return await interaction.response.send_message("❌ OpenAI API key not set", ephemeral=True)
    await interaction.response.defer()
    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": f"Predict the score for {match}. Give 2 sentences of reasoning."}]
        )
        await interaction.followup.send(response.choices[0].message.content)
    except Exception as e:
        await interaction.followup.send(f"❌ OpenAI error: {str(e)}")

@bot.tree.command(name="summarize", description="AI match summary")
@app_commands.describe(match="Match description: Team1 vs Team2")
async def summarize(interaction: discord.Interaction, match: str):
    if not openai_client:
        return await interaction.response.send_message("❌ OpenAI API key not set", ephemeral=True)
    await interaction.response.defer()
    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": f"Summarize a hypothetical {match} match in 3 bullet points."}]
        )
        await interaction.followup.send(response.choices[0].message.content)
    except Exception as e:
        await interaction.followup.send(f"❌ OpenAI error: {str(e)}")

@bot.tree.command(name="scout", description="AI player scouting report")
@app_commands.describe(player="Player name")
async def scout(interaction: discord.Interaction, player: str):
    if not openai_client:
        return await interaction.response.send_message("❌ OpenAI API key not set", ephemeral=True)
    await interaction.response.defer()
    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": f"Give a short scouting report for football player {player}. Include 2 strengths, 1 weakness. Max 4 sentences."}]
        )
        await interaction.followup.send(response.choices[0].message.content)
    except Exception as e:
        await interaction.followup.send(f"❌ OpenAI error: {str(e)}")

# ===== FANTASY PL =====
@bot.tree.command(name="fpllink", description="Link your FPL account")
async def fpllink(interaction: discord.Interaction):
    await interaction.response.send_message("🔗 FPL linking needs your team ID. Feature in development!", ephemeral=True)

@bot.tree.command(name="myfpl", description="Your FPL team")
async def myfpl(interaction: discord.Interaction):
    await interaction.response.send_message("⚽ Link your team first with /fpllink", ephemeral=True)

@bot.tree.command(name="fplplayer", description="FPL player stats")
@app_commands.describe(player="Player name")
async def fplplayer(interaction: discord.Interaction, player: str):
    await interaction.response.send_message(f"📊 FPL stats for {player} - Feature in development!", ephemeral=True)

@bot.tree.command(name="fplleague", description="FPL league standings")
async def fplleague(interaction: discord.Interaction):
    await interaction.response.send_message("🏆 FPL league standings - Feature in development!", ephemeral=True)

# ===== ALERTS =====
@bot.tree.command(name="alert", description="Manage match alerts")
@app_commands.choices(action=[
    app_commands.Choice(name="add", value="add"),
    app_commands.Choice(name="list", value="list"),
    app_commands.Choice(name="remove", value="remove")
])
async def alert(interaction: discord.Interaction, action: app_commands.Choice[str], match_id: str = None):
    if action.value == "list":
        await interaction.response.send_message("📋 Alert system in development!", ephemeral=True)
    elif action.value == "add" and match_id:
        await interaction.response.send_message(f"🔔 Alert feature coming soon! Would alert for {match_id}", ephemeral=True)
    else:
        await interaction.response.send_message("❌ Use /alert list or /alert add <match_id>", ephemeral=True)

# ===== FUN =====
@bot.tree.command(name="trivia", description="Football trivia")
async def trivia(interaction: discord.Interaction):
    if not openai_client:
        return await interaction.response.send_message("❌ OpenAI API key not set", ephemeral=True)
    await interaction.response.defer()
    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "Give me 1 hard football trivia question with the answer revealed."}]
        )
        await interaction.followup.send(response.choices[0].message.content)
    except Exception as e:
        await interaction.followup.send(f"❌ Error: {str(e)}")

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
    if not openai_client:
        return await interaction.response.send_message("❌ OpenAI API key not set", ephemeral=True)
    await interaction.response.defer()
    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
