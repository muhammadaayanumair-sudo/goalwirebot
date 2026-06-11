"""
services/news_service.py — Fetches football news & transfer headlines
from public RSS feeds and posts them to Discord.
"""

from __future__ import annotations
import asyncio
import logging
import xml.etree.ElementTree as ET
import aiohttp
from database import Database
from utils.embeds import EmbedBuilder

log = logging.getLogger("goalwire.news")

# Public football RSS feeds (no key required)
NEWS_FEEDS = [
    ("BBC Sport Football",   "https://feeds.bbci.co.uk/sport/football/rss.xml",     "news"),
    ("Sky Sports Football",  "https://www.skysports.com/rss/12040",                  "news"),
    ("Goal.com",             "https://www.goal.com/feeds/en/news",                   "news"),
    ("Transfermarkt",        "https://www.transfermarkt.com/rss/transfers/ajax/0",   "transfer"),
]


class NewsService:
    def __init__(self, bot) -> None:
        self.bot  = bot
        self._session: aiohttp.ClientSession | None = None

    async def setup(self) -> None:
        self._session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=15)
        )

    async def close(self) -> None:
        if self._session:
            await self._session.close()

    # ── RSS Parser ────────────────────────────────────────────────────────────
    async def _fetch_feed(self, url: str) -> list[dict]:
        """Fetch and parse an RSS feed → list of {title, link, description, enclosure}"""
        if not self._session:
            return []
        try:
            async with self._session.get(url) as resp:
                if resp.status != 200:
                    return []
                text = await resp.text()
            root = ET.fromstring(text)
            items = []
            ns = {}
            for item in root.findall(".//item"):
                title = item.findtext("title") or ""
                link  = item.findtext("link") or ""
                desc  = item.findtext("description") or ""
                enc   = item.find("enclosure")
                image = enc.get("url", "") if enc is not None else ""
                items.append({"title": title, "link": link,
                               "description": desc, "image": image})
            return items
        except Exception as exc:
            log.warning("Feed error (%s): %s", url, exc)
            return []

    # ── Post new articles ─────────────────────────────────────────────────────
    async def poll_and_post(self, guild_id: int,
                             news_channel_id: int | None,
                             transfer_channel_id: int | None) -> None:
        for source_name, url, feed_type in NEWS_FEEDS:
            items = await self._fetch_feed(url)
            channel_id = transfer_channel_id if feed_type == "transfer" else news_channel_id
            if not channel_id:
                continue
            channel = self.bot.get_channel(channel_id)
            if not channel:
                continue

            for item in items[:5]:  # max 5 per feed per poll
                link = item["link"]
                if not link or await Database.is_news_posted(link):
                    continue

                embed = (
                    EmbedBuilder.transfer_news(
                        item["title"], item["description"], link, item["image"]
                    ) if feed_type == "transfer" else
                    EmbedBuilder.breaking_news(
                        item["title"], item["description"], link, item["image"]
                    )
                )
                embed.set_footer(text=f"📰 {source_name} • Goalwire Football OS")

                try:
                    await channel.send(embed=embed)
                    await Database.mark_news_posted(link, item["title"])
                    await asyncio.sleep(1)  # avoid hitting Discord rate limits
                except Exception as exc:
                    log.error("Failed to post news: %s", exc)
