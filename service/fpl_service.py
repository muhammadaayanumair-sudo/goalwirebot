import aiohttp
import logging
from services.football_api import _cache_get, _cache_set

log = logging.getLogger("fpl-service")

FPL_BASE = "https://fantasy.premierleague.com/api"


async def _fpl_get(path: str, ttl: int = 300) -> dict | None:
    cached = _cache_get(f"fpl:{path}")
    if cached:
        return cached
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{FPL_BASE}{path}", timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status != 200:
                    return None
                data = await resp.json()
                _cache_set(f"fpl:{path}", data, ttl)
                return data
    except Exception as e:
        log.error(f"FPL API error: {e}")
        return None


class FPLService:
    async def get_bootstrap(self) -> dict | None:
        """Full FPL bootstrap — players, teams, gameweeks."""
        return await _fpl_get("/bootstrap-static/", ttl=600)

    async def get_team(self, team_id: int) -> dict | None:
        return await _fpl_get(f"/entry/{team_id}/", ttl=120)

    async def get_team_picks(self, team_id: int, gameweek: int) -> dict | None:
        return await _fpl_get(f"/entry/{team_id}/event/{gameweek}/picks/", ttl=60)

    async def get_team_history(self, team_id: int) -> dict | None:
        return await _fpl_get(f"/entry/{team_id}/history/", ttl=300)

    async def get_player(self, player_id: int) -> dict | None:
        return await _fpl_get(f"/element-summary/{player_id}/", ttl=300)

    async def get_current_gameweek(self) -> int | None:
        data = await self.get_bootstrap()
        if not data:
            return None
        for event in data.get("events", []):
            if event.get("is_current"):
                return event["id"]
        return None

    async def get_league_standings(self, league_id: int, page: int = 1) -> dict | None:
        return await _fpl_get(f"/leagues-classic/{league_id}/standings/?page_standings={page}", ttl=120)

    async def get_live_gameweek(self, gameweek: int) -> dict | None:
        return await _fpl_get(f"/event/{gameweek}/live/", ttl=30)

    async def get_fixtures(self, gameweek: int = None) -> list[dict]:
        path = f"/fixtures/?event={gameweek}" if gameweek else "/fixtures/"
        data = await _fpl_get(path, ttl=300)
        return data if isinstance(data, list) else []

    async def search_player(self, name: str) -> list[dict]:
        data = await self.get_bootstrap()
        if not data:
            return []
        name_lower = name.lower()
        return [
            p for p in data.get("elements", [])
            if name_lower in p.get("web_name", "").lower()
            or name_lower in f"{p.get('first_name','')} {p.get('second_name','')}".lower()
        ][:5]
