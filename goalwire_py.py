#!/usr/bin/env python3
"""
Goalwire — Football Operating System for Discord
Handles fixtures, live scores, events, reminders, news, and tournament hubs.
"""

import os, sys, json, time, requests
from datetime import datetime, timezone, timedelta

# ─── CONFIG ────────────────────────────────────────────────────────────────────
DISCORD_BOT_TOKEN   = os.environ.get("DISCORD_BOT_TOKEN", "")
FOOTBALL_API_KEY    = os.environ.get("FOOTBALL_API_KEY", "")
GUILD_ID            = os.environ.get("GUILD_ID", "")
MODE                = os.environ.get("MODE", "fixtures")
COMPETITIONS        = os.environ.get("COMPETITIONS", "").split(",")
LIVE_CHANNEL_ID     = os.environ.get("LIVE_CHANNEL_ID", "")
FIXTURES_CHANNEL_ID = os.environ.get("FIXTURES_CHANNEL_ID", "")
NEWS_CHANNEL_ID     = os.environ.get("NEWS_CHANNEL_ID", "")
REMINDER_HOURS      = os.environ.get("REMINDER_HOURS", "24,1")

DISCORD_API = "https://discord.com/api/v10"
FOOTBALL_API = "https://v3.football.api-sports.io"

COMPETITION_IDS = {
    "Premier League":             39,
    "La Liga":                    140,
    "Bundesliga":                 78,
    "Serie A":                    135,
    "Ligue 1":                    61,
    "UEFA Champions League":       2,
    "UEFA Europa League":          3,
    "UEFA Conference League":     848,
    "FIFA World Cup":               1,
    "UEFA Euro":                  960,
    "Copa America":               9,
    "Nations League":             5,
    "FIFA Club World Cup":        15,
}

FOOTBALL_HEADERS = {
    "x-apisports-key": FOOTBALL_API_KEY
}

DISCORD_HEADERS = {
    "Authorization": f"Bot {DISCORD_BOT_TOKEN}",
    "Content-Type": "application/json"
}

# ─── DISCORD HELPERS ───────────────────────────────────────────────────────────
def discord_post(endpoint, payload):
    r = requests.post(f"{DISCORD_API}{endpoint}", headers=DISCORD_HEADERS, json=payload)
    if r.status_code not in (200, 201, 204):
        print(f"[Discord ERROR] {r.status_code}: {r.text[:300]}")
    return r

def discord_patch(endpoint, payload):
    r = requests.patch(f"{DISCORD_API}{endpoint}", headers=DISCORD_HEADERS, json=payload)
    return r

def discord_get(endpoint):
    r = requests.get(f"{DISCORD_API}{endpoint}", headers=DISCORD_HEADERS)
    return r

# ─── FOOTBALL API HELPERS ──────────────────────────────────────────────────────
def get_fixtures(league_id, days_ahead=7):
    today = datetime.now(timezone.utc)
    end   = today + timedelta(days=days_ahead)
    params = {
        "league": league_id,
        "season": today.year,
        "from":   today.strftime("%Y-%m-%d"),
        "to":     end.strftime("%Y-%m-%d"),
        "timezone": "UTC"
    }
    r = requests.get(f"{FOOTBALL_API}/fixtures", headers=FOOTBALL_HEADERS, params=params)
    if r.ok:
        return r.json().get("response", [])
    return []

def get_live_fixtures(league_id):
    r = requests.get(f"{FOOTBALL_API}/fixtures", headers=FOOTBALL_HEADERS,
                     params={"league": league_id, "live": "all"})
    if r.ok:
        return r.json().get("response", [])
    return []

def get_standings(league_id):
    year = datetime.now(timezone.utc).year
    r = requests.get(f"{FOOTBALL_API}/standings",
                     headers=FOOTBALL_HEADERS,
                     params={"league": league_id, "season": year})
    if r.ok:
        return r.json().get("response", [])
    return []

def get_top_scorers(league_id):
    year = datetime.now(timezone.utc).year
    r = requests.get(f"{FOOTBALL_API}/players/topscorers",
                     headers=FOOTBALL_HEADERS,
                     params={"league": league_id, "season": year})
    if r.ok:
        return r.json().get("response", [])
    return []

# ─── FIXTURE → DISCORD EVENT ───────────────────────────────────────────────────
def format_fixture_description(fix):
    f   = fix["fixture"]
    l   = fix["league"]
    teams = fix["teams"]
    venue = f.get("venue", {})
    dt    = datetime.fromisoformat(f["date"].replace("Z", "+00:00"))
    return "\n".join([
        f"🏆 Competition: {l['name']}",
        f"🏠 Home Team: {teams['home']['name']}  ✈️ Away Team: {teams['away']['name']}",
        f"📅 Date: {dt.strftime('%A, %d %B %Y')}",
        f"🕒 Kickoff Time: {dt.strftime('%I:%M %p UTC')}",
        f"🏟 Stadium: {venue.get('name', 'TBD')} — {venue.get('city', '')}",
        "",
        "Don't miss this massive football clash. 🔥",
    ])

def create_discord_event(fix):
    f     = fix["fixture"]
    l     = fix["league"]
    teams = fix["teams"]
    home  = teams["home"]["name"]
    away  = teams["away"]["name"]
    start = f["date"]  # ISO8601
    # Estimate 2h match duration
    start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
    end_dt   = start_dt + timedelta(hours=2)
    title    = f"⚽ {home} vs {away} | {l['name']}"
    desc     = format_fixture_description(fix)
    payload  = {
        "name":                 title[:100],
        "description":          desc[:1000],
        "privacy_level":        2,
        "entity_type":          3,   # EXTERNAL
        "scheduled_start_time": start_dt.isoformat(),
        "scheduled_end_time":   end_dt.isoformat(),
        "entity_metadata":      {"location": fix["fixture"].get("venue", {}).get("name", "TBD")}
    }
    r = discord_post(f"/guilds/{GUILD_ID}/scheduled-events", payload)
    if r.status_code in (200, 201):
        print(f"  ✅ Created event: {title}")
        return r.json()
    else:
        print(f"  ❌ Event creation failed: {r.text[:200]}")
    return None

# ─── EMBED BUILDERS ────────────────────────────────────────────────────────────
def fixture_embed(fix):
    f     = fix["fixture"]
    l     = fix["league"]
    teams = fix["teams"]
    dt    = datetime.fromisoformat(f["date"].replace("Z", "+00:00"))
    home  = teams["home"]["name"]
    away  = teams["away"]["name"]
    venue = f.get("venue", {})
    ts    = int(dt.timestamp())
    return {
        "title":       f"⚽ {home} vs {away}",
        "description": f"🏆 {l['name']}  |  📅 <t:{ts}:F>  |  🏟 {venue.get('name','TBD')}",
        "color":       0x00B140,
        "thumbnail":   {"url": l.get("logo","")},
        "fields": [
            {"name": "🏠 Home", "value": home, "inline": True},
            {"name": "✈️ Away", "value": away, "inline": True},
            {"name": "⏰ Kickoff", "value": f"<t:{ts}:R>", "inline": True},
        ],
        "footer": {"text": "Goalwire • Football OS for Discord"},
        "timestamp": dt.isoformat(),
    }

def live_score_embed(fix):
    f      = fix["fixture"]
    teams  = fix["teams"]
    goals  = fix["goals"]
    score  = fix["score"]
    status = f["status"]
    elapsed = status.get("elapsed", 0) or 0
    home_name  = teams["home"]["name"]
    away_name  = teams["away"]["name"]
    home_goals = goals.get("home") if goals.get("home") is not None else 0
    away_goals = goals.get("away") if goals.get("away") is not None else 0
    return {
        "title":  f"🔴 LIVE: {home_name} {home_goals} – {away_goals} {away_name}",
        "color":  0xFF0000,
        "fields": [
            {"name": "⏱ Time",    "value": f"{elapsed}'", "inline": True},
            {"name": "🏟 Status", "value": status.get("long", "Live"), "inline": True},
        ],
        "footer":    {"text": "Goalwire Live Tracker"},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

def standings_embed(league_name, standings):
    rows = []
    for entry in standings[:10]:
        s = entry[0] if isinstance(entry, list) else entry
        rows.append(
            f"`{s['rank']:>2}.` **{s['team']['name']}** "
            f"— {s['all']['win']}W {s['all']['draw']}D {s['all']['lose']}L  "
            f"Pts: **{s['points']}**"
        )
    return {
        "title":       f"📊 {league_name} Standings",
        "description": "\n".join(rows) or "No data.",
        "color":       0x5865F2,
        "footer":      {"text": "Goalwire • Updated now"},
        "timestamp":   datetime.now(timezone.utc).isoformat(),
    }

def scorers_embed(league_name, scorers):
    rows = []
    for i, s in enumerate(scorers[:10], 1):
        p = s["player"]
        g = s["statistics"][0]["goals"]
        rows.append(f"`{i:>2}.` **{p['name']}** — {g['total']} goals")
    return {
        "title":       f"🥇 {league_name} Top Scorers",
        "description": "\n".join(rows) or "No data.",
        "color":       0xFFD700,
        "footer":      {"text": "Goalwire"},
        "timestamp":   datetime.now(timezone.utc).isoformat(),
    }

def countdown_embed(fix):
    f     = fix["fixture"]
    teams = fix["teams"]
    l     = fix["league"]
    dt    = datetime.fromisoformat(f["date"].replace("Z", "+00:00"))
    ts    = int(dt.timestamp())
    home  = teams["home"]["name"]
    away  = teams["away"]["name"]
    return {
        "title":       f"⏳ {home} vs {away}",
        "description": f"**Kickoff In:** <t:{ts}:R>\n🏆 {l['name']}",
        "color":       0xFF6B00,
        "thumbnail":   {"url": l.get("logo","")},
        "fields": [
            {"name": "🏠 Home", "value": home, "inline": True},
            {"name": "✈️ Away", "value": away, "inline": True},
            {"name": "📅 Date", "value": f"<t:{ts}:F>", "inline": False},
        ],
        "footer": {"text": "Goalwire Countdown"},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

# ─── REMINDER SYSTEM ───────────────────────────────────────────────────────────
def check_and_send_reminders(fixtures, channel_id):
    now = datetime.now(timezone.utc)
    reminder_offsets = [int(h) for h in REMINDER_HOURS.split(",") if h.strip()]
    sent = 0
    for fix in fixtures:
        dt = datetime.fromisoformat(fix["fixture"]["date"].replace("Z", "+00:00"))
        for hours in reminder_offsets:
            window_start = dt - timedelta(hours=hours)
            window_end   = window_start + timedelta(minutes=5)
            if window_start <= now <= window_end:
                home = fix["teams"]["home"]["name"]
                away = fix["teams"]["away"]["name"]
                label = f"{hours}h" if hours >= 1 else f"{int(hours*60)}m"
                embed = {
                    "title":       f"⏰ Reminder: {hours}h Before Kickoff!",
                    "description": f"⚽ **{home} vs {away}** kicks off in **{label}**!",
                    "color":       0xFFA500,
                    "footer":      {"text": "Goalwire Reminders"},
                    "timestamp":   now.isoformat(),
                }
                discord_post(f"/channels/{channel_id}/messages",
                             {"embeds": [embed], "content": "@here"})
                sent += 1
    return sent

# ─── MAIN MODES ────────────────────────────────────────────────────────────────
def run_fixtures_mode():
    print("\n📅 Fetching upcoming fixtures…")
    total = 0
    for comp in COMPETITIONS:
        comp = comp.strip()
        lid  = COMPETITION_IDS.get(comp)
        if not lid:
            print(f"  ⚠️  Unknown competition: {comp}")
            continue
        print(f"  🔍 {comp} (id={lid})")
        fixtures = get_fixtures(lid, days_ahead=7)
        for fix in fixtures[:5]:
            embed = fixture_embed(fix)
            if FIXTURES_CHANNEL_ID:
                discord_post(f"/channels/{FIXTURES_CHANNEL_ID}/messages", {"embeds": [embed]})
            total += 1
            time.sleep(0.5)
    print(f"\n✅ Posted {total} fixture(s).")
    return {"fixtures_posted": total}

def run_events_mode():
    print("\n🗓 Creating Discord Scheduled Events…")
    created = 0
    for comp in COMPETITIONS:
        comp = comp.strip()
        lid  = COMPETITION_IDS.get(comp)
        if not lid:
            continue
        fixtures = get_fixtures(lid, days_ahead=14)
        for fix in fixtures:
            ev = create_discord_event(fix)
            if ev:
                created += 1
            time.sleep(1)
    print(f"\n✅ Created {created} Discord event(s).")
    return {"events_created": created}

def run_live_mode():
    print("\n🔴 Fetching live scores…")
    total = 0
    for comp in COMPETITIONS:
        comp = comp.strip()
        lid  = COMPETITION_IDS.get(comp)
        if not lid:
            continue
        live = get_live_fixtures(lid)
        for fix in live:
            embed = live_score_embed(fix)
            
            # 🎮 Custom Interactive UI Component payload block injection
            # Adds interactive navigation buttons right through raw API payloads
            payload = {
                "embeds": [embed],
                "components": [
                    {
                        "type": 1, # Action Row Component
                        "components": [
                            {
                                "type": 2, # Button Component
                                "style": 2, # Secondary Grey Button
                                "label": "📊 Match Tracker",
                                "custom_id": f"hub_main_{fix['fixture']['id']}",
                                "disabled": True
                            },
                            {
                                "type": 2,
                                "style": 1, # Primary Blue Button
                                "label": "📋 Lineups",
                                "custom_id": f"hub_lineups_{fix['fixture']['id']}"
                            },
                            {
                                "type": 2,
                                "style": 3, # Success Green Button
                                "label": "🔮 Predictions",
                                "custom_id": f"hub_predictions_{fix['fixture']['id']}"
                            }
                        ]
                    }
                ]
            }

            if LIVE_CHANNEL_ID:
                discord_post(f"/channels/{LIVE_CHANNEL_ID}/messages", payload)
            total += 1
            time.sleep(0.5)
    print(f"\n✅ Posted {total} live update(s).")
    return {"live_updates": total}

def run_standings_mode():
    print("\n📊 Posting standings…")
    for comp in COMPETITIONS:
        comp = comp.strip()
        lid  = COMPETITION_IDS.get(comp)
        if not lid:
            continue
        data = get_standings(lid)
        if data:
            league_name = comp
            standings   = data[0].get("league", {}).get("standings", [[]])[0]
            embed = standings_embed(league_name, standings)
            if FIXTURES_CHANNEL_ID:
                discord_post(f"/channels/{FIXTURES_CHANNEL_ID}/messages", {"embeds": [embed]})
        time.sleep(0.5)

def run_scorers_mode():
    print("\n🥇 Posting top scorers…")
    for comp in COMPETITIONS:
        comp = comp.strip()
        lid  = COMPETITION_IDS.get(comp)
        if not lid:
            continue
        data = get_top_scorers(lid)
        embed = scorers_embed(comp, data)
        if FIXTURES_CHANNEL_ID:
            discord_post(f"/channels/{FIXTURES_CHANNEL_ID}/messages", {"embeds": [embed]})
        time.sleep(0.5)

def run_countdown_mode():
    print("\n⏳ Posting countdown for next match…")
    for comp in COMPETITIONS:
        comp = comp.strip()
        lid  = COMPETITION_IDS.get(comp)
        if not lid:
            continue
        fixtures = get_fixtures(lid, days_ahead=7)
        if fixtures:
            embed = countdown_embed(fixtures[0])
            if FIXTURES_CHANNEL_ID:
                discord_post(f"/channels/{FIXTURES_CHANNEL_ID}/messages", {"embeds": [embed]})
        time.sleep(0.5)

def run_reminders_mode():
    print("\n⏰ Checking reminders…")
    total_sent = 0
    for comp in COMPETITIONS:
        comp = comp.strip()
        lid  = COMPETITION_IDS.get(comp)
        if not lid:
            continue
        fixtures = get_fixtures(lid, days_ahead=2)
        sent = check_and_send_reminders(fixtures, LIVE_CHANNEL_ID or FIXTURES_CHANNEL_ID)
        total_sent += sent
    print(f"✅ Sent {total_sent} reminder(s).")
    return {"reminders_sent": total_sent}

# ─── ENTRY POINT ───────────────────────────────────────────────────────────────
def main():
    print(f"""
╔══════════════════════════════════════════╗
║   ⚽  G O A L W I R E                   ║
║   Football OS for Discord               ║
╚══════════════════════════════════════════╝
Mode        : {MODE}
Competitions: {', '.join(COMPETITIONS)}
Guild       : {GUILD_ID}
""")
    if not DISCORD_BOT_TOKEN:
        print("❌ DISCORD_BOT_TOKEN is required.")
        sys.exit(1)
    if not FOOTBALL_API_KEY:
        print("❌ FOOTBALL_API_KEY is required.")
        sys.exit(1)

    mode_map = {
        "fixtures":   run_fixtures_mode,
        "events":     run_events_mode,
        "live":       run_live_mode,
        "standings":  run_standings_mode,
        "scorers":    run_scorers_mode,
        "countdown":  run_countdown_mode,
        "reminders":  run_reminders_mode,
    }
    fn = mode_map.get(MODE.lower())
    if fn:
        result = fn()
        if result:
            print(json.dumps({"goalwire_result": result}, indent=2))
    else:
        print(f"❌ Unknown mode: {MODE}")
        print(f"Available modes: {', '.join(mode_map.keys())}")

if __name__ == "__main__":
    main()
# ══════════════════════════════════════════════════════════════════════════════
# ── LIVE MATCH AUTOMATION INITIALIZATION ──────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════
import logging
from services.live_tracker_service import LiveTrackerService

log = logging.getLogger("goalwire.startup")

# Note: Replace 'bot' with whatever your Discord client variable is named 
# (e.g., client, bot, or app)
@bot.event
async def on_ready():
    log.info("🤖 Goalwire successfully connected to Discord as %s", bot.user)
    
    # 🚀 Spin up the live match event background engine
    try:
        tracker = LiveTrackerService(bot)
        await tracker.start()
        log.info("🎯 Real-time match tracking engine has been engaged.")
    except Exception as exc:
        log.error("Failed to initialize LiveTrackerService: %s", exc, exc_info=True)
