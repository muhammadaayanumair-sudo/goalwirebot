import aiohttp
import json
import logging
from config import Config

log = logging.getLogger("ai-service")


class AIService:
    """Wrapper around OpenAI chat completions for football insights."""

    SYSTEM_PROMPT = (
        "You are GoalWire AI, an expert football analyst embedded in a Discord bot. "
        "Be concise, insightful, and use football terminology naturally. "
        "Format responses for Discord: use **bold** for key points, keep it under 300 words."
    )

    async def _chat(self, user_prompt: str, max_tokens: int = 400) -> str | None:
        if not Config.OPENAI_API_KEY:
            return "⚠️ AI features require an OpenAI API key. Set `OPENAI_API_KEY` in Railway."

        headers = {
            "Authorization": f"Bearer {Config.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "gpt-4o-mini",
            "max_tokens": max_tokens,
            "messages": [
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        }
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=20),
                ) as resp:
                    if resp.status != 200:
                        log.error(f"OpenAI error {resp.status}")
                        return None
                    data = await resp.json()
                    return data["choices"][0]["message"]["content"]
        except Exception as e:
            log.error(f"AI service error: {e}")
            return None

    async def match_preview(self, home: str, away: str, h2h: list[dict] = None) -> str:
        h2h_text = ""
        if h2h:
            recent = [f"{m['homeTeam']['name']} {m['score']['fullTime']['home']}-{m['score']['fullTime']['away']} {m['awayTeam']['name']}" for m in h2h[:5] if m.get('score', {}).get('fullTime', {}).get('home') is not None]
            if recent:
                h2h_text = f"\n\nRecent H2H:\n" + "\n".join(recent)
        prompt = f"Write a pre-match preview for {home} vs {away}.{h2h_text}\nCover: current form, key players to watch, tactical matchup, and a brief prediction."
        return await self._chat(prompt) or "Could not generate preview."

    async def predict_match(self, home: str, away: str, context: str = "") -> str:
        prompt = f"Predict the outcome of {home} vs {away}. {context}\nGive percentage win probabilities, expected score, and 3 key reasons. Be analytical."
        return await self._chat(prompt) or "Could not generate prediction."

    async def summarize_match(self, match_data: dict) -> str:
        home = match_data.get("homeTeam", {}).get("name", "Home")
        away = match_data.get("awayTeam", {}).get("name", "Away")
        score = match_data.get("score", {}).get("fullTime", {})
        goals = match_data.get("goals", [])
        scorers = ", ".join([f"{g['scorer']['name']} ({g['minute']}')" for g in goals[:8]]) if goals else "No goal details"
        prompt = f"Summarize this match: {home} {score.get('home')}-{score.get('away')} {away}. Scorers: {scorers}. Write a punchy 3-sentence match report."
        return await self._chat(prompt, max_tokens=200) or "Could not generate summary."

    async def player_insight(self, player_name: str, stats: str) -> str:
        prompt = f"Give a brief scout report on {player_name}. Stats context: {stats}. Cover strengths, weaknesses, and current form in 150 words."
        return await self._chat(prompt, max_tokens=250) or "Could not generate insight."

    async def trivia_question(self, difficulty: str = "medium") -> dict:
        prompt = (
            f"Generate a {difficulty} football trivia question. "
            "Return ONLY a JSON object with keys: question, options (list of 4), answer (the correct option), fun_fact."
        )
        raw = await self._chat(prompt, max_tokens=200)
        if not raw:
            return {}
        try:
            # Strip markdown code fences if present
            clean = raw.strip().strip("```json").strip("```").strip()
            return json.loads(clean)
        except Exception:
            return {}
