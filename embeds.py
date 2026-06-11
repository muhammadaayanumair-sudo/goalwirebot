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
        e.add_field(name="🏠 Home",    value=f"**{home}**",                      inline=True)
        e.add_field(name="✈️ Away",    value=f"**{away}**",                      inline=True)
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
                name=f"📈  {home}  ←  Stats  →  {away}",
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
        rows = []
        for entry in standings[:20]:
            s = entry[0] if isinstance(entry, list) else entry
            rank = s["rank"]
            name = s["team"]["name"]
            pts  = s["points"]
            w    = s["all"]["win"]
            d    = s["all"]["draw"]
            l    = s["all"]["lose"]
            gd   = s.get("goalsDiff", 0)
            sign = "+" if gd >= 0 else ""
            medal = {1: "🥇", 2: "🥈", 3: "🥉"}.get(rank, f"`{rank:>2}`")
            rows.append(f"{medal} **{name}**  —  {w}W {d}D {l}L  GD:{sign}{gd}  **{pts}pts**")
        e.description = "\n".join(rows) or "*No standings available.*"
        return e

    # ── Top Scorers ───────────────────────────────────────────────────────────
    @staticmethod
    def top_scorers(league_name: str, scorers: list[dict], logo: str = "") -> discord.Embed:
        e = _base(Colours.GOLD)
        e.title = f"🥇  {league_name} — Top Scorers"
        if logo:
            e.set_thumbnail(url=logo)
        rows = []
        for i, s in enumerate(scorers[:10], 1):
            p     = s["player"]
            stats = s["statistics"][0]
            goals = stats["goals"].get("total") or 0
            assts = stats["goals"].get("assists") or 0
            team  = stats["team"]["name"]
            rows.append(
                f"`{ordinal(i):>4}` ⚽ **{p['name']}** ({team})  "
                f"— {goals}G  {assts}A"
            )
        e.description = "\n".join(rows) or "*No data available.*"
        return e

    # ── Match Result ──────────────────────────────────────────────────────────
    @staticmethod
    def result(fix: dict) -> discord.Embed:
        f      = fix["fixture"]
        league = fix["league"]
        teams  = fix["teams"]
        goals  = fix["goals"]
        score  = fix["score"]
        home   = teams["home"]["name"]
        away   = teams["away"]["name"]
        h_g    = goals.get("home") or 0
        a_g    = goals.get("away") or 0
        winner = teams["home"] if h_g > a_g else (teams["away"] if a_g > h_g else None)

        colour = Colours.TEAL
        e = _base(colour)
        e.title = f"🏁  FT: {home}  {h_g} — {a_g}  {away}"
        e.description = f"**{league['name']}** | {league.get('round','')}"
        e.set_thumbnail(url=league.get("logo", ""))

        if winner:
            e.add_field(name="🏆 Winner", value=winner["name"], inline=True)
        else:
            e.add_field(name="🤝 Result", value="Draw", inline=True)

        ht = score.get("halftime", {})
        e.add_field(name="📊 HT Score",
                    value=f"{ht.get('home',0)} — {ht.get('away',0)}", inline=True)

        pen = score.get("penalty", {})
        if pen.get("home") is not None:
            e.add_field(name="🎯 Penalties",
                        value=f"{pen['home']} — {pen['away']}", inline=True)
        return e

    # ── Transfer News ─────────────────────────────────────────────────────────
    @staticmethod
    def transfer_news(title: str, body: str, url: str, image: str = "") -> discord.Embed:
        e = _base(Colours.CYAN)
        e.title = f"🔁  {title}"
        e.description = body[:2048] if body else "*No description.*"
        e.url = url
        if image:
            e.set_image(url=image)
        return e

    # ── Breaking News ─────────────────────────────────────────────────────────
    @staticmethod
    def breaking_news(title: str, body: str, url: str, image: str = "") -> discord.Embed:
        e = _base(Colours.RED)
        e.title = f"🚨  {title}"
        e.description = body[:2048] if body else "*No description.*"
        e.url = url
        if image:
            e.set_image(url=image)
        return e

    # ── Match Hub (pre-match overview) ────────────────────────────────────────
    @staticmethod
    def match_hub(fix: dict, h2h: list | None = None,
                  home_form: str = "", away_form: str = "") -> discord.Embed:
        f      = fix["fixture"]
        league = fix["league"]
        teams  = fix["teams"]
        dt     = parse_kickoff(f["date"])
        home   = teams["home"]["name"]
        away   = teams["away"]["name"]
        venue  = f.get("venue", {})
        comp   = league["name"]

        e = _base(Colours.PURPLE)
        e.title = f"🏟  Match Hub: {home}  vs  {away}"
        e.description = (
            f"**{comp}** — {league.get('round','')}\n"
            f"📅 {to_discord_ts(dt, 'F')} ({to_discord_ts(dt, 'R')})\n"
            f"🏟 {venue.get('name','TBD')}, {venue.get('city','')}"
        )
        e.set_thumbnail(url=league.get("logo", ""))
        if teams["home"].get("logo"):
            e.set_author(name=f"{home} vs {away}", icon_url=teams["home"]["logo"])

        if home_form or away_form:
            e.add_field(name=f"📈 {home} Form", value=home_form or "N/A", inline=True)
            e.add_field(name=f"📈 {away} Form", value=away_form or "N/A", inline=True)

        if h2h:
            lines = []
            for old in h2h[:5]:
                ot = old["teams"]
                og = old["goals"]
                odt = parse_kickoff(old["fixture"]["date"])
                lines.append(
                    f"{to_discord_ts(odt,'d')} — "
                    f"{ot['home']['name']} {og.get('home',0)} – {og.get('away',0)} {ot['away']['name']}"
                )
            e.add_field(name="🆚 Head to Head (last 5)",
                        value="\n".join(lines) or "No data.", inline=False)
        return e

    # ── Tournament Overview ───────────────────────────────────────────────────
    @staticmethod
    def tournament_overview(tournament: str, season: int,
                             logo: str = "") -> discord.Embed:
        e = _base(Colours.PURPLE)
        emoji = competition_emoji(tournament)
        e.title = f"{emoji}  {tournament} {season}"
        e.description = (
            f"Welcome to the **{tournament} {season}** hub!\n"
            f"Use the buttons below to navigate fixtures, standings, brackets, and more."
        )
        if logo:
            e.set_thumbnail(url=logo)
        e.add_field(name="📅 Fixtures",   value="Upcoming matches",   inline=True)
        e.add_field(name="📊 Standings",  value="Group tables",        inline=True)
        e.add_field(name="🏆 Brackets",   value="Knockout stage",      inline=True)
        e.add_field(name="🥇 Top Scorers","Goal & assist leaders",      inline=True)
        e.add_field(name="📰 News",       value="Latest tournament news", inline=True)
        return e

    # ── Error / Info ──────────────────────────────────────────────────────────
    @staticmethod
    def error(message: str) -> discord.Embed:
        e = _base(Colours.RED)
        e.title = "❌ Error"
        e.description = message
        return e

    @staticmethod
    def info(title: str, message: str) -> discord.Embed:
        e = _base(Colours.BLUE)
        e.title = f"ℹ️  {title}"
        e.description = message
        return e

    @staticmethod
    def success(message: str) -> discord.Embed:
        e = _base(Colours.GREEN)
        e.title = "✅ Success"
        e.description = message
        return e
