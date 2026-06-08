import discord
from discord.ext import commands, tasks
from discord import app_commands
import aiosqlite
import os
import aiohttp
import asyncio
import random
from datetime import datetime, timedelta

TOKEN = os.getenv("DISCORD_TOKEN")
FOOTBALL_API_KEY = os.getenv("FOOTBALL_API_KEY")

intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

# ===== 200+ TEAM IDs - COVERS ALL MAJOR LEAGUES =====
TEAM_IDS = {
    # Premier League
    "arsenal": 57, "arsenal fc": 57,
    "aston villa": 58, "aston villa fc": 58,
    "brentford": 402, "brentford fc": 402,
    "brighton": 397, "brighton & hove albion": 397,
    "burnley": 328, "burnley fc": 328,
    "chelsea": 61, "chelsea fc": 61,
    "crystal palace": 354, "crystal palace fc": 354,
    "everton": 62, "everton fc": 62,
    "fulham": 63, "fulham fc": 63,
    "liverpool": 64, "liverpool fc": 64,
    "luton": 389, "luton town": 389,
    "man city": 65, "manchester city": 65, "manchester city fc": 65,
    "man united": 66, "manchester united": 66, "manchester united fc": 66,
    "newcastle": 67, "newcastle united": 67, "newcastle united fc": 67,
    "nottingham": 351, "nottingham forest": 351,
    "sheffield united": 356, "sheffield utd": 356,
    "tottenham": 73, "tottenham hotspur": 73, "spurs": 73, "tottenham hotspur fc": 73,
    "west ham": 563, "west ham united": 563,
    "wolves": 76, "wolverhampton": 76, "wolverhampton wanderers": 76,
    
    # La Liga
    "real madrid": 86, "real madrid cf": 86,
    "barcelona": 81, "fc barcelona": 81, "barca": 81,
    "atletico": 78, "atletico madrid": 78, "atlético de madrid": 78,
    "real sociedad": 92,
    "real betis": 90,
    "villarreal": 94, "villarreal cf": 94,
    "athletic": 77, "athletic club": 77, "athletic bilbao": 77,
    "sevilla": 79, "sevilla fc": 79,
    "valencia": 95, "valencia cf": 95,
    "osasuna": 79,
    "getafe": 82, "getafe cf": 82,
    "las palmas": 275,
    "alaves": 263,
    "mallorca": 89, "rcd mallorca": 89,
    "cadiz": 264,
    "granada": 83,
    "almeria": 267,
    "celta": 558, "celta vigo": 558,
    "girona": 298,
    
    # Bundesliga
    "bayern": 5, "bayern munich": 5, "fc bayern münchen": 5,
    "dortmund": 4, "borussia dortmund": 4,
    "leipzig": 721, "rb leipzig": 721,
    "leverkusen": 3, "bayer leverkusen": 3, "bayer 04 leverkusen": 3,
    "frankfurt": 19, "eintracht frankfurt": 19,
    "union berlin": 28,
    "freiburg": 17, "sc freiburg": 17,
    "mainz": 15, "mainz 05": 15,
    "wolfsburg": 11, "vfl wolfsburg": 11,
    "gladbach": 18, "borussia mönchengladbach": 18,
    "köln": 1, "fc köln": 1, "1. fc köln": 1, "koln": 1,
    "hoffenheim": 2, "tsg hoffenheim": 2,
    "augsburg": 16, "fc augsburg": 16,
    "stuttgart": 10, "vfb stuttgart": 10,
    "werder": 12, "werder bremen": 12,
    "bochum": 36, "vfl bochum": 36,
    "heidenheim": 44,
    "darmstadt": 20,
    
    # Serie A
    "inter": 108, "inter milan": 108, "fc internazionale milano": 108,
    "milan": 98, "ac milan": 98,
    "juventus": 109, "juventus fc": 109,
    "napoli": 113, "ssc napoli": 113,
    "roma": 100, "as roma": 100,
    "lazio": 110, "ss lazio": 110,
    "atalanta": 102, "atalanta bc": 102,
    "fiorentina": 99,
    "bologna": 103,
    "torino": 586,
    "monza": 5911,
    "lecce": 5890,
    "genoa": 107,
    "cagliari": 104,
    "verona": 450,
    "frosinone": 470,
    "udinese": 115,
    "empoli": 445,
    "sassuolo": 471,
    "salernitana": 455,
    
    # Ligue 1
    "psg": 524, "paris saint-germain": 524, "paris saint-germain fc": 524,
    "marseille": 516, "olympique de marseille": 516,
    "monaco": 548, "as monaco": 548, "as monaco fc": 548,
    "lyon": 523, "olympique lyonnais": 523,
    "lille": 521, "losc lille": 521,
    "nice": 522, "ogc nice": 522,
    "lens": 546, "rc lens": 546,
    "rennes": 529, "stade rennais": 529,
    "reims": 547,
    "montpellier": 518,
    "strasbourg": 526,
    "nantes": 543,
    "toulouse": 511,
    "lorient": 525,
    "metz": 545,
    "brest": 512,
    "clermont": 541,
    "le havre": 533,
    
    # Other Top Teams
    "ajax": 678, "afc ajax": 678,
    "psv": 674,
    "feyenoord": 675,
    "benfica": 1903, "sl benfica": 1903,
    "porto": 503, "fc porto": 503,
    "sporting": 498, "sporting cp": 498,
    "celtic": 732,
    "rangers": 733,
    "inter miami": 11548, "inter miami cf": 11548,
    "al nassr": 536, "al nassr fc": 536,
    "al hilal": 449, "al hilal sfc": 449,
    "flamengo": 1785, "cr flamengo": 1785,
    "palmeiras": 1769, "se palmeiras": 1769,
    "boca": 2069, "boca juniors": 2069, "ca boca juniors": 2069,
    "river": 1867, "river plate": 1867, "ca river plate": 1867,
}

# ===== TRIVIA WITH NO REPEATS =====
TRIVIA_BANK = [
    {"q": "Which club won the first Premier League title?", "a": "Manchester United - 1992/93"},
    {"q": "Who has the most Ballon d'Or awards?", "a": "Lionel Messi - 8"},
    {"q": "Which country won the 2018 World Cup?", "a": "France"},
    {"q": "Who is the Champions League top scorer of all time?", "a": "Cristiano Ronaldo - 140 goals"},
    {"q": "Who scored the fastest Premier League hat-trick?", "a": "Sadio Mane - 2 min 56 sec"},
    {"q": "Which club has won the most UCL titles?", "a": "Real Madrid - 15"},
    {"q": "Who won the 2022 World Cup?", "a": "Argentina"},
    {"q": "Which player has the most Premier League goals?", "a": "Alan Shearer - 260"},
    {"q": "What year was the Premier League founded?", "a": "1992"},
    {"q": "Who won Euro 2020?", "a": "Italy"},
    {"q": "Which stadium is called 'The Theatre of Dreams'?", "a": "Old Trafford"},
    {"q": "Who is nicknamed 'CR7'?", "a": "Cristiano Ronaldo"},
    {"q": "Which country hosted the 2014 World Cup?", "a": "Brazil"},
    {"q": "Who manages Manchester City?", "a": "Pep Guardiola"},
    {"q": "What does VAR stand for?", "a": "Video Assistant Referee"},
    {"q": "Which club is known as 'The Gunners'?", "a": "Arsenal FC"},
    {"q": "Who won the 2021 Copa America?", "a": "Argentina"},
    {"q": "How many players are on a football pitch?", "a": "22 - 11 per team"},
    {"q": "Which club is 'El Clásico' between?", "a": "Real Madrid vs Barcelona"},
    {"q": "Who won the 2023 Ballon d'Or?", "a": "Lionel Messi"},
    {"q": "Which player is called 'The Egyptian King'?", "a": "Mohamed Salah"},
    {"q": "What is Bayern Munich's stadium called?", "a": "Allianz Arena"},
    {"q": "Who scored the 'Hand of God' goal?", "a": "Diego Maradona"},
    {"q": "Which team won the first World Cup in 1930?", "a": "Uruguay"},
    {"q": "Who is the youngest World Cup winner?", "a": "Pelé - 17 years old"},
]

used_trivia = {}

async def team_autocomplete(interaction: discord.Interaction, current: str):
    top_teams = [
        app_commands.Choice(name="🇫🇷 PSG", value="psg"),
        app_commands.Choice(name="🏴󠁧󠁢󠁥󠁮󠁧󠁿 Arsenal", value="arsenal"),
        app_commands.Choice(name="🏴󠁧󠁢󠁥󠁮󠁧󠁿 Man City", value="man city"),
        app_commands.Choice(name="🏴󠁧󠁢󠁥󠁮󠁧󠁿 Liverpool", value="liverpool"),
        app_commands.Choice(name="🏴󠁧󠁢󠁥󠁮󠁧󠁿 Chelsea", value="chelsea"),
        app_commands.Choice(name="🏴󠁧󠁢󠁥󠁮󠁧󠁿 Man United", value="man united"),
        app_commands.Choice(name="🏴󠁧󠁢󠁥󠁮󠁧󠁿 Tottenham", value="tottenham"),
        app_commands.Choice(name="🇪🇸 Real Madrid", value="real madrid"),
        app_commands.Choice(name="🇪🇸 Barcelona", value="barcelona"),
        app_commands.Choice(name="🇪🇸 Atlético Madrid", value="atletico madrid"),
        app_commands.Choice(name="🇩🇪 Bayern Munich", value="bayern"),
        app_commands.Choice(name="🇩🇪 Dortmund", value="dortmund"),
        app_commands.Choice(name="🇮🇹 Inter Milan", value="inter"),
        app_commands.Choice(name="🇮🇹 AC Milan", value="milan"),
        app_commands.Choice(name="🇮🇹 Juventus", value="juventus"),
        app_commands.Choice(name="🇮🇹 Napoli", value="napoli"),
    ]
    if not current:
        return top_teams[:25]
    return [t for t in top_teams if current.lower() in t.name.lower() or current.lower() in t.value.lower()][:25]

async def football_api_request(endpoint):
    headers = {"X-Auth-Token": FOOTBALL_API_KEY}
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"https://api.football-data.org/v4/{endpoint}", headers=headers, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status == 200:
                    return await resp.json()
                return {"error": f"API returned {resp.status}"}
    except asyncio.TimeoutError:
        return {"error": "API timeout"}
    except Exception as e:
        return {"error": str(e)}

@bot.event
async def on_ready():
    print(f"Logged in as {bot.user}")
    try:
        synced = await bot.tree.sync()
        print(f"Synced {len(synced)} commands")
    except Exception as e:
        print(e)

# ===== /TEAM - WORKS FOR 200+ TEAMS, NO KÖLN BUG =====
@bot.tree.command(name="team", description="Get info for ANY team")
@app_commands.describe(team="Type or pick from dropdown")
@app_commands.autocomplete(team=team_autocomplete)
async def team(interaction: discord.Interaction, team: str):
    await interaction.response.defer()
    
    team_lower = team.lower().strip()
    
    # Method 1: Check our ID database first - INSTANT
    if team_lower in TEAM_IDS:
        team_id = TEAM_IDS[team_lower]
        data = await football_api_request(f"teams/{team_id}")
        if "error" not in data:
            team_info = data
        else:
            return await interaction.followup.send(f"❌ API Error for {team}")
    
    # Method 2: Fallback to API search for teams not in our list
    else:
        data = await football_api_request(f"teams?name={team}")
        if "error" in data or not data.get("teams"):
            return await interaction.followup.send(f"❌ Team '{team}' not found.\n\n**Try:** Use dropdown or search: `psg`, `arsenal`, `real madrid`")
        team_info = data["teams"][0]
        # Check if it's Köln when we didn't ask for it
        if team_info["id"] == 1 and team_lower not in ["köln", "koln", "1. fc köln"]:
            return await interaction.followup.send(f"❌ Couldn't find '{team}'. API returned Köln instead.\n\n**Use exact name from dropdown!**")
    
    embed = discord.Embed(title=f"🔍 {team_info['name']}", color=0x0099ff)
    embed.add_field(name="Founded", value=team_info.get("founded", "N/A"), inline=True)
    embed.add_field(name="Stadium", value=team_info.get("venue", "N/A"), inline=True)
    embed.add_field(name="Colors", value=team_info.get("clubColors", "N/A"), inline=True)
    embed.add_field(name="Country", value=team_info.get("area", {}).get("name", "N/A"), inline=True)
    embed.set_thumbnail(url=team_info.get("crest", ""))
    await interaction.followup.send(embed=embed)

# ===== TRIVIA - 25 QUESTIONS, NO REPEATS, NEXT BUTTON =====
class TriviaView(discord.ui.View):
    def __init__(self, user_id: int):
        super().__init__(timeout=120)
        self.user_id = user_id
        
    @discord.ui.button(label="Next Question ➡️", style=discord.ButtonStyle.green)
    async def next_question(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id!= self.user_id:
            return await interaction.response.send_message("Start your own trivia with /trivia", ephemeral=True)
        await interaction.response.defer()
        await send_trivia(interaction)

async def send_trivia(interaction):
    user_id = interaction.user.id
    
    if user_id not in used_trivia:
        used_trivia[user_id] = []
    
    available = [i for i in range(len(TRIVIA_BANK)) if i not in used_trivia[user_id]]
    
    if not available:
        used_trivia[user_id] = []
        available = list(range(len(TRIVIA_BANK)))
        await interaction.followup.send("🔄 **All questions seen! Restarting...**", ephemeral=True)
    
    q_index = random.choice(available)
    used_trivia[user_id].append(q_index)
    trivia = TRIVIA_BANK[q_index]
    
    embed = discord.Embed(title="🧠 Football Trivia", color=0x9b59b6)
    embed.add_field(name="Question", value=f"**{trivia['q']}**", inline=False)
    embed.add_field(name="Answer", value=f"||{trivia['a']}||", inline=False)
    embed.set_footer(text=f"Q {len(used_trivia[user_id])}/{len(TRIVIA_BANK)} | Click black bar to reveal | Click button for next")
    
    view = TriviaView(user_id)
    await interaction.followup.send(embed=embed, view=view)

@bot.tree.command(name="trivia", description="Football trivia - 25 questions")
async def trivia(interaction: discord.Interaction):
    await interaction.response.defer()
    await send_trivia(interaction)

# Add your other commands here...

bot.run(TOKEN)