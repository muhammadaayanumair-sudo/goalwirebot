"""
listener.py — Central interactive application engine for Goalwire.
Handles 24/7 dynamic slash commands, real-time match stats, and the card economy.
"""

import sys
import random
import discord
from discord import app_commands, Choice
from discord.ext import commands
from datetime import datetime, timezone, timedelta

# Import custom core modules 
import config
from config import Colours, COMPETITION_IDS
from database import Database
from services.football_api import FootballAPI

if not config.DISCORD_BOT_TOKEN:
    print("❌ DISCORD_BOT_TOKEN environment variable is missing in config.")
    sys.exit(1)

intents = discord.Intents.default()

# ─── 🔍 AUTO-COMPLETE CHOICE FILTER ENGINE ─────────────────────────────────────

# Comprehensive internal popular lookup cache for dynamic autocomplete filters
POPULAR_TEAMS = [
    "Real Madrid", "Barcelona", "Arsenal", "Manchester City", "Liverpool", 
    "Manchester United", "Chelsea", "Bayern Munich", "Borussia Dortmund", 
    "Juventus", "AC Milan", "Inter Milan", "Paris Saint-Germain", "Atletico Madrid",
    "Tottenham Hotspur", "Newcastle United", "Aston Villa", "Bayer Leverkusen",
    "RB Leipzig", "Napoli", "Roma", "Lazio", "Marseille", "Monaco", "Lyon"
]

async def team_autocomplete(interaction: discord.Interaction, current: str) -> list[Choice[str]]:
    """Filters popular teams dynamically as the user types."""
    return [
        Choice(name=team, value=team)
        for team in POPULAR_TEAMS if current.lower() in team.lower()
    ][:25]  # Discord caps choice array payloads at 25 entries max

async def league_autocomplete(interaction: discord.Interaction, current: str) -> list[Choice[str]]:
    """Filters tracked competition keys from config dynamically."""
    return [
        Choice(name=league, value=league)
        for league in COMPETITION_IDS.keys() if current.lower() in league.lower()
    ][:25]


# ─── 🤖 BOT IMPLEMENTATION INITIALIZATION ──────────────────────────────────────

class GoalwireBot(commands.Bot):
    def __init__(self):
        super().__init__(command_prefix=config.BOT_PREFIX, intents=intents)
        
    async def setup_hook(self):
        # 📁 1. Boot up SQLite Database Tables
        await Database.init()
        print("📁 SQLite Database layers mapped and initialised.")

        # 🔌 2. Mount async Football API Session
        await FootballAPI.setup()
        print("🔌 FootballAPI session successfully mounted.")
        
        # ⚙️ 3. Load Background Task Automation Loop Engine
        await self.load_extension("tasks")
        print("⚙️ Background loop task telemetry extensions loaded successfully.")
        
        # ⚙️ 4. Synchronize slash command tree globally
        await self.tree.sync()
        print("⚙️ Slash commands synchronized globally!")

    async def close(self):
        await FootballAPI.close()
        print("🔌 FootballAPI session disconnected.")
        await Database.close()
        print("📁 Database connection terminated.")
        await super().close()

bot = GoalwireBot()

@bot.event
async def on_ready():
    print(f"⚽ {bot.user.name} is online and serving communities!")

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
    for fix in live_fixtures[:5]: # Cap at 5 display blocks max for Discord layouts
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

# ─── ⚽ TEAM FOOTBALL STATS COMMANDS ──────────────────────────────────────────

@bot.tree.command(name="score", description="Get the absolute latest live score or result status for a team")
@app_commands.describe(team="Name of the team (e.g. Real Madrid, Arsenal)")
@app_commands.autocomplete(team=team_autocomplete)
async def team_score(interaction: discord.Interaction, team: str):
    await interaction.response.defer()
    
    live_fixtures = await FootballAPI.get_all_live_fixtures()
    for fix in live_fixtures:
        t_home = fix["teams"]["home"]["name"].lower()
        t_away = fix["teams"]["away"]["name"].lower()
        if team.lower() in t_home or team.lower() in t_away:
            hg = fix["goals"].get("home", 0) if fix["goals"].get("home") is not None else 0
            ag = fix["goals"].get("away", 0) if fix["goals"].get("away") is not None else 0
            elapsed = fix["fixture"]["status"].get("elapsed", 0) or 0
            embed = discord.Embed(
                title=f"🔴 Live Score Notification: {fix['teams']['home']['name']} vs {fix['teams']['away']['name']}",
                description=f"⏱️ **Minute**: {elapsed}'\n📊 **Scoreline**: `{hg} - {ag}`\n🏆 **League**: {fix['league']['name']}",
                color=Colours.RED
            )
            await interaction.followup.send(embed=embed)
            return

    await interaction.followup.send(f"ℹ️ **{team}** is not playing live right now. Pull scheduled calendar events via `/fixtures` or recent match score logs via `/results` instead.")


@bot.tree.command(name="fixtures", description="View upcoming matches scheduled for a specific team")
@app_commands.describe(team="Name of the team")
@app_commands.autocomplete(team=team_autocomplete)
async def upcoming_fixtures(interaction: discord.Interaction, team: str):
    await interaction.response.defer()
    
    found_matches = []
    for key, lid in COMPETITION_IDS.items():
        league_fixes = await FootballAPI.get_fixtures(lid, days_ahead=config.FIXTURE_LOOKAHEAD_DAYS)
        for fix in league_fixes:
            if team.lower() in fix["teams"]["home"]["name"].lower() or team.lower() in fix["teams"]["away"]["name"].lower():
                found_matches.append(fix)

    if not found_matches:
        await interaction.followup.send(f"📅 No matches scheduled for **{team}** over the next {config.FIXTURE_LOOKAHEAD_DAYS} days.")
        return

    embed = discord.Embed(title=f"📅 Scheduled Matches: {team}", color=Colours.GREEN, timestamp=datetime.now(timezone.utc))
    for fix in found_matches[:5]:
        home = fix["teams"]["home"]["name"]
        away = fix["teams"]["away"]["name"]
        raw_date = fix["fixture"]["date"]
        embed.add_field(
            name=f"🆚 {home} vs {away}",
            value=f"🏆 League: {fix['league']['name']}\n⏰ Kickoff Time: `{raw_date}` (UTC)",
            inline=False
        )
    await interaction.followup.send(embed=embed)


@bot.tree.command(name="results", description="Look up recent completed match results for a specific team")
@app_commands.describe(team="Name of the team")
@app_commands.autocomplete(team=team_autocomplete)
async def match_results(interaction: discord.Interaction, team: str):
    await interaction.response.defer()
    
    found_results = []
    today = datetime.now(timezone.utc)
    for key, lid in COMPETITION_IDS.items():
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
        hg = fix["goals"]["home"] if fix["goals"]["home"] is not None else 0
        ag = fix["goals"]["away"] if fix["goals"]["away"] is not None else 0
        embed.add_field(
            name=f"✅ {home}  `{hg} - {ag}`  {away}",
            value=f"🏆 League: {fix['league']['name']} ({fix['fixture']['status']['long']})",
            inline=False
        )
    await interaction.followup.send(embed=embed)

# ─── 📊 GENERAL LEAGUE STANDINGS & DATA ──────────────────────────────────────

@bot.tree.command(name="table", description="View current league table standings for a competition")
@app_commands.describe(league="The league name (e.g. Premier League, La Liga)")
@app_commands.autocomplete(league=league_autocomplete)
async def league_table(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    
    matched_id = None
    for key, lid in COMPETITION_IDS.items():
        if league.lower() in key.lower():
            matched_id = lid
            league = key
            break
            
    if not matched_id:
        await interaction.followup.send(f"❌ Unknown competition choice: `{league}`. Use the pop-up search choices.")
        return

    standings = await FootballAPI.get_standings(matched_id)
    if not standings:
        await interaction.followup.send(f"❌ Could not retrieve standings for {league} at this time. Verify API subscription tiers.")
        return

    rows = []
    for entry in standings[:12]:
        s = entry[0] if isinstance(entry, list) else entry
        rows.append(
            f"`{s['rank']:>2}.` **{s['team']['name']}** "
            f"— {s['all']['win']}W {s['all']['draw']}D {s['all']['lose']}L  "
            f"Pts: **{s['points']}** GD: {s['goalsDiff']}"
        )

    embed = discord.Embed(
        title=f"📊 {league} Standings Table", 
        description="\n".join(rows) if rows else "No ranking entry matrices found inside this league packet.", 
        color=Colours.BLUE
    )
    await interaction.followup.send(embed=embed)

# ─── 🪙 CARD ECONOMY & GACHA MINIGAME ENGINE ─────────────────────────────────

@bot.tree.command(name="daily", description="Claim your daily bonus of 250 Goalwire coins")
async def economy_daily(interaction: discord.Interaction):
    await interaction.response.defer()
    user_id = interaction.user.id
    profile = await Database.get_profile(user_id)
    now = datetime.now(timezone.utc)
    
    if profile["last_daily"]:
        last_daily_time = datetime.fromisoformat(profile["last_daily"])
        if now - last_daily_time < timedelta(hours=24):
            cooldown_left = timedelta(hours=24) - (now - last_daily_time)
            hours, remainder = divmod(int(cooldown_left.total_seconds()), 3600)
            minutes, _ = divmod(remainder, 60)
            await interaction.followup.send(f"⏳ **Cooldown active!** Come back in `{hours}h {minutes}m` to claim your next bonus daily payment.")
            return

    await Database.adjust_coins(user_id, 250)
    db = Database.conn()
    await db.execute("UPDATE card_profiles SET last_daily=? WHERE user_id=?", (now.isoformat(), user_id))
    await db.commit()
    
    updated_profile = await Database.get_profile(user_id)
    embed = discord.Embed(
        title="🪙 Daily Check-in Granted!",
        description=f"Added **250** coins to your wallet!\n💳 New Total Balance: **{updated_profile['coins']}** coins.",
        color=Colours.GOLD
    )
    await interaction.followup.send(embed=embed)


@bot.tree.command(name="pack", description="Purchase an Elite Player Pack for 500 coins")
async def purchase_pack(interaction: discord.Interaction):
    await interaction.response.defer()
    user_id = interaction.user.id
    profile = await Database.get_profile(user_id)
    
    if profile["coins"] < 500:
        await interaction.followup.send(f"❌ **Insufficient funds!** Packs require `500` coins. Your balance is `{profile['coins']}`. Use `/daily` to earn more.")
        return

    await Database.adjust_coins(user_id, -500)
    
    db = Database.conn()
    cur = await db.execute("SELECT * FROM card_registry ORDER BY RANDOM() LIMIT 1")
    card = await cur.fetchone()
    
    if not card:
        mock_pool = [
            ("Kylian Mbappé", 92, "ST", "Real Madrid", "France", "Icon"),
            ("Erling Haaland", 91, "ST", "Manchester City", "Norway", "Gold"),
            ("Kevin De Bruyne", 90, "CM", "Manchester City", "Belgium", "Gold"),
            ("Jude Bellingham", 88, "CAM", "Real Madrid", "England", "Gold"),
            ("Bukayo Saka", 87, "RW", "Arsenal", "England", "Gold"),
            ("Zinedine Zidane", 94, "CAM", "Icon Club", "France", "Icon")
        ]
        chosen = random.choice(mock_pool)
        await db.execute(
            "INSERT INTO card_registry (player_name, rating, position, club, nationality, rarity) VALUES (?,?,?,?,?,?)",
            chosen
        )
        await db.commit()
        cur = await db.execute("SELECT * FROM card_registry ORDER BY RANDOM() LIMIT 1")
        card = await cur.fetchone()

    await Database.add_card_to_inventory(user_id, card["card_id"])
    card_color = Colours.GOLD if card["rarity"] == "Icon" else Colours.GREEN
    
    embed = discord.Embed(
        title="🎉 Premium Pack Opened!",
        description=f"You opened an **Elite Player Pack** and signed a superstar!\n\n"
                    f"🏃‍♂️ **Player: **\n"
                    f"📊 **Rating**: `{card['rating']}`\n"
                    f"⚔️ **Position**: {card['position']}\n"
                    f"🏆 **Club**: {card['club']} ({card['nationality']})\n"
                    f"✨ **Rarity Tier**: `{card['rarity']}`",
        color=card_color
    )
    embed.set_footer(text=f"500 coins deducted. New Balance: {profile['coins'] - 500} coins.")
    await interaction.followup.send(embed=embed)


@bot.tree.command(name="inventory", description="Display your entire unlocked player card collection inventory")
async def view_inventory(interaction: discord.Interaction):
    await interaction.response.defer()
    user_id = interaction.user.id
    
    profile = await Database.get_profile(user_id)
    cards = await Database.get_inventory(user_id)
    
    embed = discord.Embed(
        title=f"📋 {interaction.user.name}'s Goalwire Club Inventory",
        description=f"💳 Wallet Balance: **{profile['coins']}** coins\n📋 Total Cards Collected: `{len(cards)}`",
        color=Colours.BLUE,
        timestamp=datetime.now(timezone.utc)
    )
    
    if not cards:
        embed.description += "\n\n⚠️ *Your club inventory is completely empty. Run `/pack` to buy your initial items!*"
    else:
        lines = []
        for c in cards[:15]: 
            rarity_label = "⭐ " if c["rarity"] == "Icon" else ""
            lines.append(f"`{c['instance_id']}` 🆔 — {rarity_label}**{c['player_name']}** ({c['rating']} OVR | {c['position']})")
        
        embed.add_field(name="Top Active Roster (Use 🆔 for listings/trades)", value="\n".join(lines), inline=False)
        if len(cards) > 15:
            embed.set_footer(text=f"Showing top 15 out of {len(cards)} total cards.")

    await interaction.followup.send(embed=embed)


@bot.tree.command(name="claim", description="Claim random hourly free items or minor coin amounts")
async def economy_claim(interaction: discord.Interaction):
    await interaction.response.defer()
    user_id = interaction.user.id
    profile = await Database.get_profile(user_id)
    now = datetime.now(timezone.utc)
    
    if profile["last_claim"]:
        last_claim_time = datetime.fromisoformat(profile["last_claim"])
        if now - last_claim_time < timedelta(hours=2):
            cooldown_left = timedelta(hours=2) - (now - last_claim_time)
            minutes, seconds = divmod(int(cooldown_left.total_seconds()), 60)
            await interaction.followup.send(f"⏳ **Claim cooldown!** You can claim your next reward bundle in `{minutes}m {seconds}s`.")
            return

    reward_type = random.choice(["coins", "card"])
    db = Database.conn()
    
    if reward_type == "coins":
        amount = random.randint(50, 150)
        await Database.adjust_coins(user_id, amount)
        embed = discord.Embed(
            title="🎁 Free Claim Drops",
            description=f"You searched the training grounds and found **{amount}** coins!",
            color=Colours.TEAL
        )
    else:
        cur = await db.execute("SELECT * FROM card_registry WHERE rating < 85 ORDER BY RANDOM() LIMIT 1")
        card = await cur.fetchone()
        if not card:
            await db.execute(
                "INSERT INTO card_registry (player_name, rating, position, club, nationality, rarity) VALUES (?,?,?,?,?,?)",
                ("Martin Ødegaard", 84, "CAM", "Arsenal", "Norway", "Silver")
            )
            await db.commit()
            cur = await db.execute("SELECT * FROM card_registry WHERE rating < 85 ORDER BY RANDOM() LIMIT 1")
            card = await cur.fetchone()
            
        await Database.add_card_to_inventory(user_id, card["card_id"])
        embed = discord.Embed(
            title="🎁 Free Claim Drops",
            description=f"You signed a standard squad rotation player for free!\n\n🏃‍♂️ **{card['player_name']}** ({card['rating']} OVR | {card['position']})",
            color=Colours.BLUE
        )

    await db.execute("UPDATE card_profiles SET last_claim=? WHERE user_id=?", (now.isoformat(), user_id))
    await db.commit()
    await interaction.followup.send(embed=embed)


@bot.tree.command(name="market", description="View public listings, sell items, or buy cards")
@app_commands.describe(
    action="Choose: view (see items), sell (list an item), or buy (purchase an item)",
    item_id="The inventory 'instance_id' if selling, or the market 'listing_id' if buying",
    price="The specific total coin price amount you want to sell the card for"
)
async def public_market(interaction: discord.Interaction, action: str, item_id: int | None = None, price: int | None = None):
    await interaction.response.defer()
    action = action.lower()

    if action == "view":
        listings = await Database.get_active_market()
        if not listings:
            await interaction.followup.send("🏪 **The Transfer Market is currently empty.** Be the first to list a player!")
            return
            
        embed = discord.Embed(title="🏪 Goalwire Public Transfer Market", color=Colours.GOLD)
        for list_item in listings[:10]:
            embed.add_field(
                name=f"🆔 List ID: `{list_item['listing_id']}` — {list_item['player_name']} ({list_item['rating']} OVR)",
                value=f"💰 Price: **{list_item['buy_now_price']}** coins\n⏱️ Tier: `{list_item['rarity']}` | Expires in: <t:{int(datetime.fromisoformat(list_item['expires_at'].replace('Z', '+00:00')).timestamp())}:R>",
                inline=False
            )
        await interaction.followup.send(embed=embed)

    elif action == "sell":
        if item_id is None or price is None or price <= 0:
            await interaction.followup.send("❌ **Invalid usage!** To list a player, use: `/market action:sell item_id:[Your Card instance_id] price:[Coins]`")
            return
            
        listing_id = await Database.create_market_listing(interaction.user.id, item_id, price)
        if not listing_id:
            await interaction.followup.send("❌ **Listing Failed.** Verify that you own this card instance ID and it isn't listed elsewhere.")
        else:
            await interaction.followup.send(f"✅ **Player listed successfully!** Your listing ID is `{listing_id}`. Buy via `/market action:buy item_id:{listing_id}`.")

    elif action == "buy":
        if item_id is None:
            await interaction.followup.send("❌ **Missing parameter!** Provide the target `listing_id` to buy: `/market action:buy item_id:[listing_id]`")
            return
            
        success, reason = await Database.buy_from_market(item_id, interaction.user.id)
        if success:
            await interaction.followup.send("🎉 **Transfer complete!** The coins have been exchanged, and the player is now in your `/inventory`!")
        else:
            await interaction.followup.send(f"❌ **Transaction blocked**: {reason}")
    else:
        await interaction.followup.send("❌ Unknown market operation. Choose between `view`, `sell`, or `buy` instead.")


@bot.tree.command(name="trade", description="Directly transfer a card from your inventory to another community user")
@app_commands.describe(
    target_user="The player you want to trade with",
    my_card_id="The exact instance_id of the card you want to gift them"
)
async def direct_trade(interaction: discord.Interaction, target_user: discord.User, my_card_id: int):
    await interaction.response.defer()
    
    if target_user.id == interaction.user.id:
        await interaction.followup.send("❌ You cannot trade players to yourself.")
        return
    if target_user.bot:
        await interaction.followup.send("❌ Bots don't build trading card clubs!")
        return

    success = await Database.transfer_card_direct(my_card_id, interaction.user.id, target_user.id)
    if success:
        embed = discord.Embed(
            title="🤝 Transfer Deal Finalised!",
            description=f"Successfully transferred card instance ID `{my_card_id}` from {interaction.user.mention} to {target_user.mention}'s club roster!",
            color=Colours.GREEN
        )
        await interaction.followup.send(embed=embed)
    else:
        await interaction.followup.send("❌ **Trade rejected.** Make sure you own that card instance ID and it isn't listed on the open marketplace.")

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
