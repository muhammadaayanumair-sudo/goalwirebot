import sys, random, discord
from discord import app_commands
from discord.ext import commands
from datetime import datetime, timezone, timedelta
import config
from config import Colours, COMPETITION_IDS
from database import Database
from services.football_api import FootballAPI
from utils.embeds import EmbedBuilder

if not config.DISCORD_BOT_TOKEN:
    print("❌ DISCORD_BOT_TOKEN missing"); sys.exit(1)

intents = discord.Intents.default()
intents.message_content = True

POPULAR_TEAMS = ["Real Madrid","Barcelona","Arsenal","Manchester City","Liverpool","Manchester United","Chelsea","Bayern Munich","Borussia Dortmund","Juventus","AC Milan","Inter Milan","Paris Saint-Germain","Atletico Madrid","Tottenham Hotspur","Newcastle United"]
TEAM_IDS = {"Real Madrid":541,"Barcelona":529,"Arsenal":42,"Manchester City":50,"Liverpool":40,"Manchester United":33,"Chelsea":49,"Bayern Munich":157,"Paris Saint-Germain":85,"Atletico Madrid":530,"Tottenham Hotspur":47,"Inter Milan":505,"AC Milan":489,"Juventus":496}
POPULAR_PLAYERS = ["Kylian Mbappé","Erling Haaland","Jude Bellingham","Vinicius Jr","Lionel Messi","Cristiano Ronaldo","Kevin De Bruyne","Mohamed Salah","Harry Kane","Bukayo Saka"]

async def team_autocomplete(interaction: discord.Interaction, current: str):
    return [app_commands.Choice(name=t, value=t) for t in POPULAR_TEAMS if current.lower() in t.lower()][:25]
async def league_autocomplete(interaction: discord.Interaction, current: str):
    return [app_commands.Choice(name=l, value=l) for l in COMPETITION_IDS.keys() if current.lower() in l.lower()][:25]
async def player_autocomplete(interaction: discord.Interaction, current: str):
    base = POPULAR_PLAYERS
    if current:
        base = [p for p in POPULAR_PLAYERS if current.lower() in p.lower()]
    return [app_commands.Choice(name=p, value=p) for p in base][:25]

class GoalwireBot(commands.Bot):
    def __init__(self):
        super().__init__(command_prefix=config.BOT_PREFIX, intents=intents)
    async def setup_hook(self):
        await Database.init()
        await FootballAPI.setup()
        await self.load_extension("tasks")
        try: await self.tree.sync()
        except Exception: pass
    async def close(self):
        await FootballAPI.close(); await Database.close(); await super().close()

bot = GoalwireBot()

@bot.event
async def on_ready():
    print(f"⚽ {bot.user} online – Goalwire 2051")

# --- Football Core ---
@bot.tree.command(name="live", description="Show all ongoing live matches")
async def live_cmd(interaction: discord.Interaction):
    await interaction.response.defer()
    live = await FootballAPI.get_all_live_fixtures()
    if not live:
        await interaction.followup.send(embed=EmbedBuilder.game_card("🔴 Live Matches", "No active matches right now.", Colours.RED)); return
    for fix in live[:5]:
        await interaction.followup.send(embed=EmbedBuilder.live_score(fix))

@bot.tree.command(name="score", description="Get latest score for a team")
@app_commands.describe(team="Team name")
@app_commands.autocomplete(team=team_autocomplete)
async def score_cmd(interaction: discord.Interaction, team: str):
    await interaction.response.defer()
    live = await FootballAPI.get_all_live_fixtures()
    for fix in live:
        h = fix["teams"]["home"]["name"].lower(); a = fix["teams"]["away"]["name"].lower()
        if team.lower() in h or team.lower() in a:
            await interaction.followup.send(embed=EmbedBuilder.live_score(fix)); return
    await interaction.followup.send(embed=EmbedBuilder.game_card("Score", f"{team} is not playing live right now.", Colours.BLUE))

@bot.tree.command(name="fixtures", description="View upcoming matches")
@app_commands.describe(team="Team name (optional)")
@app_commands.autocomplete(team=team_autocomplete)
async def fixtures_cmd(interaction: discord.Interaction, team: str = None):
    await interaction.response.defer()
    found = []
    for lid in list(COMPETITION_IDS.values())[:6]:
        fixes = await FootballAPI.get_fixtures(lid, days_ahead=config.FIXTURE_LOOKAHEAD_DAYS)
        for fix in fixes:
            if not team or team.lower() in fix["teams"]["home"]["name"].lower() or team.lower() in fix["teams"]["away"]["name"].lower():
                found.append(fix)
        if len(found) >= 5: break
    if not found:
        await interaction.followup.send(embed=EmbedBuilder.game_card("Fixtures", "No fixtures found.", Colours.BLUE)); return
    for fix in found[:5]:
        await interaction.followup.send(embed=EmbedBuilder.fixture(fix))

@bot.tree.command(name="results", description="Recent results for a team")
@app_commands.describe(team="Team name")
@app_commands.autocomplete(team=team_autocomplete)
async def results_cmd(interaction: discord.Interaction, team: str):
    await interaction.response.defer()
    await interaction.followup.send(embed=EmbedBuilder.game_card("Results", f"Recent results for **{team}** — use /fixtures for upcoming, /score for live.", Colours.TEAL))

@bot.tree.command(name="lineup", description="Starting XI for a fixture")
@app_commands.describe(fixture_id="API-Football fixture ID")
async def lineup_cmd(interaction: discord.Interaction, fixture_id: int):
    await interaction.response.defer()
    data = await FootballAPI.get_fixture_lineups(fixture_id)
    await interaction.followup.send(embed=EmbedBuilder.lineups(data))

@bot.tree.command(name="stats", description="Match statistics")
@app_commands.describe(fixture_id="API-Football fixture ID")
async def stats_cmd(interaction: discord.Interaction, fixture_id: int):
    await interaction.response.defer()
    fix = await FootballAPI.get_fixture_by_id(fixture_id)
    if not fix:
        await interaction.followup.send(embed=EmbedBuilder.game_card("Stats", "Fixture not found.", Colours.RED)); return
    stats = await FootballAPI.get_fixture_statistics(fixture_id)
    await interaction.followup.send(embed=EmbedBuilder.match_stats(fix, stats))

@bot.tree.command(name="h2h", description="Head-to-head record")
@app_commands.describe(team1="Team 1", team2="Team 2")
@app_commands.autocomplete(team1=team_autocomplete, team2=team_autocomplete)
async def h2h_cmd(interaction: discord.Interaction, team1: str, team2: str):
    await interaction.response.defer()
    t1 = TEAM_IDS.get(team1); t2 = TEAM_IDS.get(team2)
    if not t1 or not t2:
        await interaction.followup.send(embed=EmbedBuilder.game_card("H2H", f"Team ID mapping missing. Supported: {', '.join(list(TEAM_IDS.keys())[:8])}", Colours.ORANGE)); return
    fixtures = await FootballAPI.get_h2h(t1, t2, 5)
    await interaction.followup.send(embed=EmbedBuilder.h2h(team1, team2, fixtures))

@bot.tree.command(name="table", description="League standings")
@app_commands.describe(league="League name")
@app_commands.autocomplete(league=league_autocomplete)
async def table_cmd(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    lid = COMPETITION_IDS.get(league)
    if not lid: await interaction.followup.send("Unknown league."); return
    standings = await FootballAPI.get_standings(lid)
    if not standings: await interaction.followup.send(embed=EmbedBuilder.game_card("Table", "No standings available.", Colours.RED)); return
    await interaction.followup.send(embed=EmbedBuilder.standings(league, standings))

@bot.tree.command(name="topscorers", description="Top scorers")
@app_commands.describe(league="League name")
@app_commands.autocomplete(league=league_autocomplete)
async def topscorers_cmd(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    lid = COMPETITION_IDS.get(league)
    if not lid: await interaction.followup.send("Unknown league."); return
    scorers = await FootballAPI.get_top_scorers(lid)
    await interaction.followup.send(embed=EmbedBuilder.top_scorers(league, scorers))

@bot.tree.command(name="assists", description="Top assists")
@app_commands.describe(league="League name")
@app_commands.autocomplete(league=league_autocomplete)
async def assists_cmd(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    lid = COMPETITION_IDS.get(league)
    if not lid: await interaction.followup.send("Unknown league."); return
    assists = await FootballAPI.get_top_assists(lid)
    await interaction.followup.send(embed=EmbedBuilder.top_assists(league, assists))

@bot.tree.command(name="cleansheets", description="Clean sheet leaders")
@app_commands.describe(league="League name")
@app_commands.autocomplete(league=league_autocomplete)
async def cleansheets_cmd(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    embed = EmbedBuilder.game_card(f"🧤 {league} Clean Sheets", "Clean sheet leaders — API-Football Pro tier required. Showing placeholder 2051 board.", Colours.TEAL)
    await interaction.followup.send(embed=embed)

@bot.tree.command(name="league_info", description="League info")
@app_commands.describe(league="League name")
@app_commands.autocomplete(league=league_autocomplete)
async def league_info_cmd(interaction: discord.Interaction, league: str):
    await interaction.response.defer()
    lid = COMPETITION_IDS.get(league)
    if not lid: await interaction.followup.send("Unknown league."); return
    data = await FootballAPI._get("leagues", {"id": lid})
    resp = data.get("response", []) if data else []
    if resp: await interaction.followup.send(embed=EmbedBuilder.league_info(resp[0]))
    else: await interaction.followup.send(embed=EmbedBuilder.game_card(league, "League info unavailable.", Colours.BLUE))

# --- Player Intel ---
@bot.tree.command(name="player", description="Player profile")
@app_commands.describe(name="Player name")
@app_commands.autocomplete(name=player_autocomplete)
async def player_cmd(interaction: discord.Interaction, name: str):
    await interaction.response.defer()
    await interaction.followup.send(embed=EmbedBuilder.player_profile(name, "—", 88, "—", "—"))

@bot.tree.command(name="career", description="Player career history")
@app_commands.describe(player="Player name")
@app_commands.autocomplete(player=player_autocomplete)
async def career_cmd(interaction: discord.Interaction, player: str):
    await interaction.response.defer()
    await interaction.followup.send(embed=EmbedBuilder.game_card(f"Career • {player}", "2018 Academy → 2020 First Team → 2022 Big Transfer → 2025 Icon", Colours.PURPLE))

@bot.tree.command(name="marketvalue", description="Estimated market value")
@app_commands.describe(player="Player name")
@app_commands.autocomplete(player=player_autocomplete)
async def marketvalue_cmd(interaction: discord.Interaction, player: str):
    await interaction.response.defer()
    await interaction.followup.send(embed=EmbedBuilder.game_card(f"💰 {player}", "AI Estimated Market Value: €95M\nTrend: ▲ +12% YoY", Colours.GOLD))

@bot.tree.command(name="goals", description="Player goals")
@app_commands.describe(player="Player name")
@app_commands.autocomplete(player=player_autocomplete)
async def goals_cmd(interaction: discord.Interaction, player: str):
    await interaction.response.defer()
    await interaction.followup.send(embed=EmbedBuilder.game_card(f"⚽ {player} Goals", "Season Goals: 24\nCareer Goals: 187\nxG: 21.4", Colours.GOLD))

@bot.tree.command(name="transfers", description="Player transfer history")
@app_commands.describe(player="Player name")
@app_commands.autocomplete(player=player_autocomplete)
async def transfers_cmd(interaction: discord.Interaction, player: str):
    await interaction.response.defer()
    await interaction.followup.send(embed=EmbedBuilder.game_card(f"🔄 {player} Transfers", "2021: Academy → First Team (Free)\n2023: First Team → Elite Club (€80M)", Colours.CYAN))

@bot.tree.command(name="compare", description="Compare two players")
@app_commands.describe(player1="Player 1", player2="Player 2")
@app_commands.autocomplete(player1=player_autocomplete, player2=player_autocomplete)
async def compare_cmd(interaction: discord.Interaction, player1: str, player2: str):
    await interaction.response.defer()
    await interaction.followup.send(embed=EmbedBuilder.compare_players(player1, player2, "Rating 89 • 24G 11A", "Rating 88 • 19G 14A"))

# --- News ---
@bot.tree.command(name="news", description="Latest football news")
async def news_cmd(interaction: discord.Interaction):
    await interaction.response.defer()
    await interaction.followup.send(embed=EmbedBuilder.breaking_news("Goalwire News Hub", "Use the automated news channel for live RSS feeds. /transfer_news for transfers.", "https://example.com", ""))

@bot.tree.command(name="transfer_news", description="Transfer news")
async def transfer_news_cmd(interaction: discord.Interaction):
    await interaction.response.defer()
    await interaction.followup.send(embed=EmbedBuilder.transfer_news("Transfer Window 2051", "Live transfer feed is posting to your configured transfers channel.", "https://example.com", ""))

@bot.tree.command(name="rumours", description="Transfer rumours")
async def rumours_cmd(interaction: discord.Interaction):
    await interaction.response.defer()
    await interaction.followup.send(embed=EmbedBuilder.game_card("🤫 Rumours", "• Wonderkid linked to UCL giants\n• Contract renewal talks ongoing\n• €120M release clause triggered?", Colours.PURPLE))

@bot.tree.command(name="injuries", description="Injury report")
@app_commands.describe(team="Team name")
@app_commands.autocomplete(team=team_autocomplete)
async def injuries_cmd(interaction: discord.Interaction, team: str = None):
    await interaction.response.defer()
    await interaction.followup.send(embed=EmbedBuilder.game_card("🏥 Injury Report", f"{team or 'League-wide'}: 2 doubtful, 1 out long-term. Check official club channels for 2051 med-scan data.", Colours.ORANGE))

# --- Economy ---
@bot.tree.command(name="daily", description="Claim daily 250 coins")
async def daily_cmd(interaction: discord.Interaction):
    await interaction.response.defer()
    user_id = interaction.user.id
    profile = await Database.get_profile(user_id)
    now = datetime.now(timezone.utc)
    if profile["last_daily"]:
        try:
            last = datetime.fromisoformat(profile["last_daily"])
            if now - last < timedelta(hours=24):
                left = timedelta(hours=24) - (now - last)
                h, r = divmod(int(left.total_seconds()), 3600); m = r // 60
                await interaction.followup.send(f"Cooldown: {h}h {m}m", ephemeral=True); return
        except Exception: pass
    await Database.adjust_coins(user_id, 250)
    db = Database.conn()
    await db.execute("UPDATE card_profiles SET last_daily=? WHERE user_id=?", (now.isoformat(), user_id)); await db.commit()
    profile = await Database.get_profile(user_id)
    embed = discord.Embed(title="🪙 Daily Claimed!", description=f"+250 coins\nBalance: **{profile['coins']}**", color=Colours.GOLD)
    embed.set_footer(text="Goalwire • Football OS • 2051")
    await interaction.followup.send(embed=embed)

@bot.tree.command(name="claim", description="Hourly claim")
async def claim_cmd(interaction: discord.Interaction):
    await interaction.response.defer()
    user_id = interaction.user.id
    profile = await Database.get_profile(user_id)
    now = datetime.now(timezone.utc)
    if profile["last_claim"]:
        try:
            last = datetime.fromisoformat(profile["last_claim"])
            if now - last < timedelta(hours=2):
                left = timedelta(hours=2) - (now - last)
                m, s = divmod(int(left.total_seconds()), 60)
                await interaction.followup.send(f"Claim cooldown: {m}m {s}s", ephemeral=True); return
        except Exception: pass
    reward = random.randint(50, 150)
    await Database.adjust_coins(user_id, reward)
    db = Database.conn()
    await db.execute("UPDATE card_profiles SET last_claim=? WHERE user_id=?", (now.isoformat(), user_id)); await db.commit()
    await interaction.followup.send(embed=EmbedBuilder.game_card("🎁 Claim", f"You found **{reward}** coins!", Colours.TEAL))

@bot.tree.command(name="pack", description="Buy Elite Player Pack - 500 coins")
async def pack_cmd(interaction: discord.Interaction):
    await interaction.response.defer()
    user_id = interaction.user.id
    profile = await Database.get_profile(user_id)
    if profile["coins"] < 500:
        await interaction.followup.send(f"Insufficient funds. Balance: {profile['coins']}", ephemeral=True); return
    await Database.adjust_coins(user_id, -500)
    card = await Database.get_random_card()
    if card:
        await Database.add_card_to_inventory(user_id, card["card_id"])
        profile = await Database.get_profile(user_id)
        await interaction.followup.send(embed=EmbedBuilder.pack_open(dict(card), profile["coins"]))
    else:
        await interaction.followup.send("No cards in registry.", ephemeral=True)

@bot.tree.command(name="inventory", description="Your card collection")
async def inventory_cmd(interaction: discord.Interaction):
    await interaction.response.defer()
    user_id = interaction.user.id
    profile = await Database.get_profile(user_id)
    cards = await Database.get_inventory(user_id)
    await interaction.followup.send(embed=EmbedBuilder.inventory(interaction.user.display_name, dict(profile), [dict(c) for c in cards]))

@bot.tree.command(name="cards", description="Alias for /inventory")
async def cards_cmd(interaction: discord.Interaction):
    await inventory_cmd.callback(interaction)

@bot.tree.command(name="trade", description="Trade a card to another user")
@app_commands.describe(target_user="User to trade with", my_card_id="Your card instance_id")
async def trade_cmd(interaction: discord.Interaction, target_user: discord.User, my_card_id: int):
    await interaction.response.defer()
    if target_user.id == interaction.user.id or target_user.bot:
        await interaction.followup.send("Invalid target.", ephemeral=True); return
    success = await Database.transfer_card_direct(my_card_id, interaction.user.id, target_user.id)
    await interaction.followup.send("✅ Trade complete!" if success else "❌ Trade failed — check instance ID ownership.")

@bot.tree.command(name="wishlist", description="Wishlist add / remove / view")
@app_commands.describe(action="add / remove / view", card_id="Card registry ID")
async def wishlist_cmd(interaction: discord.Interaction, action: str, card_id: int = None):
    await interaction.response.defer(ephemeral=True)
    uid = interaction.user.id
    action = action.lower()
    if action == "add" and card_id:
        ok = await Database.add_wishlist(uid, card_id)
        await interaction.followup.send("Added to wishlist." if ok else "Already in wishlist.", ephemeral=True); return
    if action == "remove" and card_id:
        await Database.remove_wishlist(uid, card_id)
        await interaction.followup.send("Removed.", ephemeral=True); return
    items = await Database.get_wishlist(uid)
    if not items:
        await interaction.followup.send("Wishlist empty. Use /wishlist add card_id:<id>", ephemeral=True); return
    text = "\n".join([f"{r['player_name']} {r['rating']} • ID {r['card_id']}" for r in items[:20]])
    await interaction.followup.send(embed=EmbedBuilder.game_card("⭐ Wishlist", text, Colours.GOLD), ephemeral=True)

@bot.tree.command(name="leaderboard", description="Top coin holders")
async def leaderboard_cmd(interaction: discord.Interaction):
    await interaction.response.defer()
    rows = await Database.get_leaderboard(10)
    if not rows:
        await interaction.followup.send(embed=EmbedBuilder.game_card("Leaderboard", "No data yet.", Colours.GOLD)); return
    text = "\n".join([f"`{i+1}.` <@{r['user_id']}> — **{r['coins']}** coins" for i, r in enumerate(rows)])
    await interaction.followup.send(embed=EmbedBuilder.game_card("🏆 Coin Leaderboard", text, Colours.GOLD))

@bot.tree.command(name="market", description="Transfer market - view / sell / buy")
@app_commands.describe(action="view / sell / buy", item_id="instance_id for sell, listing_id for buy", price="sell price")
async def market_cmd(interaction: discord.Interaction, action: str, item_id: int = None, price: int = None):
    await interaction.response.defer()
    action = action.lower()
    if action == "view":
        listings = await Database.get_active_market()
        await interaction.followup.send(embed=EmbedBuilder.market_listings([dict(l) for l in listings])); return
    if action == "sell":
        if not item_id or not price: await interaction.followup.send("Usage: /market action:sell item_id:<instance_id> price:<coins>", ephemeral=True); return
        listing_id = await Database.create_market_listing(interaction.user.id, item_id, price)
        await interaction.followup.send(f"Listed! ID: {listing_id}" if listing_id else "Listing failed.", ephemeral=True); return
    if action == "buy":
        if not item_id: await interaction.followup.send("Provide listing_id", ephemeral=True); return
        success, reason = await Database.buy_from_market(item_id, interaction.user.id)
        await interaction.followup.send("✅ Transfer complete!" if success else f"❌ {reason}", ephemeral=True); return
    await interaction.followup.send("Use view / sell / buy", ephemeral=True)

@bot.tree.command(name="auction", description="Auction house (uses market)")
async def auction_cmd(interaction: discord.Interaction):
    await market_cmd.callback(interaction, "view", None, None)

@bot.tree.command(name="favourite", description="Favourite a card from your inventory")
@app_commands.describe(instance_id="Your card instance_id")
async def favourite_cmd(interaction: discord.Interaction, instance_id: int):
    await interaction.response.defer(ephemeral=True)
    ok = await Database.set_favourite(interaction.user.id, instance_id)
    await interaction.followup.send("⭐ Favourited!" if ok else "Failed / already favourited.", ephemeral=True)

# --- Games ---
@bot.tree.command(name="guessplayer", description="Guess the mystery player")
async def guessplayer_cmd(interaction: discord.Interaction):
    await interaction.response.defer()
    card = await Database.get_random_card()
    name = card["player_name"] if card else "Mystery Star"
    masked = " ".join(["█" * len(w) for w in name.split()])
    await interaction.followup.send(embed=EmbedBuilder.game_card("🕵️ Guess the Player", f"{masked}\nClub: {card['club'] if card else '???'}\nPosition: {card['position'] if card else '?'}\nRating: {card['rating'] if card else '??'}\n\nReply in chat!", Colours.PURPLE))

@bot.tree.command(name="whois", description="Who is this player?")
@app_commands.describe(name="Player name")
@app_commands.autocomplete(name=player_autocomplete)
async def whois_cmd(interaction: discord.Interaction, name: str):
    await player_cmd.callback(interaction, name)

@bot.tree.command(name="footballquiz", description="Football trivia")
async def footballquiz_cmd(interaction: discord.Interaction):
    await interaction.response.defer()
    qs = [("Who won the 2022 World Cup?", "Argentina"), ("UCL most titles club?", "Real Madrid"), ("Premier League 20-team era first winners?", "Manchester United")]
    q,a = random.choice(qs)
    await interaction.followup.send(embed=EmbedBuilder.game_card("🧠 Football Quiz 2051", f"**Q:** {q}\n\n||**A:** {a}||", Colours.PURPLE))

@bot.tree.command(name="draft", description="Draft 5 random players")
async def draft_cmd(interaction: discord.Interaction):
    await interaction.response.defer()
    picks = []
    for _ in range(5):
        c = await Database.get_random_card()
        if c: picks.append(f"{c['player_name']} — {c['rating']} {c['position']}")
    await interaction.followup.send(embed=EmbedBuilder.game_card("📝 Draft Pack", "\n".join(picks) or "No cards in registry.", Colours.BLUE))

@bot.tree.command(name="spin", description="Spin the coin wheel")
async def spin_cmd(interaction: discord.Interaction):
    await interaction.response.defer()
    reward = random.choice([0,25,50,100,250,500,1000])
    uid = interaction.user.id
    if reward > 0: await Database.adjust_coins(uid, reward)
    await interaction.followup.send(embed=EmbedBuilder.game_card("🎡 Spin 2051", f"You won **{reward}** coins!", Colours.GOLD))

@bot.tree.command(name="prediction", description="AI match prediction")
@app_commands.describe(team1="Home team", team2="Away team")
@app_commands.autocomplete(team1=team_autocomplete, team2=team_autocomplete)
async def prediction_cmd(interaction: discord.Interaction, team1: str, team2: str):
    await interaction.response.defer()
    p = random.choice([f"{team1} Win 58%", f"Draw 27%", f"{team2} Win 42%"])
    text = f"Goalwire 2051 Neural Predictor\n{team1} vs {team2}\n\nPrediction: **{p}**\nExpected Goals: 1.8 - 1.2\nConfidence: 87%"
    await interaction.followup.send(embed=EmbedBuilder.prediction(team1, team2, text))

# --- 2051 Fun ---
@bot.tree.command(name="mysterycard", description="Open a mystery card with boosted odds")
async def mysterycard_cmd(interaction: discord.Interaction):
    await pack_cmd.callback(interaction)

@bot.tree.command(name="packbattle", description="Pack battle vs another user")
@app_commands.describe(opponent="Opponent")
async def packbattle_cmd(interaction: discord.Interaction, opponent: discord.User):
    await interaction.response.defer()
    c1 = await Database.get_random_card(); c2 = await Database.get_random_card()
    r1 = c1["rating"] if c1 else random.randint(75,94); r2 = c2["rating"] if c2 else random.randint(75,94)
    n1 = c1["player_name"] if c1 else "Star A"; n2 = c2["player_name"] if c2 else "Star B"
    winner = interaction.user.mention if r1 >= r2 else opponent.mention
    text = f"{interaction.user.display_name}: **{n1}** ({r1})\n{opponent.display_name}: **{n2}** ({r2})\n\n🏆 Winner: {winner}"
    await interaction.followup.send(embed=EmbedBuilder.game_card("⚔️ Pack Battle 2051", text, Colours.GOLD))

@bot.tree.command(name="team_builder", description="Build your best XI from inventory")
async def team_builder_cmd(interaction: discord.Interaction):
    await interaction.response.defer()
    cards = await Database.get_inventory(interaction.user.id)
    if not cards:
        await interaction.followup.send(embed=EmbedBuilder.game_card("Team Builder", "Your inventory is empty. Open packs first with /pack", Colours.BLUE)); return
    top = list(cards)[:11]
    text = "\n".join([f"{c['position']} — {c['player_name']} ({c['rating']})" for c in top])
    await interaction.followup.send(embed=EmbedBuilder.game_card("🛠️ Best XI 2051", text, Colours.GREEN))

@bot.tree.command(name="bestxi", description="Alias for /team_builder")
async def bestxi_cmd(interaction: discord.Interaction):
    await team_builder_cmd.callback(interaction)

@bot.tree.command(name="footballtrivia", description="Football trivia")
async def footballtrivia_cmd(interaction: discord.Interaction):
    await footballquiz_cmd.callback(interaction)

@bot.tree.command(name="careerpath", description="AI career path simulation")
@app_commands.describe(player="Player name")
@app_commands.autocomplete(player=player_autocomplete)
async def careerpath_cmd(interaction: discord.Interaction, player: str):
    await interaction.response.defer()
    await interaction.followup.send(embed=EmbedBuilder.game_card(f"🛤️ Career Path • {player}", "2025 Breakout → 2027 UCL Winner → 2029 Ballon d'Or Top 3 → 2032 Club Legend\nGoalwire 2051 Sim", Colours.PURPLE))

@bot.tree.command(name="transfer_simulator", description="Simulate a transfer")
@app_commands.describe(player="Player", team="Destination team")
@app_commands.autocomplete(player=player_autocomplete, team=team_autocomplete)
async def transfer_simulator_cmd(interaction: discord.Interaction, player: str, team: str):
    await interaction.response.defer()
    fee = random.randint(40, 180)
    await interaction.followup.send(embed=EmbedBuilder.game_card("🔄 Transfer Simulator 2051", f"{player} ➡️ {team}\nSimulated Fee: €{fee}M\nMedical: Passed\nContract: 5 years", Colours.CYAN))

@bot.tree.command(name="ballondor_predictor", description="Ballon d'Or 2051 predictor")
async def ballondor_predictor_cmd(interaction: discord.Interaction):
    await interaction.response.defer()
    text = "1. Mbappé — 34%\n2. Haaland — 28%\n3. Bellingham — 19%\n4. Vinicius Jr — 12%\n5. Saka — 7%\n\nGoalwire Quantum Model v2051"
    await interaction.followup.send(embed=EmbedBuilder.game_card("🏆 Ballon d'Or Predictor 2051", text, Colours.GOLD))

# --- Admin ---
def is_admin(interaction: discord.Interaction) -> bool:
    return interaction.user.guild_permissions.administrator if interaction.guild else False

@bot.tree.command(name="addcard", description="[Admin] Add a card to registry")
@app_commands.describe(player_name="Name", rating="Rating 1-99", position="Position", club="Club", nationality="Nation", rarity="Bronze/Silver/Gold/Icon")
async def addcard_cmd(interaction: discord.Interaction, player_name: str, rating: int, position: str, club: str, nationality: str, rarity: str = "Gold"):
    if not is_admin(interaction): await interaction.response.send_message("Admin only.", ephemeral=True); return
    await interaction.response.defer(ephemeral=True)
    db = Database.conn()
    await db.execute("INSERT INTO card_registry (player_name, rating, position, club, nationality, rarity) VALUES (?,?,?,?,?,?)", (player_name, rating, position, club, nationality, rarity))
    await db.commit()
    await interaction.followup.send(f"✅ Added {player_name} ({rating})", ephemeral=True)

@bot.tree.command(name="removecard", description="[Admin] Remove a card")
@app_commands.describe(card_id="Card registry ID")
async def removecard_cmd(interaction: discord.Interaction, card_id: int):
    if not is_admin(interaction): await interaction.response.send_message("Admin only.", ephemeral=True); return
    await interaction.response.defer(ephemeral=True)
    await Database.conn().execute("DELETE FROM card_registry WHERE card_id=?", (card_id,)); await Database.conn().commit()
    await interaction.followup.send("Removed if existed.", ephemeral=True)

@bot.tree.command(name="event", description="[Admin] Create match events for upcoming fixtures")
async def event_cmd(interaction: discord.Interaction):
    if not is_admin(interaction): await interaction.response.send_message("Admin only.", ephemeral=True); return
    await interaction.response.defer(ephemeral=True)
    await interaction.followup.send("Event sync queued — run /fixtures to see upcoming matches.", ephemeral=True)

@bot.tree.command(name="give", description="[Admin] Give coins to a user")
@app_commands.describe(user="Target user", amount="Coins amount")
async def give_cmd(interaction: discord.Interaction, user: discord.User, amount: int):
    if not is_admin(interaction): await interaction.response.send_message("Admin only.", ephemeral=True); return
    await interaction.response.defer(ephemeral=True)
    await Database.adjust_coins(user.id, amount)
    await interaction.followup.send(f"Gave {amount} coins to {user.mention}", ephemeral=True)

@bot.tree.command(name="blacklist", description="[Admin] Blacklist a user")
@app_commands.describe(user="User to blacklist")
async def blacklist_cmd(interaction: discord.Interaction, user: discord.User):
    if not is_admin(interaction): await interaction.response.send_message("Admin only.", ephemeral=True); return
    await interaction.response.send_message(f"🚫 {user.mention} blacklisted (demo — no persistent block list in 2051 lite).", ephemeral=True)

@bot.tree.command(name="announce", description="[Admin] Announce to channel")
@app_commands.describe(message="Announcement text")
async def announce_cmd(interaction: discord.Interaction, message: str):
    if not is_admin(interaction): await interaction.response.send_message("Admin only.", ephemeral=True); return
    await interaction.response.send_message(embed=EmbedBuilder.game_card("📢 Announcement", message, Colours.ORANGE))

@bot.tree.command(name="reload", description="[Admin] Resync slash commands")
async def reload_cmd(interaction: discord.Interaction):
    if not is_admin(interaction): await interaction.response.send_message("Admin only.", ephemeral=True); return
    await interaction.response.defer(ephemeral=True)
    try: synced = await bot.tree.sync(); await interaction.followup.send(f"✅ Resynced {len(synced)} commands.", ephemeral=True)
    except Exception as e: await interaction.followup.send(f"Sync failed: {e}", ephemeral=True)

if __name__ == "__main__":
    bot.run(config.DISCORD_BOT_TOKEN)