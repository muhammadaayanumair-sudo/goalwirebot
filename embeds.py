import discord
from datetime import datetime, timezone

# Status emoji mapping
STATUS_EMOJI = {
    "IN_PLAY":   "🟢",
    "PAUSED":    "⏸️",
    "FINISHED":  "🔴",
    "SCHEDULED": "📅",
    "POSTPONED": "⚠️",
    "CANCELLED": "❌",
    "TIMED":     "🕐",
}

LEAGUE_EMOJI = {
    "PL":  "🏴󠁧🇬🇧",
    "BL1": "🇩🇪",
    "SA":  "🇮🇹",
    "PD":  "🇪🇸",
    "FL1": "🇫🇷",
    "CL":  "⭐",
    "EL":  "🟠",
}

COLOR_MAP = {
    "IN_PLAY":   discord.Color.green(),
    "PAUSED":    discord.Color.yellow(),
    "FINISHED":  discord.Color.from_rgb(30, 30, 30),
    "SCHEDULED": discord.Color.blurple(),
}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _fmt_goals(goals: list[dict], team_id: int) -> str:
    """Return goal lines like  [ 6'] K. Havertz  for one team."""
    lines = []
    for g in goals:
        scorer_team = g.get("team", {}).get("id")
        if scorer_team != team_id:
            continue
        minute  = g.get("minute", "?")
        scorer  = g.get("scorer", {}).get("name", "?")
        gt      = g.get("type", "")
        suffix  = " *(Penalty)*" if gt == "PENALTY" else " *(OG)*" if gt == "OWN_GOAL" else ""
        lines.append(f"[ {minute}'] {scorer}{suffix}")
    return "\n".join(lines) if lines else ""


def _fmt_penalties(penalties: list[dict], team_id: int) -> str:
    """Return penalty shootout lines like ✅ G. Ramos (pen.)"""
    lines = []
    for p in penalties:
        scorer_team = p.get("team", {}).get("id")
        if scorer_team != team_id:
            continue
        name   = p.get("player", {}).get("name", "?")
        scored = p.get("scored", False)
        emoji  = "✅" if scored else "❌"
        lines.append(f"{emoji} {name} (pen.)")
    return "\n".join(lines) if lines else ""


# ── Main match embed (rich style like screenshot) ────────────────────────────

def build_match_embed(match: dict) -> discord.Embed:
    home_team   = match.get("homeTeam", {})
    away_team   = match.get("awayTeam", {})
    home        = home_team.get("name", "Home")
    away        = away_team.get("name", "Away")
    home_id     = home_team.get("id")
    away_id     = away_team.get("id")
    status      = match.get("status", "SCHEDULED")
    competition = match.get("competition", {})
    league_code = competition.get("code", "")
    league_name = competition.get("name", "Match")
    league_emoji= LEAGUE_EMOJI.get(league_code, "⚽")
    color       = COLOR_MAP.get(status, discord.Color.blurple())

    score       = match.get("score", {})
    ft          = score.get("fullTime", {})
    ht          = score.get("halfTime", {})
    penalties   = score.get("penalties", {})
    home_goals  = ft.get("home")
    away_goals  = ft.get("away")
    pen_home    = penalties.get("home")
    pen_away    = penalties.get("away")

    # ── Status header line ──
    status_labels = {
        "IN_PLAY":   "🟢  LIVE",
        "PAUSED":    "⏸️  HALF TIME",
        "FINISHED":  "🔴  FULL-TIME!",
        "SCHEDULED": "📅  UPCOMING",
        "POSTPONED": "⚠️  POSTPONED",
        "CANCELLED": "❌  CANCELLED",
        "TIMED":     "🕐  UPCOMING",
    }
    status_line = status_labels.get(status, status)

    # ── Score line ──
    if home_goals is not None:
        score_line = f"**{home}   {home_goals} – {away_goals}   {away}**"
        if pen_home is not None:
            score_line += f"\n↳ Score after pen. : {pen_home} - {pen_away}"
    else:
        score_line = f"**{home}  vs  {away}**"
        utc_date = match.get("utcDate")
        if utc_date:
            dt = datetime.fromisoformat(utc_date.replace("Z", "+00:00"))
            score_line += f"\n🗓️ {discord.utils.format_dt(dt, style='F')}"

    # ── Half time line ──
    ht_line = ""
    if ht.get("home") is not None and status in ("IN_PLAY", "FINISHED"):
        ht_line = f"\n*(HT: {ht['home']} – {ht['away']})*"

    # ── Minute for live ──
    minute = match.get("minute")
    if minute and status == "IN_PLAY":
        score_line = f"⏱️ `{minute}'`  {score_line}"

    description = f"{status_line}\n\n{score_line}{ht_line}"

    embed = discord.Embed(description=description, color=color)
    embed.set_author(name=f"{league_emoji} {league_name}")

    # ── Goals section ──
    goals = match.get("goals", [])
    if goals:
        home_goals_text = _fmt_goals(goals, home_id)
        away_goals_text = _fmt_goals(goals, away_id)
        goals_block = ""
        if home_goals_text:
            goals_block += f"**{home}**\n{home_goals_text}\n"
        if away_goals_text:
            goals_block += f"\n**{away}**\n{away_goals_text}"
        if goals_block.strip():
            embed.add_field(name="⚽ Goals", value=goals_block.strip(), inline=False)

    # ── Penalty shootout section ──
    pen_shootout = match.get("penalties", [])
    if pen_shootout and pen_home is not None:
        home_pens = _fmt_penalties(pen_shootout, home_id)
        away_pens = _fmt_penalties(pen_shootout, away_id)
        if home_pens or away_pens:
            pen_block = ""
            if home_pens:
                pen_block += f"**{home}**\n{home_pens}\n"
            if away_pens:
                pen_block += f"\n**{away}**\n{away_pens}"
            embed.add_field(
                name=f"🎯 Penalties ({pen_home} – {pen_away})",
                value=pen_block.strip(),
                inline=False
            )

    # ── Footer ──
    season = competition.get("name", "")
    utc_date = match.get("utcDate", "")
    date_str = utc_date[:10] if utc_date else ""
    matchday = match.get("matchday")
    footer_parts = []
    if season:
        footer_parts.append(f"League: {season}")
    if matchday:
        footer_parts.append(f"Matchday {matchday}")
    if date_str:
        footer_parts.append(date_str)
    embed.set_footer(text=" | ".join(footer_parts) if footer_parts else "GoalWire")

    return embed


# ── Match detail View (buttons like screenshot) ──────────────────────────────

class MatchDetailView(discord.ui.View):
    """Buttons: Fixture · Lineups · Substitutions · Cards · Statistics"""

    def __init__(self, match: dict):
        super().__init__(timeout=300)
        self.match = match

    def _get_lineup_text(self) -> str:
        lineups = self.match.get("lineups", [])
        if not lineups:
            return "Lineup data not available for this match."
        lines = []
        for team_lineup in lineups[:2]:
            team_name = team_lineup.get("team", {}).get("name", "Team")
            formation = team_lineup.get("formation", "")
            lines.append(f"**{team_name}** ({formation})")
            for p in team_lineup.get("startXI", []):
                player = p.get("player", {})
                pos    = player.get("pos", "")
                name   = player.get("name", "?")
                number = player.get("number", "")
                lines.append(f"`{number:>2}` {pos:<3} {name}")
            lines.append("")
        return "\n".join(lines) or "No lineup data."

    def _get_subs_text(self) -> str:
        lineups = self.match.get("lineups", [])
        if not lineups:
            return "Substitution data not available."
        lines = []
        for team_lineup in lineups[:2]:
            team_name = team_lineup.get("team", {}).get("name", "Team")
            subs = team_lineup.get("substitutes", [])
            if subs:
                lines.append(f"**{team_name}**")
                for s in subs:
                    p = s.get("player", {})
                    lines.append(f"🔄 {p.get('name', '?')} (#{p.get('number', '?')})")
                lines.append("")
        return "\n".join(lines) or "No substitution data."

    def _get_cards_text(self) -> str:
        bookings = self.match.get("bookings", [])
        if not bookings:
            return "No cards in this match."
        lines = []
        for b in bookings:
            minute  = b.get("minute", "?")
            player  = b.get("player", {}).get("name", "?")
            team    = b.get("team", {}).get("name", "")
            card    = b.get("card", "YELLOW_CARD")
            emoji   = "🟥" if "RED" in card else "🟨"
            lines.append(f"{emoji} `{minute}'` {player} ({team})")
        return "\n".join(lines)

    def _get_stats_text(self) -> str:
        odds = self.match.get("odds", {})
        home_odds = odds.get("homeWin", "N/A")
        draw_odds = odds.get("draw", "N/A")
        away_odds = odds.get("awayWin", "N/A")
        home = self.match.get("homeTeam", {}).get("name", "Home")
        away = self.match.get("awayTeam", {}).get("name", "Away")
        lines = [
            f"**Pre-match odds**",
            f"🏠 {home} Win: `{home_odds}`",
            f"🤝 Draw: `{draw_odds}`",
            f"✈️ {away} Win: `{away_odds}`",
        ]
        return "\n".join(lines)

    @discord.ui.button(label="📋 Fixture", style=discord.ButtonStyle.secondary)
    async def fixture_btn(self, interaction: discord.Interaction, button: discord.ui.Button):
        embed = build_match_embed(self.match)
        await interaction.response.edit_message(embed=embed, view=self)

    @discord.ui.button(label="👥 Lineups", style=discord.ButtonStyle.secondary)
    async def lineups_btn(self, interaction: discord.Interaction, button: discord.ui.Button):
        embed = discord.Embed(
            title="👥 Lineups",
            description=self._get_lineup_text(),
            color=discord.Color.blue()
        )
        await interaction.response.edit_message(embed=embed, view=self)

    @discord.ui.button(label="🔄 Substitutions", style=discord.ButtonStyle.secondary)
    async def subs_btn(self, interaction: discord.Interaction, button: discord.ui.Button):
        embed = discord.Embed(
            title="🔄 Substitutions",
            description=self._get_subs_text(),
            color=discord.Color.orange()
        )
        await interaction.response.edit_message(embed=embed, view=self)

    @discord.ui.button(label="🃏 Cards", style=discord.ButtonStyle.secondary)
    async def cards_btn(self, interaction: discord.Interaction, button: discord.ui.Button):
        embed = discord.Embed(
            title="🃏 Cards",
            description=self._get_cards_text(),
            color=discord.Color.yellow()
        )
        await interaction.response.edit_message(embed=embed, view=self)

    @discord.ui.button(label="📊 Statistics", style=discord.ButtonStyle.secondary)
    async def stats_btn(self, interaction: discord.Interaction, button: discord.ui.Button):
        embed = discord.Embed(
            title="📊 Statistics",
            description=self._get_stats_text(),
            color=discord.Color.purple()
        )
        await interaction.response.edit_message(embed=embed, view=self)


# ── Other embeds ─────────────────────────────────────────────────────────────

def build_standings_embed(table: list[dict], league_name: str, page: int = 0) -> discord.Embed:
    embed = discord.Embed(title=f"🏆 {league_name} Standings", color=discord.Color.gold())
    start = page * 10
    chunk = table[start:start + 10]
    rows = []
    for row in chunk:
        pos   = row.get("position", "?")
        team  = row.get("team", {}).get("shortName") or row.get("team", {}).get("name", "Unknown")
        pts   = row.get("points", 0)
        played= row.get("playedGames", 0)
        gd    = row.get("goalDifference", 0)
        gd_str= f"+{gd}" if gd > 0 else str(gd)
        rows.append(f"`{pos:>2}.` **{team:<22}** `{played}GP  {pts}pts  GD:{gd_str}`")
    embed.description = "\n".join(rows)
    embed.set_footer(text=f"Page {page+1} • GoalWire")
    return embed


def build_player_embed(player: dict, team_name: str = "") -> discord.Embed:
    name        = player.get("name", "Unknown Player")
    position    = player.get("position", "N/A")
    nationality = player.get("nationality", "N/A")
    dob         = player.get("dateOfBirth", "")
    embed = discord.Embed(title=f"👤 {name}", color=discord.Color.blue())
    embed.add_field(name="Position",    value=position,    inline=True)
    embed.add_field(name="Nationality", value=nationality, inline=True)
    if team_name:
        embed.add_field(name="Club",    value=team_name,   inline=True)
    if dob:
        embed.add_field(name="Date of Birth", value=dob[:10], inline=True)
    shirt = player.get("shirtNumber")
    if shirt:
        embed.add_field(name="Shirt #", value=str(shirt), inline=True)
    embed.set_footer(text="GoalWire • football-data.org")
    return embed


def build_alert_embed(match: dict, alert_type: str) -> discord.Embed:
    home  = match.get("homeTeam", {}).get("name", "Home")
    away  = match.get("awayTeam", {}).get("name", "Away")
    score = match.get("score", {}).get("fullTime", {})
    h     = score.get("home", 0)
    a     = score.get("away", 0)
    messages = {
        "goal":     f"⚽ **GOAL!**\n{home} **{h}** – **{a}** {away}",
        "kickoff":  f"🟢 **KICK OFF!**\n{home} vs {away} has started!",
        "fulltime": f"🔴 **FULL TIME!**\n{home} **{h}** – **{a}** {away}",
        "halftime": f"⏸️ **HALF TIME!**\n{home} **{h}** – **{a}** {away}",
    }
    colors = {
        "goal":     discord.Color.green(),
        "kickoff":  discord.Color.brand_green(),
        "fulltime": discord.Color.red(),
        "halftime": discord.Color.yellow(),
    }
    embed = discord.Embed(
        description=messages.get(alert_type, f"📣 Update: {home} vs {away}"),
        color=colors.get(alert_type, discord.Color.blurple()),
        timestamp=datetime.now(timezone.utc),
    )
    # Show goal scorers in alert
    goals = match.get("goals", [])
    if goals and alert_type == "goal":
        last_goal = goals[-1]
        scorer = last_goal.get("scorer", {}).get("name", "")
        minute = last_goal.get("minute", "")
        team   = last_goal.get("team", {}).get("name", "")
        if scorer:
            embed.add_field(name="⚽ Scorer", value=f"{scorer} ({team}) `{minute}'`", inline=False)
    competition = match.get("competition", {}).get("name", "")
    if competition:
        embed.set_footer(text=f"{competition} • GoalWire")
    return embed


def build_scorers_embed(scorers: list[dict], league_name: str) -> discord.Embed:
    embed = discord.Embed(title=f"🥅 {league_name} Top Scorers", color=discord.Color.orange())
    rows = []
    for i, s in enumerate(scorers[:10], 1):
        player  = s.get("player", {}).get("name", "Unknown")
        team    = s.get("team", {}).get("shortName", "")
        goals   = s.get("goals", 0)
        assists = s.get("assists", 0)
        rows.append(f"`{i:>2}.` **{player}** ({team}) — `{goals}G  {assists}A`")
    embed.description = "\n".join(rows)
    embed.set_footer(text=f"GoalWire • {league_name}")
    return embed


def build_fpl_team_embed(entry: dict, picks: dict, gw: int) -> discord.Embed:
    name         = entry.get("name", "FPL Team")
    player_name  = f"{entry.get('player_first_name', '')} {entry.get('player_last_name', '')}".strip()
    total_points = entry.get("summary_overall_points", 0)
    overall_rank = entry.get("summary_overall_rank", 0)
    gw_points    = picks.get("entry_history", {}).get("points", 0) if picks else 0
    embed = discord.Embed(
        title=f"🏅 {name}",
        description=f"Manager: **{player_name}**",
        color=discord.Color.purple(),
    )
    embed.add_field(name="GW Points",    value=str(gw_points),        inline=True)
    embed.add_field(name="Total Points", value=str(total_points),     inline=True)
    embed.add_field(name="Overall Rank", value=f"#{overall_rank:,}",  inline=True)
    embed.set_footer(text=f"Gameweek {gw} • Fantasy Premier League • GoalWire")
    return embed
