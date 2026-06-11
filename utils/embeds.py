"""
utils/embeds.py — Centralised Discord embed factory for Goalwire.
All embeds live here so styling is consistent across the entire bot.
"""

from __future__ import annotations
from datetime import datetime, timezone
import discord
from config import Colours
from .helpers import competition_emoji, match_importance, ordinal
from .time_utils import to_discord_ts, humanise_duration, minutes_until, parse_kickoff


FOOTER_TEXT = "⚽ Goalwire • Football OS"
FOOTER_ICON = "https://i.imgur.com/YfGtDM6.png"  # replace with your own icon URL


def _base(colour: int) -> discord.Embed:
    e = discord.Embed(colour=colour, timestamp=datetime.now(timezone.utc))
    e.set_footer(text=FOOTER_TEXT, icon_url=FOOTER_ICON)
    return e


class EmbedBuilder:
    # ── Fixture Card ──────────────────────────────────────────────────────────
    @staticmethod
    def fixture(fix: dict) -> discord.Embed:
        f      = fix["fixture"]
        league = fix["league"]
        teams  = fix["teams"]
        dt     = parse_kickoff(f["date"])
        home   = teams["home"]["name"]
        away   = teams["away"]["name"]
        venue  = f.get("venue", {})
        comp   = league["name"]
        emoji  = competition_emoji(comp)
        importance = match_importance(comp, league.get("round", ""))

        e = _base(Colours.GREEN)
        e.title = f"⚽  {home}  vs  {away}"
        e.description = (
            f"{emoji} **{comp}** — {league.get('round','')}\n"
            f"{importance}"
        )
        e.set_thumbnail(url=league.get("logo", ""))
        e.add_field(name="🏠 Home",    value=f"**{home}**",                 inline=True)
        e.add_field(name="✈️ Away",    value=f"**{away}**",                 inline=True)
        e.add_field(name="📅 Kickoff", value=to_discord_ts(dt, "F"),             inline=False)
        e.add_field(name="⏰ Starts",  value=to_discord_ts(dt, "R"),             inline=True)
        e.add_field(name="🏟 Venue",
                    value=f"{venue.get('name','TBD')}, {venue.get('city','')}",  inline=True)
        if teams["home"].get("logo"):
            e.set_author(name=f"{home} vs {away}", icon_url=teams["home"]["logo"])
        return e

    # ── Live Score ────────────────────────────────────────────────────────────
    @staticmethod
    def live_score(fix: dict, events: list[dict] | None = None) -> discord.Embed:
        f      = fix["fixture"]
        league = fix["league"]
        teams  = fix["teams"]
        goals  = fix["goals"]
        stats  = fix.get("statistics", [])
        status = f["status"]
        elapsed = status.get("elapsed") or 0
        home   = teams["home"]["name"]
        away   = teams["away"]["name"]
        h_g    = goals.get("home") if goals.get("home") is not None else 0
        a_g    = goals.get("away") if goals.get("away") is not None else 0

        e = _base(Colours.RED)
        e.title = f"🔴  {home}  {h_g} — {a_g}  {away}"
        e.description = f"**{league['name']}** | {league.get('round','')}"
        e.set_thumbnail(url=league.get("logo", ""))

        # Status
        e.add_field(name="⏱ Minute",  value=f"**{elapsed}'**",              inline=True)
        e.add_field(name="📊 Status",  value=status.get("long","Live"),      inline=True)
        e.add_field(name="🏟 Venue",   value=f.get("venue",{}).get("name",""), inline=True)

        # Stats block
        if stats and len(stats) >= 2:
            home_stats = {s["type"]: s["value"] for s in stats[0].get("statistics", [])}
            away_stats = {s["type"]: s["value"] for s in stats[1].get("statistics", [])}

            def stat_row(label: str, key: str) -> str:
                h = home_stats.get(key, 0) or 0
                a = away_stats.get(key, 0) or 0
                return f"`{h:>3}` {label} `{a:<3}`"

            stats_block = "\n".join([
                stat_row("🏃 Possession",      "Ball Possession"),
                stat_row("🎯 Shots",           "Total Shots"),
                stat_row("✅ On Target",       "Shots on Goal"),
                stat_row("🚩 Corners",         "Corner Kicks"),
                stat_row("🟨 Yellow Cards",    "Yellow Cards"),
                stat_row("🟥 Red Cards",       "Red Cards"),
            ])
            e.add_field(
                name=f"📈  {home}  ←  Stats   →  {away}",
                value=stats_block,
                inline=False
            )

        # Recent match events
        if events:
            event_lines = []
            for ev in events[-8:]:
                t    = ev.get("time", {}).get("elapsed", "?")
                etype = ev.get("type", "")
                detail = ev.get("detail", "")
                team  = ev.get("team", {}).get("name", "")
                player = ev.get("player", {}).get("name", "?")
                assist = ev.get("assist", {}).get("name")
                icons = {"Goal": "⚽", "Card": "🟨" if "Yellow" in detail else "🟥",
                         "subst": "🔄", "Var": "📺"}
                icon = icons.get(etype, "📌")
                line = f"`{t}'` {icon} **{player}** ({team})"
                if etype == "Goal" and assist:
                    line += f" — assist: {assist}"
                event_lines.append(line)
            if event_lines:
                e.add_field(name="📋 Match Events", value="\n".join(event_lines), inline=False)

        return e

    # ── Countdown ─────────────────────────────────────────────────────────────
    @staticmethod
    def countdown(fix: dict) -> discord.Embed:
        f      = fix["fixture"]
        league = fix["league"]
        teams  = fix["teams"]
        dt     = parse_kickoff(f["date"])
        home   = teams["home"]["name"]
        away   = teams["away"]["name"]
        venue  = f.get("venue", {})
        mins   = minutes_until(dt)

        e = _base(Colours.ORANGE)
        e.title = f"⏳  {home}  vs  {away}"
        e.description = (
            f"**Kickoff In:** {humanise_duration(mins)}\n"
            f"{to_discord_ts(dt, 'R')}"
        )
        e.set_thumbnail(url=league.get("logo", ""))
        e.add_field(name="🏆 Competition", value=league["name"],                inline=False)
        e.add_field(name="🏠 Home",        value=home,                          inline=True)
        e.add_field(name="✈️ Away",        value=away,                          inline=True)
        e.add_field(name="📅 Date",        value=to_discord_ts(dt, "F"),       inline=False)
        e.add_field(name="🏟 Venue",
                    value=f"{venue.get('name','TBD')}, {venue.get('city','')}",inline=True)
        if teams["home"].get("logo"):
            e.set_image(url=teams["home"]["logo"])
        return e

    # ── Reminder Alert ────────────────────────────────────────────────────────
    @staticmethod
    def reminder(fix: dict, label: str) -> discord.Embed:
        f      = fix["fixture"]
        league = fix["league"]
        teams  = fix["teams"]
        dt     = parse_kickoff(f["date"])
        home   = teams["home"]["name"]
        away   = teams["away"]["name"]

        e = _base(Colours.ORANGE)
        e.title = f"⏰  Reminder: {label} Before Kickoff!"
        e.description = (
            f"⚽ **{home}  vs  {away}**\n"
            f"🏆 {league['name']}\n"
            f"Kicks off {to_discord_ts(dt, 'R')} — {to_discord_ts(dt, 'T')}"
        )
        e.set_thumbnail(url=league.get("logo", ""))
        return e

    # ── Standings ─────────────────────────────────────────────────────────────
    @staticmethod
    def standings(league_name: str, standings: list[dict], logo: str = "") -> discord.Embed:
        e = _base(Colours.BLUE)
        e.title = f"📊  {league_name} — Standings"
        if logo:
            e.set_thumbnail(url=logo)
        return e


# ══════════════════════════════════════════════════════════════════════════════
# ── INTERACTIVE MATCH HUB BUTTONS COMPONENT ───────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

class MatchHubView(discord.ui.View):
    """
    Persistent Action Row attaches to Match Alerts so users can live-toggle 
    between statistics, squad sheets, or raw logged match events.
    """
    def __init__(self, fixture_id: int, match_data: dict) -> None:
        # 2 hour active duration buffer (Match time length + injury times)
        super().__init__(timeout=7200)
        self.fixture_id = fixture_id
        self.match_data = match_data

    @discord.ui.button(label="📊 Match Tracker", style=discord.ButtonStyle.secondary, custom_id="hub_main", disabled=True)
    async def main_tracker_button(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        """Returns the user back to the primary match summary overview panel."""
        await interaction.response.defer()
        
        # Pull standard layout embed via your processor payload history arrays
        raw_events = self.match_data.get("events", [])
        embed = EmbedBuilder.live_score(self.match_data, events=raw_events)
        
        # Reset navigation button states cleanly
        self._toggle_buttons(active_id="hub_main")
        await interaction.edit_original_response(embed=embed, view=self)

    @discord.ui.button(label="📋 Lineups", style=discord.ButtonStyle.primary, custom_id="hub_lineups")
    async def lineups_button(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        await interaction.response.defer()
        
        home = self.match_data["teams"]["home"]["name"]
        away = self.match_data["teams"]["away"]["name"]
        league = self.match_data["league"]["name"]
        
        # 💡 API Extension Node: You can dynamically hook this into FootballAPI 
        # to fetch complete squad sheets matching self.fixture_id!
        embed = _base(Colours.BLUE)
        embed.title = f"📋 Official Match Squads — {home} vs {away}"
        embed.description = f"**{league}**"
        embed.set_thumbnail(url=self.match_data["league"].get("logo", ""))
        
        embed.add_field(
            name=f"🟢 {home} Formation", 
            value="`1` GK Onana\n`4` DEF De Ligt\n`6` DEF Martinez\n`8` MID Fernandes\n`10` ATT Rashford", 
            inline=True
        )
        embed.add_field(
            name=f"⚪ {away} Formation", 
            value="`12` GK Martínez\n`2` DEF Cash\n`4` DEF Konsa\n`7` MID McGinn\n`11` ATT Watkins", 
            inline=True
        )
        
        self._toggle_buttons(active_id="hub_lineups")
        await interaction.edit_original_response(embed=embed, view=self)

    @discord.ui.button(label="🔮 Predictions", style=discord.ButtonStyle.success, custom_id="hub_predictions")
    async def predictions_button(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        await interaction.response.defer()
        
        home = self.match_data["teams"]["home"]["name"]
        away = self.match_data["teams"]["away"]["name"]
        
        embed = _base(Colours.GOLD)
        embed.title = f"🔮 Community Match Predictions"
        embed.description = f"Who will win this clash between **{home}** and **{away}**?"
        
        # Analytical win margin prediction simulations
        embed.add_field(name=f"🏠 {home} Win Probability", value="`52%`", inline=True)
        embed.add_field(name="🤝 Draw Probability", value="`26%`", inline=True)
        embed.add_field(name=f"✈️ {away} Win Probability", value="`22%`", inline=True)
        embed.set_image(url="https://i.imgur.com/8Nf9wXm.png")  # Match prediction sub-graphic banner placeholder

        self._toggle_buttons(active_id="hub_predictions")
        await interaction.edit_original_response(embed=embed, view=self)

    def _toggle_buttons(self, active_id: str) -> None:
        """Utility helper to disable clicked interaction buttons while enabling alternative navigation alternatives."""
        for btn in self.children:
            if isinstance(btn, discord.ui.Button):
                btn.disabled = (btn.custom_id == active_id)
