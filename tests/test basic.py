"""
Basic tests — these run in CI without real API keys.
"""
import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'bot'))
 
 
def test_config_loads():
    """Config should load without crashing (even with fake tokens)."""
    import importlib
    import config
    assert hasattr(config, 'Config')
    assert config.Config.LEAGUES  # should have league map
 
 
def test_league_codes():
    from config import Config
    assert "PL" in Config.LEAGUES
    assert "CL" in Config.LEAGUES
    assert "BL1" in Config.LEAGUES
 
 
def test_embed_builders_import():
    """Embed builders should import cleanly."""
    from embeds.embeds import build_match_embed, build_standings_embed, build_alert_embed
    assert callable(build_match_embed)
    assert callable(build_standings_embed)
    assert callable(build_alert_embed)
 
 
def test_build_match_embed_minimal():
    """build_match_embed should handle sparse match data without crashing."""
    from embeds.embeds import build_match_embed
    match = {
        "id": 1,
        "homeTeam": {"name": "Arsenal"},
        "awayTeam": {"name": "Chelsea"},
        "status": "SCHEDULED",
        "competition": {"name": "Premier League", "code": "PL"},
        "score": {"fullTime": {"home": None, "away": None}},
    }
    embed = build_match_embed(match)
    assert "Arsenal" in embed.title
    assert "Chelsea" in embed.title
 
 
def test_standings_embed():
    from embeds.embeds import build_standings_embed
    table = [
        {"position": i, "team": {"name": f"Team {i}", "shortName": f"T{i}"}, "points": 30-i, "playedGames": 20, "goalDifference": i}
        for i in range(1, 15)
    ]
    embed = build_standings_embed(table, "Test League", page=0)
    assert "Test League" in embed.title
 
