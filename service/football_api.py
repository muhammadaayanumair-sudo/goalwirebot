import aiohttp
import asyncio
import logging
import time
from typing import Any
from config import Config
 
log = logging.getLogger("football-api")
 
# Simple in-memory cache (replace with Redis when REDIS_URL is set)
_cache: dict[str, tuple[Any, float]] = {}
 
 
def _cache_get(key: str) -> Any | None:
    if key in _cache:
        value, expires = _cache[key]
        if time.time() < expires:
            return value
        del _cache[key]
    return None
 
 
def _cache_set(key: str, value: Any, ttl: int = Config.CACHE_TTL):
    _cache[key] = (value, time.time() + ttl)
 
 
class FootballAPI:
    BASE = "https://api.football-data.org/v4"
    HEADERS = {"X-Auth-Token": Config.FOOTBALL_DATA_API_KEY}
 
    async def _get(self, path: str, params: dict = None, ttl: int = Config.CACHE_TTL) -> dict | None:
        cache_key = f"{path}:{params}"
        cached = _cache_get(cache_key)
        if cached:
            return cached
 
        url = f"{self.BASE}{path}"
        for attempt in range(3):
            try:
                async with aiohttp.ClientSession(headers=self.HEADERS) as session:
                    async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                        if resp.status == 429:
                            await asyncio.sleep(2 ** attempt)
                            continue
                        if resp.status != 200:
                            log.warning(f"API {resp.status} for {url}")
                            return None
                        data = await resp.json()
                        _cache_set(cache_key, data, ttl)
                        return data
            except asyncio.TimeoutError:
                log.warning(f"Timeout on attempt {attempt+1} for {url}")
                await asyncio.sleep(1)
        return None
 
    # ── Matches ──────────────────────────────────────────────────────────────
 
    async def get_live_matches(self, league: str = None) -> list[dict]:
        params = {"status": "IN_PLAY,PAUSED"}
        if league:
            params["competitions"] = league
        data = await self._get("/matches", params=params, ttl=30)
        return data.get("matches", []) if data else []
 
    async def get_fixtures(self, team: str = None, league: str = None, days: int = 7) -> list[dict]:
        params = {"status": "SCHEDULED", "limit": 10}
        if league:
            params["competitions"] = league
        path = f"/teams/{team}/matches" if team and team.isdigit() else "/matches"
        data = await self._get(path, params=params)
        return data.get("matches", []) if data else []
 
    async def get_match(self, match_id: int) -> dict | None:
        data = await self._get(f"/matches/{match_id}", ttl=30)
        return data
 
    async def get_head_to_head(self, match_id: int) -> dict | None:
        data = await self._get(f"/matches/{match_id}/head2head")
        return data
 
    # ── Teams & Players ──────────────────────────────────────────────────────
 
    async def search_team(self, name: str) -> list[dict]:
        data = await self._get("/teams", params={"name": name})
        return data.get("teams", []) if data else []
 
    async def get_team(self, team_id: int) -> dict | None:
        return await self._get(f"/teams/{team_id}")
 
    async def get_team_matches(self, team_id: int, status: str = "FINISHED", limit: int = 5) -> list[dict]:
        data = await self._get(f"/teams/{team_id}/matches", params={"status": status, "limit": limit})
        return data.get("matches", []) if data else []
 
    # ── Standings ────────────────────────────────────────────────────────────
 
    async def get_standings(self, league: str = "PL") -> list[dict]:
        data = await self._get(f"/competitions/{league}/standings", ttl=300)
        if not data:
            return []
        tables = data.get("standings", [])
        for t in tables:
            if t.get("type") == "TOTAL":
                return t.get("table", [])
        return []
 
    async def get_scorers(self, league: str = "PL", limit: int = 10) -> list[dict]:
        data = await self._get(f"/competitions/{league}/scorers", params={"limit": limit}, ttl=300)
        return data.get("scorers", []) if data else []
 
    # ── Competition ──────────────────────────────────────────────────────────
 
    async def get_competition_matches(self, league: str, matchday: int = None) -> list[dict]:
        params = {}
        if matchday:
            params["matchday"] = matchday
        data = await self._get(f"/competitions/{league}/matches", params=params)
        return data.get("matches", []) if data else []
 
