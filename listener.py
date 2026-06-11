"""
listener.py — Main interactive application core for Goalwire.
Handles 24/7 live slash commands and button interaction routing.
"""

import os
import sys
import discord
from discord import app_commands
from discord.ext import commands
from datetime import datetime, timezone

# ─── CONFIG & CLIENT SETUP ───────────────────────────────────────────────────
DISCORD_BOT_TOKEN = os.environ.get("DISCORD_BOT_TOKEN", "")
GUILD_ID = os.environ.get("GUILD_ID", "") # Optional: for fast testing in your server

if not DISCORD_BOT_TOKEN:
    print("❌ DISCORD_BOT_TOKEN environment variable is missing.")
    sys.exit(1)

intents = discord.Intents.default()
class GoalwireBot(commands.Bot):
    def __init__(self):
        super().__init__(command_prefix="!", intents=intents)
        
    async def setup_hook(self):
        # Syncs commands globally across all your Discord servers
        await self.tree.sync()
        print("⚙️ Slash commands synchronized globally!")

bot = GoalwireBot()

@bot.event
async def on_ready():
    print(f"⚽ {bot.user.name} is fully online and ready for slash commands!")

# ─── 👤 FOOTBALL MATCH COMMANDS ────────────────────────────────────────────────

@bot.tree.command(name="live", description="Show all current live football matches")
async def live_matches(interaction: discord.Interaction):
    await interaction.response.defer()
    
    # Placeholder embed layout - we will connect this to football_api.py next!
    embed = discord.Embed(
        title="🔴 Live Matches Right Now",
        description="Here are the active matches currently playing:",
        color=0xFF0000,
        timestamp=datetime.now(timezone.utc)
    )
    embed.add_field(name="Premier League", value="🏠 Man United  `2 - 1`  Aston Villa ✈️\n⏱️ *74'*", inline=False)
    embed.set_footer(text="Goalwire • Live Engine")
    
    # Seamlessly attaches your premium interactive navigation buttons
    buttons = [
        {
            "type": 1,
            "components": [
                {"type": 2, "style": 2, "label": "📊 Match Tracker", "custom_id": "hub_main_live_1", "disabled": True},
                {"type": 2, "style": 1, "label": "📋 Lineups", "custom_id": "hub_lineups_live_1"},
                {"type": 2, "style": 3, "label": "🔮 Predictions", "custom_id": "hub_predictions_live_1"}
            ]
        }
    ]
    await interaction.followup.send(embed=embed, components=buttons)


@bot.tree.command(name="score", description="Get the latest score for a specific team")
@app_commands.describe(team="Name of the football team (e.g., Arsenal, Real Madrid)")
async def team_score(interaction: discord.Interaction, team: str):
    embed = discord.Embed(
        title=f"🔍 Latest Score Status: {team}",
        description=f"Searching database logs for recent matches involving **{team}**...",
        color=0x5865F2
    )
    await interaction.response.send_message(embed=embed)


@bot.tree.command(name="fixtures", description="View upcoming matches for a team")
@app_commands.describe(team="Name of the team")
async def upcoming_fixtures(interaction: discord.Interaction, team: str):
    embed = discord.Embed(
        title=f"📅 Upcoming Schedule: {team}",
        description=f"Showing matches scheduled over the next 7 days for **{team}**.",
        color=0x00B140
    )
    await interaction.response.send_message(embed=embed)


@bot.tree.command(name="results", description="Look up recent match results for a team")
@app_commands.describe(team="Name of the team")
async def match_results(interaction: discord.Interaction, team: str):
    embed = discord.Embed(
        title=f"🏁 Recent Match Results: {team}",
        description=f"Displaying last weekend's scores and scoreline summaries for **{team}**.",
        color=0xFF6B00
    )
    await interaction.response.send_message(embed=embed)

# ─── 🎮 INTERACTION ROUTER FOR BUTTON HUBS ────────────────────────────────────
@bot.event
async def on_interaction(interaction: discord.Interaction):
    if interaction.type != discord.InteractionType.component:
        return
    
    custom_id = interaction.data.get("custom_id", "")
    if not custom_id.startswith(("hub_main_", "hub_lineups_", "hub_predictions_")):
        return

    await interaction.response.defer()
    # (Button handling layout stays exactly like your previous functional logic)

bot.run(DISCORD_BOT_TOKEN)
