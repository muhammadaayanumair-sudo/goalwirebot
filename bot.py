import discord
from discord.ext import commands, tasks
from discord import app_commands
import aiohttp
import asyncio
from datetime import datetime, timezone
import os
import json

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

LEAGUE_IDS = {"epl":39,"pl":39,"prem":39,"laliga":140,"la liga":140,"seriea":135,"serie a":135,"bundesliga":78,"ucl":2,"champions league":2}

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

async def get_player_card(player_id: int):
    data = await api_get("players", {"id": player_id, "season": 2025})
    if not data.get('response'):
        return discord.Embed(title="Player not found", color=0xe74c3c)

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

# 1. /fixtures
@bot.tree.command(name="fixtures", description="Today's fixtures")
@app_commands.describe(league="epl, laliga, ucl, etc")
async def fixtures(interaction: discord.Interaction, league: str = "all"):
    await interaction.response.defer()
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    params = {"date": today}
    if league!= "all":
        params["league"] = LEAGUE_IDS.get(league.lower(), 39)

    data = await api_get("fixtures", params)
    if not data.get('response'):
        next_data = await api_get("fixtures", {"next": 1, "league": params.get("league", 39)})
        next_str = ""
        if next_data.get('response'):
            next_game = next_data['response'][0]
            next_str = f"\nNext: {next_game['teams']['home']['name']} vs {next_game['teams']['away']['name']} — {next_game['fixture']['date'][:16].replace('T',' ')}"
        await interaction.followup.send(f"📅 No fixtures today{next_str}")
        return

    embed = discord.Embed(title=f"Fixtures — {today}", color=0x3498db)
    view = discord.ui.View()
    for fix in data['response'][:10]:
        embed.add_field(name=f"{fix['teams']['home']['name']} vs {fix['teams']['away']['name']}",
                        value=f"{fix['fixture']['date'][11:16]} | {fix['league']['name']}", inline=False)
        view.add_item(discord.ui.Button(label=f"{fix['teams']['home']['name'][:15]}", custom_id=f"fix_{fix['fixture']['id']}"))
    await interaction.followup.send(embed=embed, view=view)

# 2. /lineups
@bot.tree.command(name="lineups", description="Get lineups without match ID")
async def lineups(interaction: discord.Interaction):
    leagues = {"Premier League": 39, "La Liga": 140, "Serie A": 135, "Bundesliga": 78, "UCL": 2}
    select = discord.ui.Select(placeholder="Pick a League", options=[discord.SelectOption(label=k, value=str(v)) for k,v in leagues.items()])

    async def league_callback(interaction: discord.Interaction):
        league_id = int(select.values[0])
        teams_data = await api_get("teams", {"league": league_id, "season": 2025})
        team_view = discord.ui.View()
        for t in teams_data.get('response',[])[:25]:
            team_view.add_item(discord.ui.Button(label=t['team']['name'], custom_id=f"team_{t['team']['id']}_{league_id}"))
        await interaction.response.send_message("Pick a Team:", view=team_view, ephemeral=True)

    select.callback = league_callback
    view = discord.ui.View()
    view.add_item(select)
    await interaction.response.send_message("Select League:", view=view)

# 3. /compare
@bot.tree.command(name="compare", description="Compare two players")
async def compare(interaction: discord.Interaction, player1: str, player2: str):
    await interaction.response.defer()
    p1_data = await api_get("players", {"search": player1, "season": 2025})
    p2_data = await api_get("players", {"search": player2, "season": 2025})
    if not p1_data.get('response') or not p2_data.get('response'):
        return await interaction.followup.send("Player not found")

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
        return await interaction.followup.send("No recent transfers found")
    embed = discord.Embed(title="🔄 DONE DEALS — Last 24 Hours", color=0xf1c40f)
    view = discord.ui.View()
    for i, t in enumerate(data['response'][:10]):
        transfer_info = t['transfers'][0]
        embed.add_field(name=f"{i+1}. {t['player']['name']}", value=f"{t['teams']['out']['name']} → {t['teams']['in']['name']} {transfer_info.get('type','')}", inline=False)
        view.add_item(discord.ui.Button(label=str(i+1), custom_id=f"transfer_{t['player']['id']}"))
    await interaction.followup.send(embed=embed, view=view)

# 5. /news
@bot.tree.command(name="news", description="World football news")
async def news(interaction: discord.Interaction):
    await interaction.response.defer()
    if not NEWS_KEY:
        return await interaction.followup.send("News API key not set")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"https://newsapi.org/v2/everything?q=football&sortBy=publishedAt&pageSize=5&apiKey={NEWS_KEY}") as r:
                data = await r.json()
    except:
        return await interaction.followup.send("News service unavailable")
    if not data.get('articles'):
        return await interaction.followup.send("No news found")
    embed = discord.Embed(title="📰 WORLD FOOTBALL NEWS", color=0x9b59b6)
    for i, a in enumerate(data['articles'][:5]):
        embed.add_field(name=f"{i+1}. {a['title'][:80]}", value=a['source']['name'], inline=False)
    await interaction.followup.send(embed=embed)

# 6. /player
@bot.tree.command(name="player", description="Get full player card")
async def player(interaction: discord.Interaction, name: str):
    await interaction.response.defer()
    data = await api_get("players", {"search": name, "season": 2025})
    if not data.get('response'): return await interaction.followup.send("Player not found")
    embed = await get_player_card(data['response'][0]['player']['id'])
    await interaction.followup.send(embed=embed)

# 7. /predict
@bot.tree.command(name="predict", description="Predict a match score")
@app_commands.describe(team1="Home team", score="Score like 2-1", team2="Away team")
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
    await interaction.response.send_message(f"🔮 Prediction saved: {team1} {score} {team2}\nYour pick has been logged.", view=view)

@bot.tree.command(name="leaderboard", description="Server prediction leaderboard")
async def leaderboard(interaction: discord.Interaction):
    preds = load_predictions()
    guild_id = str(interaction.guild_id)
    if guild_id not in preds: return await interaction.response.send_message("No predictions yet")
    
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

# 8. /compareteam
@bot.tree.command(name="compareteam", description="Compare two teams")
async def compareteam(interaction: discord.Interaction, team1: str, team2: str):
    await interaction.response.defer()
    t1_data = await api_get("teams", {"search": team1})
    t2_data = await api_get("teams", {"search": team2})
    if not t1_data.get('response') or not t2_data.get('response'):
        return await interaction.followup.send("Team not found")
    
    async def format_team(data):
        t = data['response'][0]['team']
        stats = await api_get("teams/statistics", {"team": t['id'], "league": 39, "season": 2025})
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
        return await interaction.followup.send("🔴 No live matches right now")
    
    embed = discord.Embed(title="🔴 LIVE MATCHES", color=0xe74c3c)
    view = discord.ui.View()
    
    for fix in data['response'][:10]:
        home = fix['teams']['home']['name']
        away = fix['teams']['away']['name']
        hg = fix['goals']['home'] if fix['goals']['home'] is not None else 0
        ag = fix['goals']['away'] if fix['goals']['away'] is not None else 0
        minute = fix['fixture']['status']['elapsed']
        league = fix['league']['name']
        
        embed.add_field(
            name=f"{home} {hg} - {ag} {away}",
            value=f"{minute}' | {league}",
            inline=False
        )
        view.add_item(discord.ui.Button(label=f"{home[:12]} vs {away[:12]}", custom_id=f"live_{fix['fixture']['id']}"))
    
    await interaction.followup.send(embed=embed, view=view)

# 10. /h2h
@bot.tree.command(name="h2h", description="Head to head between two teams")
@app_commands.describe(team1="First team", team2="Second team")
async def h2h(interaction: discord.Interaction, team1: str, team2: str):
    await interaction.response.defer()
    
    t1_data = await api_get("teams", {"search": team1})
    t2_data = await api_get("teams", {"search": team2})
    if not t1_data.get('response') or not t2_data.get('response'):
        return await interaction.followup.send("Team not found")
    
    t1_id = t1_data['response'][0]['team']['id']
    t2_id = t2_data['response'][0]['team']['id']
    t1_name = t1_data['response'][0]['team']['name']
    t2_name = t2_data['response'][0]['team']['name']
    
    data = await api_get("fixtures/headtohead", {"h2h": f"{t1_id}-{t2_id}", "last": 10})
    if not data.get('response'):
        return await interaction.followup.send(f"No head to head games found for {t1_name} vs {t2_name}")
    
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

# 11. /result
@bot.tree.command(name="result", description="Get past match results")
@app_commands.describe(team="Team name or league: epl, laliga")
async def result(interaction: discord.Interaction, team: str):
    await interaction.response.defer()
    
    if team.lower() in LEAGUE_IDS:
        params = {"league": LEAGUE_IDS[team.lower()], "season": 2025, "last": 10}
    else:
        team_data = await api_get("teams", {"search": team})
        if not team_data.get('response'):
            return await interaction.followup.send("Team or league not found")
        params = {"team": team_data['response'][0]['team']['id'], "season": 2025, "last": 10}
    
    data = await api_get("fixtures", params)
    if not data.get('response'):
        return await interaction.followup.send("No recent results found")
    
    embed = discord.Embed(title=f"Recent Results — {team}", color=0x95a5a6)
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
        embed = discord.Embed(title=f"{fix['teams']['home']['name']} {fix['goals']['home']} - {fix['goals']['away']} {fix['teams']['away']['name']}", color=0x95a5a6)
        embed.add_field(name="Date", value=fix['fixture']['date'][:16].replace('T',' '))
        
        goals = [e for e in events.get('response',[]) if e['type'] == 'Goal']
        if goals:
            goal_text = [f"{e['time']['elapsed']}' {e['player']['name']} ({e['team']['name']})" for e in goals]
            embed.add_field(name="Scorers", value="\n".join(goal_text), inline=False)
        
        await interaction.followup.send(embed=embed, ephemeral=True)
    
    elif custom_id.startswith('live_'):
        fixture_id = int(custom_id.split('_')[1])
        await interaction.response.defer(ephemeral=True)
        data = await api_get("fixtures", {"id": fixture_id})
        if not data.get('response'):
            return await interaction.followup.send("Match ended")
        
        fix = data['response'][0]
        events = await api_get("fixtures/events", {"fixture": fixture_id})
        
        embed = discord.Embed(title=f"{fix['teams']['home']['name']} {fix['goals']['home']} - {fix['goals']['away']} {fix['teams']['away']['name']}", color=0xe74c3c)
        embed.add_field(name="Status", value=f"{fix['fixture']['status']['long']} — {fix['fixture']['status']['elapsed']}'")
        embed.add_field(name="League", value=fix['league']['name'])
        
        goal_text = []
        for e in events.get('response',[]):
            if e['type'] == 'Goal':
                goal_text.append(f"{e['time']['elapsed']}' {e['player']['name']} ({e['team']['name']})")
        
        if goal_text:
            embed.add_field(name="Goals", value="\n".join(goal_text[:10]), inline=False)
        
        view = discord.ui.View()
        view.add_item(discord.ui.Button(label="View Lineups", custom_id=f"lineup_{fixture_id}"))
        await interaction.followup.send(embed=embed, view=view, ephemeral=True)
    
    elif custom_id == "show_leaderboard":
        preds = load_predictions()
        guild_id = str(interaction.guild_id)
        if guild_id not in preds: return await interaction.response.send_message("No predictions yet", ephemeral=True)
        
        sorted_users = sorted(preds[guild_id].items(), key=lambda x: x[1]["points"], reverse=True)[:10]
        embed = discord.Embed(title="🏆 Server Prediction Leaderboard", color=0xf39c12)
        for i, (uid, data) in enumerate(sorted_users):
            try:
                user = await bot.fetch_user(int(uid))
                name = user.name
            except:
                name = f"User {uid}"
            embed.add_field(name=f"{i+1}. {name}", value=f"{data['points']} pts", inline=False)
        await interaction.response.send_message(embed=embed, ephemeral=True)

@tasks.loop(minutes=15)
async def auto_post_transfers():
    channel_id = os.getenv("TRANSFERS_CHANNEL_ID")
    if not channel_id: return
    channel = bot.get_channel(int(channel_id))
    if not channel: return
    data = await api_get("transfers", {"last": 5})
    for t in data.get('response',[]):
        transfer_id = t['transfers'][0]['id']
        if transfer_id in last_transfer_ids: continue
        last_transfer_ids.add(transfer_id)
        embed = discord.Embed(title=f"🔄 {t['player']['name']}",
                              description=f"{t['teams']['out']['name']} → {t['teams']['in']['name']} {t['transfers'][0].get('type','')}")
        view = PlayerView([{'id': t['player']['id'], 'name': t['player']['name'], 'number': ''}])
        await channel.send(embed=embed, view=view)

@tasks.loop(minutes=5)
async def auto_post_fixtures():
    channel_id = os.getenv("FIXTURES_CHANNEL_ID")
    if not channel_id: return
    channel = bot.get_channel(int(channel_id))
    if not channel: return
    data = await api_get("fixtures", {"next": 10})
    for fix in data.get('response',[]):
        if fix['fixture']['id'] in last_match_ids: continue
        kickoff = datetime.fromisoformat(fix['fixture']['date'].replace('Z', '+00:00'))
        if (kickoff - datetime.now(timezone.utc)).total_seconds() < 3600:
            last_match_ids.add(fix['fixture']['id'])
            lineups = await api_get("fixtures/lineups", {"fixture": fix['fixture']['id']})
            if not lineups.get('response'): continue
            embed = discord.Embed(title=f"Starting XI — {fix['teams']['home']['name']} vs {fix['teams']['away']['name']}")
            players = []
            for team in lineups['response']:
                for p in team['startXI']:
                    players.append({'id': p['player']['id'], 'name': p['player']['name'], 'number': p['player']['number']})
            await channel.send(embed=embed, view=PlayerView(players, fix['fixture']['id']))

bot.run(TOKEN)