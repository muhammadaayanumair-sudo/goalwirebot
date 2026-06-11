"""
services/football_api.py — Async wrapper around API-Football v3.
All HTTP calls go through a single aiohttp.ClientSession with rate-limit awareness.
"""

from __future__ import annotations
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from cachetools import TTLCache
import aiohttp
from config import FOOTBALL_API_KEY, FOOTBALL_API_BASE, COMPETITION_IDS

log = logging.getLogger("goalwire.football_api")

# Simple in-memory TTL cache (5-minute TTL for most endpoints)
_cache: TTLCache = TTLCache(maxsize=256, ttl=300)


class FootballAPI:
    """Singleton async API client.  Call FootballAPI.setup() at bot startup."""

    _session: aiohttp.ClientSession | None = None

    # ── Lifecycle ─────────────────────────────────────────────────────────────
    @classmethod
    async def setup(cls) -> None:
        headers = {
            "x-apisports-key":  FOOTBALL_API_KEY,
            "x-apisports-host": "v3.football.api-sports.io",
        }
        cls._session = aiohttp.ClientSession(
            base_url=FOOTBALL_API_BASE,
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=15),
        )
        log.info("FootballAPI session opened")

    @classmethod
    async def close(cls) -> None:
        if cls._session:
            await cls._session.close()
            cls._session = None

    # ── Internal request ──────────────────────────────────────────────────────
    @classmethod
    async def _get(cls, endpoint: str, params: dict | None = None,
                   cache_key: str | None = None) -> dict | None:
        if cache_key and cache_key in _cache:
            return _cache[cache_key]
        if cls._session is None:
            raise RuntimeError("FootballAPI not initialised — call setup() first")
        try:
            async with cls._session.get(f"/{endpoint}", params=params) as resp:
                if resp.status == 429:
                    log.warning("Rate limited by API-Football, backing off 10s")
                    await asyncio.sleep(10)
                    return None
                if resp.status != 200:
                    log.error("API error %s → %s %s", resp.status, endpoint, params)
                    return None
                data = await resp.json()
                if cache_key:
                    _cache[cache_key] = data
                return data
        except asyncio.TimeoutError:
            log.error("Timeout fetching %s", endpoint)
        except aiohttp.ClientError as exc:
            log.error("HTTP error fetching %s: %s", endpoint, exc)
        return None

    # ── Fixtures ──────────────────────────────────────────────────────────────
    @classmethod
    async def get_fixtures(cls, league_id: int,
                           season: int | None = None,
                           days_ahead: int = 7) -> list[dict]:
        year = season or datetime.now(timezone.utc).year
        today = datetime.now(timezone.utc)
        end   = today + timedelta(days=days_ahead)
        params = {
            "league":   league_id,
            "season":   year,
            "from":     today.strftime("%Y-%m-%d"),
            "to":       end.strftime("%Y-%m-%d"),
            "timezone": "UTC",
        }
        key  = f"fixtures:{league_id}:{year}:{days_ahead}"
        data = await cls._get("fixtures", params, cache_key=key)
        return data.get("response", []) if data else []

    @classmethod
    async def get_live_fixtures(cls, league_id: int | None = None) -> list[dict]:
        """Fetch currently live matches.  Pass league_id=None for all competitions."""
        params: dict = {"live": "all"}
        if league_id:
            params["league"] = league_id
        data = await cls._get("fixtures", params)  # no cache for live
        return data.get("response", []) if data else []

    @classmethod
    async def get_fixture_by_id(cls, fixture_id: int) -> dict | None:
        data = await cls._get("fixtures", {"id": fixture_id},
                              cache_key=f"fixture:{fixture_id}")
        resp = data.get("response", []) if data else []
        return resp[0] if resp else None

    @classmethod
    async def get_fixture_events(cls, fixture_id: int) -> list[dict]:
        data = await cls._get("fixtures/events", {"fixture": fixture_id})
        return data.get("response", []) if data else []

    @classmethod
    async def get_fixture_statistics(cls, fixture_id: int) -> list[dict]:
        data = await cls._get("fixtures/statistics", {"fixture": fixture_id})
        return data.get("response", []) if data else []

    @classmethod
    async def get_fixture_lineups(cls, fixture_id: int) -> list[dict]:
        data = await cls._get("fixtures/lineups", {"fixture": fixture_id},
                              cache_key=f"lineups:{fixture_id}")
        return data.get("response", []) if data else []

    @classmethod
    async def get_h2h(cls, team1: int, team2: int, last: int = 5) -> list[dict]:
        key  = f"h2h:{team1}:{team2}"
        data = await cls._get("fixtures/headtohead",
                              {"h2h": f"{team1}-{team2}", "last": last},
                              cache_key=key)
        return data.get("response", []) if data else []

    # ── Standings ─────────────────────────────────────────────────────────────
    @classmethod
    async def get_standings(cls, league_id: int,
                             season: int | None = None) -> list[dict]:
        year = season or datetime.now(timezone.utc).year
        key  = f"standings:{league_id}:{year}"
        data = await cls._get("standings",
                              {"league": league_id, "season": year},
                              cache_key=key)
        resp = data.get("response", []) if data else []
        if resp:
            return resp[0].get("league", {}).get("standings", [])
        return []

    # ── Top Scorers / Assists ─────────────────────────────────────────────────
    @classmethod
    async def get_top_scorers(cls, league_id: int,
                               season: int | None = None) -> list[dict]:
        year = season or datetime.now(timezone.utc).year
        data = await cls._get("players/topscorers",
                              {"league": league_id, "season": year},
                              cache_key=f"topscorers:{league_id}:{year}")
        return data.get("response", []) if data else []

    @classmethod
    async def get_top_assists(cls, league_id: int,
                               season: int | None = None) -> list[dict]:
        year = season or datetime.now(timezone.utc).year
        data = await cls._get("players/topassists",
                              {"league": league_id, "season": year},
                              cache_key=f"topassists:{league_id}:{year}")
        return data.get("response", []) if data else []

    # ── Teams & Players ───────────────────────────────────────────────────────
    @classmethod
    async def get_team_info(cls, team_id: int) -> dict | None:
        data = await cls._get("teams", {"id": team_id},
                              cache_key=f"team:{team_id}")
        resp = data.get("response", []) if data else []
        return resp[0] if resp else None

    @classmethod
    async def get_team_form(cls, team_id: int, league_id: int,
                             season: int | None = None, last: int = 5) -> str:
        """Return last N results as an emoji string e.g. 'WWDLW'."""
        year = season or datetime.now(timezone.utc).year
        data = await cls._get("fixtures",
                              {"team": team_id, "league": league_id,
                               "season": year, "last": last, "status": "FT"},
                              cache_key=f"form:{team_id}:{league_id}:{last}")
        fixtures = data.get("response", []) if data else []
        form = []
        for fix in fixtures:
            teams = fix["teams"]
            goals = fix["goals"]
            is_home = teams["home"]["id"] == team_id
            scored = goals["home"] if is_home else goals["away"]
            conceded = goals["away"] if is_home else goals["home"]
            if scored is None or conceded is None:
                continue
            if scored > conceded:
                form.append("🟢")
            elif scored == conceded:
                form.append("🟡")
            else:
                form.append("🔴")
        return "  ".join(form) or "N/A"

    @classmethod
    async def get_injuries(cls, team_id: int, league_id: int,
                            season: int | None = None) -> list[dict]:
        year = season or datetime.now(timezone.utc).year
        data = await cls._get("injuries",
                              {"team": team_id, "league": league_id, "season": year},
                              cache_key=f"injuries:{team_id}:{year}")
        return data.get("response", []) if data else []

    # ── Leagues ───────────────────────────────────────────────────────────────
    @classmethod
    async def get_league_info(cls, league_id: int,
                               season: int | None = None) -> dict | None:
        year = season or datetime.now(timezone.utc).year
        data = await cls._get("leagues",
                              {"id": league_id, "season": year},
                              cache_key=f"league:{league_id}:{year}")
        resp = data.get("response", []) if data else []
        return resp[0] if resp else None

    # ── Convenience: all tracked competitions ─────────────────────────────────
    @classmethod
    async def get_all_live_fixtures(cls) -> list[dict]:
        """Single API call for all live fixtures (no league filter)."""
        return await cls.get_live_fixtures()

    @classmethod
    async def get_upcoming_for_competition(cls, competition: str,
                                            days: int = 7) -> list[dict]:
        lid = COMPETITION_IDS.get(competition)
        if not lid:
            return []
        return await cls.get_fixtures(lid, days_ahead=days)
