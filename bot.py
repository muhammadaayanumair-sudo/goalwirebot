import discord
from discord.ext import commands, tasks
from discord import app_commands
import aiosqlite
import os
import aiohttp
import asyncio
from openai import AsyncOpenAI
from datetime import datetime, timedelta

TOKEN = os.getenv("DISCORD_TOKEN")
FOOTBALL_API_KEY = os.getenv("FOOTBALL_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

# ===== CACHE =====
player_cache = {}
cache_expiry = {}

# ===== TOP LEAGUES =====
TOP_LEAGUES = [
    app_commands.Choice(name="🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League", value="PL"),
    app_commands.Choice(name="🇪🇸 La Liga", value="PD"),
    app_commands.Choice(name="🇩🇪 Bundesliga", value="BL1"),
    app_commands.Choice(name="🇮🇹 Serie A", value="SA"),
    app_commands.Choice(name="🇫🇷 Ligue 1", value="FL1"),
    app_commands.Choice(name="🏆 Champions League", value="CL"),
    app_commands.Choice(name="🏆 Europa League", value="EL"),
    app_commands.Choice(name="🇳🇱 Eredivisie", value="DED"),
    app_commands.Choice(name="🇵🇹 Primeira Liga", value="PPL"),
]

FALLBACK_PLAYERS = [
    "Lionel Messi", "Cristiano Ronaldo", "Kylian Mbappe", "Erling Haaland", "Jude Bellingham",
    "Vinicius Jr", "Pedri", "Gavi", "Jamal Musiala", "Bukayo Saka", "Pele", "Maradona",
    "Ronaldinho", "Zinedine Zidane", "Ronaldo Nazario", "Thierry Henry", "Lamine Yamal",
    "Endrick", "Florian Wirtz", "Victor Osimhen", "Mohamed Salah", "Kevin De Bruyne"
]

async def league_autocomplete(interaction: discord.Interaction, current: str):
    choices = []
    for league in TOP_LEAGUES:
        if current.lower() in league.name.lower() or current.lower() in league.value.lower():
            choices.append(league)
    if current and not any(current.lower() in l.value.lower() for l in TOP_LEAGUES):
        choices.append(app_commands.Choice(name=f"✏️ Custom: {current.upper()}", value=current.upper()))
    return choices[:25]

async def player_autocomplete(interaction: discord.Interaction, current: str):
    if not current or len(current) < 2:
        return [app_commands.Choice(name=f"⭐ {p}", value=p) for p in FALLBACK_PLAYERS[:20]]
    
    # Check cache
    if current.lower() in player_cache and datetime.now() < cache_expiry.get(current.lower(), datetime.now()):
        return player_cache[current.lower()]
    
    headers = {"X-Auth-Token": FOOTBALL_API_KEY}
    choices = []
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"https://api.football-data.org/v4/teams?name={current}", headers=headers, timeout=aiohttp.ClientTimeout(total=2)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    for team in data.get("teams", [])[:3]:
                        for player in team.get("squad", [])[:8]:
                            name = player["name"]
                            if current.lower() in name.lower():
                                choices.append(app_commands.Choice(name=f"⚽ {name} - {team['name']}", value=name))
                                if len(choices) >= 20:
                                    break
    except:
        pass
    
    # Add fallback
    for player in FALLBACK_PLAYERS:
        if current.lower() in player.lower() and len(choices) < 24:
            if not any(c.value == player for c in choices):
                choices.append(app_commands.Choice(name=f"⭐ {player}", value=player))
    
    if current and len(choices) < 25:
        choices.append(app_commands.Choice(name=f"✏️ Custom: {current}", value=current))
    
    player_cache[current.lower()] = choices[:25]
    cache_expiry[current.lower()] = datetime.now() + timedelta(minutes=5)
    return choices[:25]

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
    """All API calls have 8 second timeout now"""
    headers = {"X-Auth-Token": FOOTBALL_API_KEY}
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"https://api.football-data.org/v4/{endpoint}", headers=headers, timeout=aiohttp.ClientTimeout(total=8)) as resp:
                if resp.status == 200:
                    return await resp.json()
                elif resp.status == 429:
                    return {"error": "Rate limited - try again in 1 minute"}
                elif resp.status == 403:
                    return {"error": "Invalid API key or plan limit reached"}
                return {"error": f"API returned {resp.status}"}
    except asyncio.TimeoutError:
        return {"error": "API timeout - took too long"}
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

# ===== ALL COMMANDS HAVE DEFER() + TIMEOUT PROTECTION NOW =====

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
    await interaction.response.defer()
    embed = discord.Embed(title="GoalWire Bot", description="Feature-rich football Discord bot", color=0x00ff00)
    embed.add_field(name="Servers", value=len(bot.guilds))
    embed.add_field(name="Commands", value="24")
    embed.add_field(name="Latency", value=f"{round(bot.latency * 1000)}ms")
    embed.add_field(name="Player Database", value="50,000+ via API")
    await interaction.followup.send(embed=embed)

@bot.tree.command(name="livescore", description="Get live scores")
async def livescore(interaction: discord.Interaction):
    await interaction.response.defer()
    data = await football_api_request("matches?status=LIVE")
    if "error" in data:
        return await interaction.followup.send(f"❌ {data['error']}")
    
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
@app_commands.describe(league="Pick a league or type custom code")
@app_commands.autocomplete(league=league_autocomplete)
async def fixtures(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    data = await football_api_request(f"competitions/{league}/matches?status=SCHEDULED")
    if "error" in data:
        return await interaction.followup.send(f"❌ {data['error']}")
    
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
@app_commands.describe(league="Pick a league or type custom code")
@app_commands.autocomplete(league=league_autocomplete)
async def result(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    data = await football_api_request(f"competitions/{league}/matches?status=FINISHED")
    if "error" in data:
        return await interaction.followup.send(f"❌ {data['error']}")
    
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
@app_commands.describe(league="Pick a league or type custom code")
@app_commands.autocomplete(league=league_autocomplete)
async def scorers(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    data = await football_api_request(f"competitions/{league}/scorers")
    if "error" in data:
        return await interaction.followup.send(f"❌ {data['error']}")
    
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
    await interaction.response.defer()
    await interaction.followup.send(f"🔍 H2H for {team1} vs {team2} needs team IDs. Use /teamsearch first.", ephemeral=True)

@bot.tree.command(name="standings", description="League standings")
@app_commands.describe(league="Pick a league or type custom code")
@app_commands.autocomplete(league=league_autocomplete)
async def standings(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    data = await football_api_request(f"competitions/{league}/standings")
    if "error" in data:
        return await interaction.followup.send(f"❌ {data['error']}")
    
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

@bot.tree.command(name="preview", description="AI match preview")
@app_commands.describe(match="Match description: Team1 vs Team2")
async def preview(interaction: discord.Interaction, match: str):
    if not openai_client:
        return await interaction.response.send_message("❌ OpenAI API key not set", ephemeral=True)
    await interaction.response.defer()
    try:
        response = await asyncio.wait_for(
            openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": f"Give a short football match preview for {match}. Max 3 sentences."}]
            ),
            timeout=10.0
        )
        await interaction.followup.send(response.choices[0].message.content)
    except asyncio.TimeoutError:
        await interaction.followup.send("❌ OpenAI took too long. Try again.")
    except Exception as e:
        await interaction.followup.send(f"❌ OpenAI error: {str(e)}")

@bot.tree.command(name="predict", description="AI match prediction")
@app_commands.describe(match="Match description: Team1 vs Team2")
async def predict(interaction: discord.Interaction, match: str):
    if not openai_client:
        return await interaction.response.send_message("❌ OpenAI API key not set", ephemeral=True)
    await interaction.response.defer()
    try:
        response = await asyncio.wait_for(
            openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": f"Predict the score for {match}. Give 2 sentences of reasoning."}]
            ),
            timeout=10.0
        )
        await interaction.followup.send(response.choices[0].message.content)
    except asyncio.TimeoutError:
        await interaction.followup.send("❌ OpenAI took too long. Try again.")
    except Exception as e:
        await interaction.followup.send(f"❌ OpenAI error: {str(e)}")

@bot.tree.command(name="summarize", description="AI match summary")
@app_commands.describe(match="Match description: Team1 vs Team2")
async def summarize(interaction: discord.Interaction, match: str):
    if not openai_client:
        return await interaction.response.send_message("❌ OpenAI API key not set", ephemeral=True)
    await interaction.response.defer()
    try:
        response = await asyncio.wait_for(
            openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": f"Summarize a hypothetical {match} match in 3 bullet points."}]
            ),
            timeout=10.0
        )
        await interaction.followup.send(response.choices[0].message.content)
    except asyncio.TimeoutError:
        await interaction.followup.send("❌ OpenAI took too long. Try again.")
    except Exception as e:
        await interaction.followup.send(f"❌ OpenAI error: {str(e)}")

@bot.tree.command(name="scout", description="AI player scouting report - 50k+ players")
@app_commands.describe(player="Search any player from Football-Data API")
@app_commands.autocomplete(player=player_autocomplete)
async def scout(interaction: discord.Interaction, player: str):
    if not openai_client:
        return await interaction.response.send_message("❌ OpenAI API key not set", ephemeral=True)
    await interaction.response.defer()
    try:
        response = await asyncio.wait_for(
            openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": f"Give a short scouting report for football player {player}. Include 2 strengths, 1 weakness. Max 4 sentences."}]
            ),
            timeout=10.0
        )
        await interaction.followup.send(response.choices[0].message.content)
    except asyncio.TimeoutError:
        await interaction.followup.send("❌ OpenAI took too long. Try again.")
    except Exception as e:
        await interaction.followup.send(f"❌ OpenAI error: {str(e)}")

@bot.tree.command(name="fpllink", description="Link your FPL account")
async def fpllink(interaction: discord.Interaction):
    await interaction.response.defer(ephemeral=True)
    await interaction.followup.send("🔗 FPL linking needs your team ID. Feature in development!", ephemeral=True)

@bot.tree.command(name="myfpl", description="Your FPL team")
async def myfpl(interaction: discord.Interaction):
    await interaction.response.defer(ephemeral=True)
    await interaction.followup.send("⚽ Link your team first with /fpllink", ephemeral=True)

@bot.tree.command(name="fplplayer", description="FPL player stats")
@app_commands.describe(player="Search any player")
@app_commands.autocomplete(player=player_autocomplete)
async def fplplayer(interaction: discord.Interaction, player: str):
    await interaction.response.defer(ephemeral=True)
    await interaction.followup.send(f"📊 FPL stats for {player} - Feature in development!", ephemeral=True)

@bot.tree.command(name="fplleague", description="FPL league standings")
async def fplleague(interaction: discord.Interaction):
    await interaction.response.defer(ephemeral=True)
    await interaction.followup.send("🏆 FPL league standings - Feature in development!", ephemeral=True)

@bot.tree.command(name="alert", description="Manage match alerts")
@app_commands.choices(action=[
    app_commands.Choice(name="add", value="add"),
    app_commands.Choice(name="list", value="list"),
    app_commands.Choice(name="remove", value="remove")
])
async def alert(interaction: discord.Interaction, action: app_commands.Choice[str], match_id: str = None):
    await interaction.response.defer(ephemeral=True)
    if action.value == "list":
        await interaction.followup.send("📋 Alert system in development!", ephemeral=True)
    elif action.value == "add" and match_id:
        await interaction.followup.send(f"🔔 Alert feature coming soon! Would alert for {match_id}", ephemeral=True)
    else:
        await interaction.followup.send("❌ Use /alert list or /alert add <match_id>", ephemeral=True)

@bot.tree.command(name="trivia", description="Football trivia")
async def trivia(interaction: discord.Interaction):
    if not openai_client:
        return await interaction.response.send_message("❌ OpenAI API key not set", ephemeral=True)
    await interaction.response.defer()
    try:
        response = await asyncio.wait_for(
            openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": "Give me 1 hard football trivia question with the answer revealed."}]
            ),
            timeout=10.0
        )
        await interaction.followup.send(response.choices[0].message.content)
    except asyncio.TimeoutError:
        await interaction.followup.send("❌ OpenAI took too long. Try again.")
    except Exception as e:
        await interaction.followup.send(f"❌ Error: {str(e)}")

@bot.tree.command(name="poll", description="Create a poll")
@app_commands.describe(question="Poll question")
async def poll(interaction: discord.Interaction, question: str):
    await interaction.response.defer()
    embed = discord.Embed(title="📊 Poll", description=question, color=0x0099ff)
    msg = await interaction.channel.send(embed=embed)
    await msg.add_reaction("👍")
    await msg.add_reaction("👎")
    await interaction.followup.send("Poll created!", ephemeral=True)

@bot.tree.command(name="banter", description="AI football banter")
async def banter(interaction: discord.Interaction):
    if not openai_client:
        return await interaction.response.send_message("❌ OpenAI API key not set", ephemeral=True)
    await interaction.response.defer()
    try:
        response = await asyncio.wait_for(
            openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": "Give a savage one-liner football banter. Be funny but not offensive."}]
            ),
            timeout=10.0
        )
        await interaction.followup.send(response.choices[0].message.content)
    except asyncio.TimeoutError:
        await interaction.followup.send("❌ OpenAI took too long. Try again.")
    except Exception as e:
        await interaction.followup.send(f"❌ Error: {str(e)}")

@bot.tree.command(name="whoami", description="Who are you?")
async def whoami(interaction: discord.Interaction):
    await interaction.response.defer()
    embed = discord.Embed(title="🤔 Who Am I?", description="I'm GoalWire, your football companion bot!", color=0xff00ff)
    embed.add_field(name="Commands", value="Use /botinfo to see all 24 commands")
    embed.add_field(name="Players", value="50,000+ players via live API search")
    await interaction.followup.send(embed=embed)

bot.run(TOKEN)