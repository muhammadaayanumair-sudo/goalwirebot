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
    "UEFA Conference League":      848,
    "FIFA World Cup":               1,
    "UEFA Euro":                  960,
    "Copa America":                9,
    "Nations League":              5,
    "FIFA Club World Cup":         15,
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
    start_dt = datetime
