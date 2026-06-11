"""
listener.py — Central interactive application engine for Goalwire.
Handles 24/7 dynamic slash commands and premium match interaction hubs.
"""

import sys
import discord
from discord import app_commands
from discord.ext import commands
from datetime import datetime, timezone, timedelta

# Import your existing async modules and configs
from services.football_api import FootballAPI
import config
from config import Colours, COMPETITION_IDS

# ─── CONFIG & LIFECYCLE MANAGEMENT ───────────────────────────────────────────
if not config.DISCORD_BOT_TOKEN:
    print("❌ DISCORD_BOT_TOKEN environment variable is missing in config.")
    sys.exit(1)

intents = discord.Intents.default()

class GoalwireBot(commands.Bot):
    def __init__(self):
        super().__init__(command_prefix=config.BOT_PREFIX, intents=intents)
        
    async def setup_hook(self):
        # Initialize your async Football API Session
        await FootballAPI.setup()
        print("🔌 FootballAPI session successfully mounted.")
        
        # Sync all slash commands globally across all guilds
        await self.tree.sync()
        print("⚙️ Slash commands synchronized globally!")

    async def close(self):
        # Safely tear down network sockets on shutdown
        await FootballAPI.close()
        print("🔌 FootballAPI session disconnected.")
        await super().close()

bot = GoalwireBot()

@bot.event
async def on_ready():
    print(f"⚽ {bot.user.name} is online and serving commands!")

# ─── 🔴 LIVE MATCH TRACKER COMMAND ────────────────────────────────────────────

@bot.tree.command(name="live", description="Show all ongoing live football matches across tracked leagues")
async def live_matches(interaction: discord.Interaction):
    await interaction.response.defer()
    live_fixtures = await FootballAPI.get_all_live_fixtures()
    
    if not live_fixtures:
        embed = discord.Embed(
            title="🔴 Live Matches Right Now",
            description="There are currently no active matches playing across your tracked competitions.",
            color=Colours.RED,
            timestamp=datetime.now(timezone.utc)
        )
        await interaction.followup.send(embed=embed)
        return

    embed = discord.Embed(
        title="🔴 Live Football Matches",
        description="Here are the matches currently playing live:",
        color=Colours.RED,
        timestamp=datetime.now(timezone.utc)
    )
    
    components_rows = []
    for fix in live_fixtures[:5]: # Cap at 5 display blocks for performance
        f = fix["fixture"]
        teams = fix["teams"]
        goals = fix["goals"]
        status = f["status"]
        league = fix["league"]
        
        home = teams["home"]["name"]
        away = teams["away"]["name"]
        hg = goals.get("home", 0) if goals.get("home") is not None else 0
        ag = goals.get("away", 0) if goals.get("away") is not None else 0
        elapsed = status.get("elapsed", 0) or 0
        
        match_title = f"⚽ **{home}** `{hg} - {ag}` **{away}**"
        match_details = f"🏆 {league['name']} • ⏱️ *{elapsed}'* ({status.get('long', 'Live')})"
        embed.add_field(name=match_title, value=match_details, inline=False)
        
        if len(components_rows) < 5:
            components_rows.append({
                "type": 1,
                "components": [
                    {"type": 2, "style": 2, "label": f"{home} Hub", "custom_id": f"hub_main_{f['id']}", "disabled": True},
                    {"type": 2, "style": 1, "label": "📋 Lineups", "custom_id": f"hub_lineups_{f['id']}"},
                    {"type": 2, "style": 3, "label": "📊 Stats", "custom_id": f"hub_stats_{f['id']}"}
                ]
            })

    embed.set_footer(text="Goalwire Live Match Tracker Engine")
    await interaction.followup.send(embed=embed, components=components_rows if components_rows else None)

# ─── ⚽ TEAM SPECIFIC STATS COMMANDS ──────────────────────────────────────────

@bot.tree.command(name="score", description="Get the absolute latest live score or result status for a team")
@app_commands.describe(team="Name of the team (e.g. Real Madrid, Arsenal)")
async def team_score(interaction: discord.Interaction, team: str):
    await interaction.response.defer()
    
    # Check all active live scores first
    live_fixtures = await FootballAPI.get_all_live_fixtures()
    for fix in live_fixtures:
        t_home = fix["teams"]["home"]["name"].lower()
        t_away = fix["teams"]["away"]["name"].lower()
        if team.lower() in t_home or team.lower() in t_away:
            hg = fix["goals"].get("home", 0)
            ag = fix["goals"].get("away", 0)
            elapsed = fix["fixture"]["status"].get("elapsed", 0)
            embed = discord.Embed(
                title=f"🔴 Live Score Notification: {fix['teams']['home']['name']} vs {fix['teams']['away']['name']}",
                description=f"⏱️ **Minute**: {elapsed}'\n📊 **Scoreline**: `{hg} - {ag}`\n🏆 **League**: {fix['league']['name']}",
                color=Colours.RED
            )
            await interaction.followup.send(embed=embed)
            return

    await interaction.followup.send(f"ℹ️ **{team}** is not playing an active live match right now. Pulling up historical datasets using `/results` or schedules via `/fixtures` instead.")


@bot.tree.command(name="fixtures", description="View upcoming matches for a specific team")
@app_commands.describe(team="Name of the team")
async def upcoming_fixtures(interaction: discord.Interaction, team: str):
    await interaction.response.defer()
    
    found_matches = []
    # Search forward fixtures in all tracked primary leagues mapped in configuration
    for key, lid in COMPETITION_IDS.items():
        league_fixes = await FootballAPI.get_fixtures(lid, days_ahead=config.FIXTURE_LOOKAHEAD_DAYS)
        for fix in league_fixes:
            if team.lower() in fix["teams"]["home"]["name"].lower() or team.lower() in fix["teams"]["away"]["name"].lower():
                found_matches.append(fix)

    if not found_matches:
        await interaction.followup.send(f"📅 No matches scheduled for **{team}** over the next {config.FIXTURE_LOOKAHEAD_DAYS} days inside primary tracked leagues.")
        return

    embed = discord.Embed(title=f"📅 Scheduled Matches: {team}", color=Colours.GREEN, timestamp=datetime.now(timezone.utc))
    for fix in found_matches[:5]:
        home = fix["teams"]["home"]["name"]
        away = fix["teams"]["away"]["name"]
        raw_date = fix["fixture"]["date"] # ISO string timestamp
        embed.add_field(
            name=f"🆚 {home} vs {away}",
            value=f"🏆 League: {fix['league']['name']}\n⏰ Kickoff: `{raw_date}` (UTC)",
            inline=False
        )
    await interaction.followup.send(embed=embed)


@bot.tree.command(name="results", description="Look up recent match results for a specific team")
@app_commands.describe(team="Name of the team")
async def match_results(interaction: discord.Interaction, team: str):
    await interaction.response.defer()
    
    # Pull match entries from past week cycles to find completed scores
    found_results = []
    today = datetime.now(timezone.utc)
    for key, lid in COMPETITION_IDS.items():
        # Get matching data logs
        year = today.year
        params = {
            "league": lid,
            "season": year,
            "from": (today - timedelta(days=14)).strftime("%Y-%m-%d"),
            "to": today.strftime("%Y-%m-%d"),
            "timezone": "UTC"
        }
        data = await FootballAPI._get("fixtures", params)
        fixtures = data.get("response", []) if data else []
        
        for fix in fixtures:
            if fix["fixture"]["status"]["short"] in ["FT", "AET", "PEN"]:
                if team.lower() in fix["teams"]["home"]["name"].lower() or team.lower() in fix["teams"]["away"]["name"].lower():
                    found_results.append(fix)

    if not found_results:
        await interaction.followup.send(f"🏁 No completed match scores found for **{team}** within the last 14 days.")
        return

    embed = discord.Embed(title=f"🏁 Match Scoreboard Logs: {team}", color=Colours.TEAL, timestamp=datetime.now(timezone.utc))
    for fix in found_results[:5]:
        home = fix["teams"]["home"]["name"]
        away = fix["teams"]["away"]["name"]
        hg = fix["goals"]["home"]
        ag = fix["goals"]["away"]
        embed.add_field(
            name=f"✅ {home}  `{hg} - {ag}`  {away}",
            value=f"🏆 League: {fix['league']['name']} ({fix['fixture']['status']['long']})",
            inline=False
        )
    await interaction.followup.send(embed=embed)

# ─── 📊 LEAGUE GENERAL DATA MODULES ───────────────────────────────────────────

@bot.tree.command(name="table", description="View current league table standings")
@app_commands.describe(league="The league name (e.g. Premier League, La Liga, Bundesliga)")
async def league_table(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    
    matched_id = None
    for key, lid in COMPETITION_IDS.items():
        if league.lower() in key.lower():
            matched_id = lid
            league = key
            break
            
    if not matched_id:
        await interaction.followup.send(f"❌ Unknown competition: `{league}`. Try 'Premier League', 'La Liga', etc.")
        return

    standings = await FootballAPI.get_standings(matched_id)
    if not standings:
        await interaction.followup.send(f"❌ Could not retrieve standings for {league} at this time.")
        return

    rows = []
    for entry in standings[:12]: # Top 12 ranks
        s = entry[0] if isinstance(entry, list) else entry
        rows.append(
            f"`{s['rank']:>2}.` **{s['team']['name']}** "
            f"— {s['all']['win']}W {s['all']['draw']}D {s['all']['lose']}L  "
            f"Pts: **{s['points']}** GD: {s['goalsDiff']}"
        )

    embed = discord.Embed(
        title=f"📊 {league} Standings Table",
        description="\n".join(rows) or "No data available.",
        color=Colours.BLUE,
        timestamp=datetime.now(timezone.utc)
    )
    await interaction.followup.send(embed=embed)


@bot.tree.command(name="topscorers", description="Display golden boot leaders for a league")
@app_commands.describe(league="The league name")
async def league_top_scorers(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    
    matched_id = None
    for key, lid in COMPETITION_IDS.items():
        if league.lower() in key.lower():
            matched_id = lid
            league = key
            break

    if not matched_id:
        await interaction.followup.send(f"❌ Competition not tracked. Try 'Premier League' or 'La Liga'.")
        return

    scorers = await FootballAPI.get_top_scorers(matched_id)
    if not scorers:
        await interaction.followup.send(f"❌ Golden Boot metrics empty for {league}.")
        return

    lines = []
    for rank, p_data in enumerate(scorers[:10], start=1):
        player = p_data["player"]["name"]
        team = p_data["statistics"][0]["team"]["name"]
        goals = p_data["statistics"][0]["goals"]["total"] or 0
        lines.append(f"`{rank}.` **{player}** ({team}) — **{goals}** ⚽")

    embed = discord.Embed(title=f"🥇 {league} Golden Boot Leaders", description="\n".join(lines), color=Colours.GOLD)
    await interaction.followup.send(embed=embed)


@bot.tree.command(name="assists", description="Display playmaking assist leaders for a league")
@app_commands.describe(league="The league name")
async def league_top_assists(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    
    matched_id = None
    for key, lid in COMPETITION_IDS.items():
        if league.lower() in key.lower():
            matched_id = lid
            league = key
            break

    if not matched_id:
        await interaction.followup.send(f"❌ Competition not tracked. Try 'Premier League' or 'La Liga'.")
        return

    assists_list = await FootballAPI.get_top_assists(matched_id)
    if not assists_list:
        await interaction.followup.send(f"❌ Playmaking assist stats empty for {league}.")
        return

    lines = []
    for rank, p_data in enumerate(assists_list[:10], start=1):
        player = p_data["player"]["name"]
        team = p_data["statistics"][0]["team"]["name"]
        assists = p_data["statistics"][0]["goals"]["assists"] or 0
        lines.append(f"`{rank}.` **{player}** ({team}) — **{assists}** 👟")

    embed = discord.Embed(title=f"👟 {league} Playmaking Assist Kings", description="\n".join(lines), color=Colours.CYAN)
    await interaction.followup.send(embed=embed)

# ─── 🎮 INTERACTION ROUTING FOR DYNAMIC BUTTON CLICK EVENT HOOKS ───────────────
@bot.event
async def on_interaction(interaction: discord.Interaction):
    if interaction.type != discord.InteractionType.component:
        return
    
    custom_id = interaction.data.get("custom_id", "")
    if not custom_id.startswith(("hub_main_", "hub_lineups_", "hub_stats_")):
        return

    await interaction.response.defer()
    parts = custom_id.split("_")
    action = parts[1]      
    fixture_id = int(parts[2])  

    embed = discord.Embed(timestamp=interaction.message.created_at)
    embed.set_footer(text="⚽ Goalwire • Football OS")

    if action == "lineups":
        lineup_data = await FootballAPI.get_fixture_lineups(fixture_id)
        embed.title = "📋 Official Match Lineups & Formations"
        embed.color = Colours.BLUE
        
        if lineup_data:
            for side in lineup_data[:2]:
                team_name = side["team"]["name"]
                formation = side["formation"]
                players = [f"`{p['player']['number']}` {p['player']['name']}" for p in side["startXI"]]
                embed.add_field(
                    name=f"{team_name} ({formation})", 
                    value="\n".join(players[:11]) or "No starting players recorded.", 
                    inline=True
                )
        else:
            embed.description = "⚠️ Lineups have not been released or uploaded by the officials yet."

    elif action == "stats":
        stats_data = await FootballAPI.get_fixture_statistics(fixture_id)
        embed.title = "📊 Advanced Live Match Statistics"
        embed.color = Colours.GOLD
        
        if stats_data and len(stats_data) >= 2:
            home_stats = {s["type"]: s["value"] for s in stats_data[0]["statistics"]}
            away_stats = {s["type"]: s["value"] for s in stats_data[1]["statistics"]}
            
            metrics = ["Ball Possession", "Total Shots", "Shots on Goal", "Fouls", "Corner Kicks"]
            lines = []
            for m in metrics:
                h_val = home_stats.get(m, 0) or 0
                a_val = away_stats.get(m, 0) or 0
                lines.append(f"**{m}**: {h_val} vs {a_val}")
            embed.description = "\n".join(lines)
        else:
            embed.description = "⚠️ Live team telemetry stats are currently unavailable for this match layout."

    try:
        await interaction.edit_original_response(embed=embed)
    except Exception as e:
        print(f"Error handling live button layout: {e}")

bot.run(config.DISCORD_BOT_TOKEN)
