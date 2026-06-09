import discord
from discord.ext import commands, tasks
from discord import app_commands
import aiohttp
import asyncio
from datetime import datetime, timezone
import os
import json
import random

TOKEN = os.getenv("DISCORD_TOKEN")
API_KEY = os.getenv("API_FOOTBALL_KEY")
NEWS_KEY = os.getenv("NEWS_API_KEY")

intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

API_URL = "https://v3.football.api-sports.io"
HEADERS = {"x-apisports-key": API_KEY}

last_transfer_ids = set()
last_match_ids = set()
predictions_file = "predictions.json"
CURRENT_SEASON = 2025

BANTER_LINES = [
    "United winning the league? Check VAR.",
    "xG merchants at it again.",
    "Touch grass and defend a corner.",
    "Farmers league allegations incoming.",
    "Rent free in your head since 2012.",
    "Pep roulette victim #847291.",
    "Spursy is a lifestyle.",
    "Park the bus? More like park the tractor."
]

def embed_reply(title: str = None, desc: str = None, color: int = 0x3498db):
    e = discord.Embed(color=color)
    if title: e.title = title
    if desc: e.description = desc
    return e

class PlayerButton(discord.ui.Button):
    def __init__(self, player_id: int, label: str, fixture_id: int = 0):
        super().__init__(label=label, style=discord.ButtonStyle.secondary, custom_id=f"player_{player_id}_{fixture_id}")
        self.player_id = player_id

    async def callback(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        embed = await get_player_card(self.player_id)
        await interaction.followup.send(embed=embed, ephemeral=True)

class PlayerView(discord.ui.View):
    def __init__(self, players: list, fixture_id: int = 0):
        super().__init__(timeout=300)
        for p in players[:25]:
            self.add_item(PlayerButton(p['id'], f"{p['number']} {p['name']}", fixture_id))

async def api_get(endpoint: str, params: dict = {}):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{API_URL}/{endpoint}", headers=HEADERS, params=params, timeout=10) as r:
                if r.status!= 200: return {"response": []}
                return await r.json()
    except:
        return {"response": []}

async def check_season_active(league_id: int):
    data = await api_get("leagues", {"id": league_id, "current": "true"})
    return bool(data.get('response'))

async def get_player_card(player_id: int):
    data = await api_get("players", {"id": player_id, "season": CURRENT_SEASON})
    if not data.get('response'):
        return embed_reply("📅 Coming soon", color=0xe74c3c)

    res = data['response'][0]
    p = res['player']
    s = res['statistics'][0] if res['statistics'] else {}
    games = s.get('games', {})
    goals = s.get('goals', {})

    embed = discord.Embed(title=f"{p['name']} • {p['age']} • {games.get('position','N/A')}", color=0x1f8b4c)
    embed.add_field(name="Club", value=f"{s.get('team',{}).get('name','N/A')} | {p['nationality']}")
    embed.add_field(name="Market Value", value=p.get('value','N/A'))
    embed.add_field(name="Contract", value=games.get('contract','N/A'))
    embed.add_field(name="2025/26", value=f"{goals.get('total','0')} Goals {goals.get('assists','0')} Assists | {games.get('appearences','0')} Apps | Rating {games.get('rating') if games.get('rating') else 'N/A'}")
    embed.add_field(name="Career", value=f"{p.get('goals',{}).get('total',0)} Goals {p.get('goals',{}).get('assists',0)} Assists | {p.get('games',{}).get('appearences',0)} Apps")
    if p.get('photo'): embed.set_thumbnail(url=p['photo'])
    return embed

# AUTOCOMPLETE: SEARCHES ALL 1000+ TEAMS
async def team_autocomplete(interaction: discord.Interaction, current: str) -> list[app_commands.Choice[str]]:
    if len(current) < 2: return []
    data = await api_get("teams", {"search": current})
    choices = []
    for team in data.get('response', [])[:25]:
        name = team['team']['name']
        choices.append(app_commands.Choice(name=name[:100], value=name))
    return choices

# AUTOCOMPLETE: SEARCHES ALL 50,000+ PLAYERS
async def player_autocomplete(interaction: discord.Interaction, current: str) -> list[app_commands.Choice[str]]:
    if len(current) < 2: return []
    data = await api_get("players", {"search": current, "season": CURRENT_SEASON})
    choices = []
    for p in data.get('response', [])[:25]:
        name = p['player']['name']
        team = p['statistics'][0]['team']['name'] if p['statistics'] else "Unknown"
        choices.append(app_commands.Choice(name=f"{name} - {team}"[:100], value=name))
    return choices

# AUTOCOMPLETE: SEARCHES ALL LEAGUES
async def league_autocomplete(interaction: discord.Interaction, current: str) -> list[app_commands.Choice[str]]:
    if len(current) < 1: return []
    data = await api_get("leagues", {"search": current})
    choices = []
    for l in data.get('response', [])[:25]:
        name = l['league']['name']
        choices.append(app_commands.Choice(name=f"{name} - {l['country']['name']}"[:100], value=str(l['league']['id'])))
    return choices

def load_predictions():
    try:
        with open(predictions_file, 'r') as f:
            return json.load(f)
    except:
        return {}

def save_predictions(data):
    with open(predictions_file, 'w') as f:
        json.dump(data, f)

@bot.event
async def on_ready():
    print(f"Logged in as {bot.user}")
    try:
        synced = await bot.tree.sync()
        print(f"Synced {len(synced)} commands")
    except Exception as e:
        print(e)
    if API_KEY:
        auto_post_transfers.start()
        auto_post_fixtures.start()

# 1. /fixtures - NOW WITH LEAGUE AUTOCOMPLETE
@bot.tree.command(name="fixtures", description="Today's fixtures")
@app_commands.autocomplete(league=league_autocomplete)
async def fixtures(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    league_id = int(league)
    if not await check_season_active(league_id):
        return await interaction.followup.send(embed=embed_reply("🏁 Season ended", "Try searching another league or wait for new season.", 0xe67e22))

    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    data = await api_get("fixtures", {"date": today, "league": league_id})
    if not data.get('response'):
        next_data = await api_get("fixtures", {"next": 1, "league": league_id})
        desc = "📅 Coming soon"
        if next_data.get('response'):
            next_game = next_data['response'][0]
            desc += f"\nNext: {next_game['teams']['home']['name']} vs {next_game['teams']['away']['name']} — {next_game['fixture']['date'][:16].replace('T',' ')}"
        return await interaction.followup.send(embed=embed_reply(desc=desc))

    embed = discord.Embed(title=f"Fixtures — {today}", color=0x3498db)
    view = discord.ui.View()
    for fix in data['response'][:10]:
        embed.add_field(name=f"{fix['teams']['home']['name']} vs {fix['teams']['away']['name']}",
                        value=f"{fix['fixture']['date'][11:16]} | {fix['league']['name']}", inline=False)
        view.add_item(discord.ui.Button(label=f"{fix['teams']['home']['name'][:15]}", custom_id=f"fix_{fix['fixture']['id']}"))
    await interaction.followup.send(embed=embed, view=view)

# 2. /lineups - TEAM AUTOCOMPLETE
@bot.tree.command(name="lineups", description="Get lineups")
@app_commands.autocomplete(team=team_autocomplete)
async def lineups(interaction: discord.Interaction, team: str):
    await interaction.response.defer()
    team_data = await api_get("teams", {"search": team})
    if not team_data.get('response'):
        return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))

    team_id = team_data['response'][0]['team']['id']
    fixtures = await api_get("fixtures", {"team": team_id, "next": 1})
    if not fixtures.get('response'):
        return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))

    fix = fixtures['response'][0]
    lineups = await api_get("fixtures/lineups", {"fixture": fix['fixture']['id']})
    if not lineups.get('response'):
        return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))

    embed = discord.Embed(title=f"Starting XI — {fix['teams']['home']['name']} vs {fix['teams']['away']['name']}")
    players = []
    for team in lineups['response']:
        for p in team['startXI']:
            players.append({'id': p['player']['id'], 'name': p['player']['name'], 'number': p['player']['number']})
    await interaction.followup.send(embed=embed, view=PlayerView(players, fix['fixture']['id']))

# 3. /compare - PLAYER AUTOCOMPLETE
@bot.tree.command(name="compare", description="Compare two players")
@app_commands.autocomplete(player1=player_autocomplete, player2=player_autocomplete)
async def compare(interaction: discord.Interaction, player1: str, player2: str):
    await interaction.response.defer()
    p1_data = await api_get("players", {"search": player1, "season": CURRENT_SEASON})
    p2_data = await api_get("players", {"search": player2, "season": CURRENT_SEASON})
    if not p1_data.get('response') or not p2_data.get('response'):
        return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))

    def format_p(data):
        res = data['response'][0]
        p = res['player']; s = res['statistics'][0] if res['statistics'] else {}
        games = s.get('games',{}); goals = s.get('goals',{})
        return f"{p['name']} • {p['age']} • {games.get('position','N/A')} • {s.get('team',{}).get('name','N/A')}\n2025/26: {goals.get('total','0')} Goals {goals.get('assists','0')} Assists | Rating {games.get('rating') if games.get('rating') else 'N/A'}\nValue: {p.get('value','N/A')} | Contract: {games.get('contract','N/A')}"

    embed = discord.Embed(title=f"{player1} vs {player2}", color=0xe74c3c)
    embed.add_field(name=player1, value=format_p(p1_data), inline=False)
    embed.add_field(name=player2, value=format_p(p2_data), inline=False)
    await interaction.followup.send(embed=embed)

# 4. /transfers
@bot.tree.command(name="transfers", description="Latest transfers")
async def transfers(interaction: discord.Interaction):
    await interaction.response.defer()
    data = await api_get("transfers", {"last": 20})
    if not data.get('response'):
        return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))
    embed = discord.Embed(title="🔄 DONE DEALS — Last 24 Hours", color=0xf1c40f)
    view = discord.ui.View()
    for i, t in enumerate(data['response'][:10]):
        transfer_info = t['transfers'][0]
        embed.add_field(name=f"{i+1}. {t['player']['name']}", value=f"{t['teams']['out']['name']} → {t['teams']['in']['name']} {transfer_info.get('type','')}", inline=False)
        view.add_item(PlayerButton(t['player']['id'], str(i+1)))
    await interaction.followup.send(embed=embed, view=view)

# 5. /news
@bot.tree.command(name="news", description="World football news")
async def news(interaction: discord.Interaction):
    await interaction.response.defer()
    if not NEWS_KEY:
        return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"https://newsapi.org/v2/everything?q=football&sortBy=publishedAt&pageSize=5&apiKey={NEWS_KEY}") as r:
                data = await r.json()
    except:
        return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))
    if not data.get('articles'):
        return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))
    embed = discord.Embed(title="📰 WORLD FOOTBALL NEWS", color=0x9b59b6)
    for i, a in enumerate(data['articles'][:5]):
        embed.add_field(name=f"{i+1}. {a['title'][:80]}", value=a['source']['name'], inline=False)
    await interaction.followup.send(embed=embed)

# 6. /player - PLAYER AUTOCOMPLETE
@bot.tree.command(name="player", description="Get full player card")
@app_commands.autocomplete(name=player_autocomplete)
async def player(interaction: discord.Interaction, name: str):
    await interaction.response.defer()
    data = await api_get("players", {"search": name, "season": CURRENT_SEASON})
    if not data.get('response'): return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))
    embed = await get_player_card(data['response'][0]['player']['id'])
    await interaction.followup.send(embed=embed)

# 7. /predict - TEAM AUTOCOMPLETE
@bot.tree.command(name="predict", description="Predict a match score")
@app_commands.autocomplete(team1=team_autocomplete, team2=team_autocomplete)
async def predict(interaction: discord.Interaction, team1: str, score: str, team2: str):
    preds = load_predictions()
    guild_id = str(interaction.guild_id)
    user_id = str(interaction.user.id)

    if guild_id not in preds: preds[guild_id] = {}
    if user_id not in preds[guild_id]: preds[guild_id][user_id] = {"points": 0, "picks": []}

    preds[guild_id][user_id]["picks"].append(f"{team1} {score} {team2}")
    save_predictions(preds)

    view = discord.ui.View()
    view.add_item(discord.ui.Button(label="Leaderboard", custom_id="show_leaderboard"))
    embed = embed_reply("🔮 Prediction saved", f"{team1} {score} {team2}\nYour pick has been logged.", 0x9b59b6)
    await interaction.response.send_message(embed=embed, view=view)

# 8. /compareteam - TEAM AUTOCOMPLETE
@bot.tree.command(name="compareteam", description="Compare two teams")
@app_commands.autocomplete(team1=team_autocomplete, team2=team_autocomplete)
async def compareteam(interaction: discord.Interaction, team1: str, team2: str):
    await interaction.response.defer()
    t1_data = await api_get("teams", {"search": team1})
    t2_data = await api_get("teams", {"search": team2})
    if not t1_data.get('response') or not t2_data.get('response'):
        return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))

    async def format_team(data):
        t = data['response'][0]['team']
        stats = await api_get("teams/statistics", {"team": t['id'], "league": 39, "season": CURRENT_SEASON})
        s = stats['response'] if stats.get('response') else {}
        fixtures = s.get('fixtures',{})
        goals = s.get('goals',{}).get('for',{})
        return f"{t['name']}\nFounded: {t['founded']} | Country: {t['country']}\n2025/26: {fixtures.get('wins',{}).get('total','0')}W {fixtures.get('draws',{}).get('total','0')}D {fixtures.get('loses',{}).get('total','0')}L | {goals.get('total',{}).get('total','0')} Goals"

    embed = discord.Embed(title=f"{team1} vs {team2} — 2025/26", color=0x3498db)
    embed.add_field(name=team1, value=await format_team(t1_data), inline=False)
    embed.add_field(name=team2, value=await format_team(t2_data), inline=False)

    view = discord.ui.View()
    view.add_item(discord.ui.Button(label=f"{team1} Squad", custom_id=f"squad_{t1_data['response'][0]['team']['id']}"))
    view.add_item(discord.ui.Button(label=f"{team2} Squad", custom_id=f"squad_{t2_data['response'][0]['team']['id']}"))
    await interaction.followup.send(embed=embed, view=view)

# 9. /live
@bot.tree.command(name="live", description="All live matches right now")
async def live(interaction: discord.Interaction):
    await interaction.response.defer()
    data = await api_get("fixtures", {"live": "all"})

    if not data.get('response'):
        return await interaction.followup.send(embed=embed_reply("🔴 No live matches right now"))

    embed = discord.Embed(title="🔴 LIVE MATCHES", color=0xe74c3c)
    view = discord.ui.View()

    for fix in data['response'][:10]:
        home = fix['teams']['home']['name']
        away = fix['teams']['away']['name']
        hg = fix['goals']['home'] if fix['goals']['home'] is not None else 0
        ag = fix['goals']['away'] if fix['goals']['away'] is not None else 0
        minute = fix['fixture']['status']['elapsed']
        league = fix['league']['name']

        embed.add_field(name=f"{home} {hg} - {ag} {away}", value=f"{minute}' | {league}", inline=False)
        view.add_item(discord.ui.Button(label=f"{home[:12]} vs {away[:12]}", custom_id=f"live_{fix['fixture']['id']}"))

    await interaction.followup.send(embed=embed, view=view)

# 10. /h2h - TEAM AUTOCOMPLETE
@bot.tree.command(name="h2h", description="Head to head between two teams")
@app_commands.autocomplete(team1=team_autocomplete, team2=team_autocomplete)
async def h2h(interaction: discord.Interaction, team1: str, team2: str):
    await interaction.response.defer()

    t1_data = await api_get("teams", {"search": team1})
    t2_data = await api_get("teams", {"search": team2})
    if not t1_data.get('response') or not t2_data.get('response'):
        return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))

    t1_id = t1_data['response'][0]['team']['id']
    t2_id = t2_data['response'][0]['team']['id']
    t1_name = t1_data['response'][0]['team']['name']
    t2_name = t2_data['response'][0]['team']['name']

    data = await api_get("fixtures/headtohead", {"h2h": f"{t1_id}-{t2_id}", "last": 10})
    if not data.get('response'):
        return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))

    t1_wins = t2_wins = draws = 0
    total_goals = 0
    last_5 = []

    for fix in data['response']:
        hg = fix['goals']['home'] or 0
        ag = fix['goals']['away'] or 0
        total_goals += hg + ag

        if fix['teams']['home']['id'] == t1_id:
            if hg > ag: t1_wins += 1
            elif hg < ag: t2_wins += 1
            else: draws += 1
        else:
            if ag > hg: t1_wins += 1
            elif ag < hg: t2_wins += 1
            else: draws += 1

        last_5.append(f"{fix['teams']['home']['name']} {hg}-{ag} {fix['teams']['away']['name']} | {fix['fixture']['date'][:10]}")

    games = len(data['response'])
    embed = discord.Embed(title=f"H2H: {t1_name} vs {t2_name}", color=0x3498db)
    embed.add_field(name="Record", value=f"{t1_name}: {t1_wins}W\n{t2_name}: {t2_wins}W\nDraws: {draws}", inline=True)
    embed.add_field(name="Stats", value=f"Games: {games}\nGoals/Game: {round(total_goals/games,1)}", inline=True)
    embed.add_field(name="Last 5 Meetings", value="\n".join(last_5[:5]), inline=False)

    view = discord.ui.View()
    view.add_item(discord.ui.Button(label=f"{t1_name} Squad", custom_id=f"squad_{t1_id}"))
    view.add_item(discord.ui.Button(label=f"{t2_name} Squad", custom_id=f"squad_{t2_id}"))
    await interaction.followup.send(embed=embed, view=view)

# 11. /result - LEAGUE AUTOCOMPLETE
@bot.tree.command(name="result", description="Get past match results")
@app_commands.autocomplete(league=league_autocomplete)
async def result(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    league_id = int(league)
    if not await check_season_active(league_id):
        return await interaction.followup.send(embed=embed_reply("🏁 Season ended", "Try searching another league or wait for new season.", 0xe67e22))

    data = await api_get("fixtures", {"league": league_id, "season": CURRENT_SEASON, "last": 10})
    if not data.get('response'):
        return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))

    embed = discord.Embed(title="Recent Results", color=0x95a5a6)
    view = discord.ui.View()

    for i, fix in enumerate(data['response'][:10]):
        if fix['fixture']['status']['short']!= "FT": continue
        home = fix['teams']['home']['name']
        away = fix['teams']['away']['name']
        hg = fix['goals']['home']
        ag = fix['goals']['away']
        date = fix['fixture']['date'][:10]

        embed.add_field(name=f"{home} {hg} - {ag} {away}", value=f"{date} | {fix['league']['name']}", inline=False)
        if i < 5:
            view.add_item(discord.ui.Button(label=f"{home[:10]} vs", custom_id=f"result_{fix['fixture']['id']}"))

    await interaction.followup.send(embed=embed, view=view)

# 12. /table - LEAGUE AUTOCOMPLETE
@bot.tree.command(name="table", description="League standings")
@app_commands.autocomplete(league=league_autocomplete)
async def table(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    league_id = int(league)
    if not await check_season_active(league_id):
        return await interaction.followup.send(embed=embed_reply("🏁 Season ended", "Try searching another league or wait for new season.", 0xe67e22))

    data = await api_get("standings", {"league": league_id, "season": CURRENT_SEASON})
    if not data.get('response'):
        return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))

    standings = data['response'][0]['league']['standings'][0]
    embed = discord.Embed(title=f"{data['response'][0]['league']['name']} Table", color=0x2ecc71)

    table_text = []
    for team in standings[:10]:
        t = team['team']['name'][:15]
        table_text.append(f"{team['rank']}. {t} — {team['points']}pts | {team['all']['played']}P {team['all']['win']}W {team['all']['draw']}D {team['all']['lose']}L")

    embed.description = "```\n" + "\n".join(table_text) + "\n```"
    await interaction.followup.send(embed=embed)

# 13. /scorers - LEAGUE AUTOCOMPLETE
@bot.tree.command(name="scorers", description="Top scorers")
@app_commands.autocomplete(league=league_autocomplete)
async def scorers(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    league_id = int(league)
    if not await check_season_active(league_id):
        return await interaction.followup.send(embed=embed_reply("🏁 Season ended", "Try searching another league or wait for new season.", 0xe67e22))

    data = await api_get("players/topscorers", {"league": league_id, "season": CURRENT_SEASON})
    if not data.get('response'):
        return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))

    embed = discord.Embed(title="Top Scorers", color=0xf39c12)
    view = discord.ui.View()

    for i, p in enumerate(data['response'][:10]):
        player = p['player']
        stats = p['statistics'][0]
        embed.add_field(name=f"{i+1}. {player['name']}", value=f"{stats['goals']['total']} Goals | {stats['team']['name']}", inline=False)
        if i < 5:
            view.add_item(PlayerButton(player['id'], str(i+1)))

    await interaction.followup.send(embed=embed, view=view)

# 14. /team - TEAM AUTOCOMPLETE
@bot.tree.command(name="team", description="Team profile")
@app_commands.autocomplete(name=team_autocomplete)
async def team(interaction: discord.Interaction, name: str):
    await interaction.response.defer()
    data = await api_get("teams", {"search": name})
    if not data.get('response'):
        return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))

    t = data['response'][0]['team']
    v = data['response'][0]['venue']
    stats = await api_get("teams/statistics", {"team": t['id'], "league": 39, "season": CURRENT_SEASON})
    s = stats['response'] if stats.get('response') else {}

    embed = discord.Embed(title=t['name'], color=0x3498db)
    embed.add_field(name="Founded", value=t['founded'])
    embed.add_field(name="Country", value=t['country'])
    embed.add_field(name="Stadium", value=v['name'])
    embed.add_field(name="Capacity", value=v['capacity'])
    embed.add_field(name="2025/26 Form", value=s.get('form','N/A'))
    if t.get('logo'): embed.set_thumbnail(url=t['logo'])

    view = discord.ui.View()
    view.add_item(discord.ui.Button(label="View Squad", custom_id=f"squad_{t['id']}"))
    await interaction.followup.send(embed=embed, view=view)

# 15. /injuries - TEAM AUTOCOMPLETE
@bot.tree.command(name="injuries", description="Current injuries")
@app_commands.autocomplete(team=team_autocomplete)
async def injuries(interaction: discord.Interaction, team: str):
    await interaction.response.defer()
    team_data = await api_get("teams", {"search": team})
    if not team_data.get('response'):
        return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))

    team_id = team_data['response'][0]['team']['id']
    data = await api_get("injuries", {"team": team_id, "season": CURRENT_SEASON})
    if not data.get('response'):
        return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))

    embed = discord.Embed(title=f"Injuries — {team}", color=0xe74c3c)
    view = discord.ui.View()

    for i, inj in enumerate(data['response'][:10]):
        p = inj['player']
        embed.add_field(name=p['name'], value=f"{inj['type']} | Expected: {inj['fixture']['date'][:10]}", inline=False)
        if i < 5:
            view.add_item(PlayerButton(p['id'], str(i+1)))

    await interaction.followup.send(embed=embed, view=view)

# 16. /stats - TEAM AUTOCOMPLETE
@bot.tree.command(name="stats", description="Team statistics")
@app_commands.autocomplete(team=team_autocomplete)
async def stats(interaction: discord.Interaction, team: str):
    await interaction.response.defer()
    team_data = await api_get("teams", {"search": team})
    if not team_data.get('response'):
        return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))

    team_id = team_data['response'][0]['team']['id']
    data = await api_get("teams/statistics", {"team": team_id, "league": 39, "season": CURRENT_SEASON})
    if not data.get('response'):
        return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))

    s = data['response']
    embed = discord.Embed(title=f"Stats — {team}", color=0x9b59b6)
    embed.add_field(name="Form", value=s.get('form','N/A'))
    embed.add_field(name="Played", value=s['fixtures']['played']['total'])
    embed.add_field(name="Goals", value=f"{s['goals']['for']['total']['total']} For | {s['goals']['against']['total']['total']} Against")
    embed.add_field(name="Clean Sheets", value=s['clean_sheet']['total'])
    embed.add_field(name="Cards", value=f"{s['cards']['yellow']['total']} Y | {s['cards']['red']['total']} R")
    await interaction.followup.send(embed=embed)

# 17. /next - TEAM AUTOCOMPLETE
@bot.tree.command(name="next", description="Next match for a team")
@app_commands.autocomplete(team=team_autocomplete)
async def next(interaction: discord.Interaction, team: str):
    await interaction.response.defer()
    team_data = await api_get("teams", {"search": team})
    if not team_data.get('response'):
        return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))

    team_id = team_data['response'][0]['team']['id']
    data = await api_get("fixtures", {"team": team_id, "next": 1})
    if not data.get('response'):
        return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))

    fix = data['response'][0]
    embed = discord.Embed(title="Next Match", color=0x1abc9c)
    embed.add_field(name="Fixture", value=f"{fix['teams']['home']['name']} vs {fix['teams']['away']['name']}")
    embed.add_field(name="Date", value=fix['fixture']['date'][:16].replace('T',' '))
    embed.add_field(name="League", value=fix['league']['name'])
    embed.add_field(name="Venue", value=fix['fixture']['venue']['name'])

    view = discord.ui.View()
    view.add_item(discord.ui.Button(label="Set Reminder", custom_id=f"remind_{fix['fixture']['id']}"))
    await interaction.followup.send(embed=embed, view=view)

# 18. /banter
@bot.tree.command(name="banter", description="Random football banter")
async def banter(interaction: discord.Interaction):
    await interaction.response.send_message(embed=embed_reply(desc=random.choice(BANTER_LINES), color=0xe67e22))

# 19. /odds - TEAM AUTOCOMPLETE
@bot.tree.command(name="odds", description="Match odds")
@app_commands.autocomplete(team=team_autocomplete)
async def odds(interaction: discord.Interaction, team: str):
    await interaction.response.defer()
    team_data = await api_get("teams", {"search": team})
    if not team_data.get('response'):
        return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))

    team_id = team_data['response'][0]['team']['id']
    data = await api_get("odds", {"fixture": f"team={team_id}", "bookmaker": 8})
    if not data.get('response'):
        return await interaction.followup.send(embed=embed_reply("📅 Coming soon"))

    odds_data = data['response'][0]
    embed = discord.Embed(title=f"Odds — {odds_data['fixture']['teams']['home']['name']} vs {odds_data['fixture']['teams']['away']['name']}", color=0xf1c40f)
    for bet in odds_data['bookmakers'][0]['bets']:
        if bet['name'] == 'Match Winner':
            values = bet['values']
            embed.add_field(name="1X2", value=f"Home: {values[0]['odd']} | Draw: {values[1]['odd']} | Away: {values[2]['odd']}")
    await interaction.followup.send(embed=embed)

# 20. /leaderboard
@bot.tree.command(name="leaderboard", description="Server prediction leaderboard")
async def leaderboard(interaction: discord.Interaction):
    preds = load_predictions()
    guild_id = str(interaction.guild_id)
    if guild_id not in preds: return await interaction.response.send_message(embed=embed_reply("📅 Coming soon"))

    sorted_users = sorted(preds[guild_id].items(), key=lambda x: x[1]["points"], reverse=True)[:10]
    embed = discord.Embed(title="🏆 Server Prediction Leaderboard", color=0xf39c12)
    for i, (uid, data) in enumerate(sorted_users):
        try:
            user = await bot.fetch_user(int(uid))
            name = user.name
        except:
            name = f"User {uid}"
        embed.add_field(name=f"{i+1}. {name}", value=f"{data['points']} pts", inline=False)
    await interaction.response.send_message(embed=embed)

@bot.event
async def on_interaction(interaction: discord.Interaction):
    custom_id = interaction.data.get('custom_id','')

    if custom_id.startswith('result_'):
        fixture_id = int(custom_id.split('_')[1])
        await interaction.response.defer(ephemeral=True)
        events = await api_get("fixtures/events", {"fixture": fixture_id})
        fix_data = await api_get("fixtures", {"id": fixture_id})
        if not fix_data.get('response'): return

        fix = fix_data['response'][0]
        embed = discord.Embed(title=f"{fix['teams']['home']['name']} {fix['goals']['home']} - {fix['goals']['away']} {