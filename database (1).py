"""
database.py — Async SQLite layer for Goalwire.
All tables are created on first run. Call await Database.init() at bot startup.
"""

import aiosqlite
import logging
from datetime import datetime, timezone, timedelta
from config import DB_PATH

log = logging.getLogger("goalwire.db")


class Database:
    _db: aiosqlite.Connection | None = None

    # ── Bootstrap ─────────────────────────────────────────────────────────────
    @classmethod
    async def init(cls) -> None:
        cls._db = await aiosqlite.connect(DB_PATH)
        cls._db.row_factory = aiosqlite.Row
        await cls._db.execute("PRAGMA journal_mode=WAL")
        await cls._db.execute("PRAGMA foreign_keys=ON")
        await cls._create_tables()
        log.info("Database initialised at %s", DB_PATH)

    @classmethod
    async def close(cls) -> None:
        if cls._db:
            await cls._db.close()
            cls._db = None

    @classmethod
    def conn(cls) -> aiosqlite.Connection:
        if cls._db is None:
            raise RuntimeError("Database not initialised — call Database.init() first")
        return cls._db

    # ── Schema ────────────────────────────────────────────────────────────────
    @classmethod
    async def _create_tables(cls) -> None:
        db = cls.conn()
        await db.executescript("""
        -- Subscriptions: user reminder preferences per fixture
        CREATE TABLE IF NOT EXISTS reminder_subscriptions (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER NOT NULL,
            guild_id        INTEGER NOT NULL,
            fixture_id      INTEGER NOT NULL,
            offset_minutes  INTEGER NOT NULL,   -- 1440|720|360|60|30|10|0
            sent            INTEGER DEFAULT 0,  -- 0=pending 1=sent
            created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
            UNIQUE(user_id, fixture_id, offset_minutes)
        );

        -- Tracked live fixtures (to know which message to edit)
        CREATE TABLE IF NOT EXISTS live_messages (
            fixture_id      INTEGER PRIMARY KEY,
            guild_id        INTEGER NOT NULL,
            channel_id      INTEGER NOT NULL,
            message_id      INTEGER NOT NULL,
            competition     TEXT,
            home_team       TEXT,
            away_team       TEXT,
            started_at      TEXT
        );

        -- Discord Scheduled Events we've already created (avoid duplicates)
        CREATE TABLE IF NOT EXISTS discord_events (
            fixture_id      INTEGER PRIMARY KEY,
            event_id        TEXT NOT NULL,
            guild_id        INTEGER NOT NULL,
            created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
        );

        -- Match Hub messages (one per fixture per guild)
        CREATE TABLE IF NOT EXISTS match_hubs (
            fixture_id      INTEGER NOT NULL,
            guild_id        INTEGER NOT NULL,
            channel_id      INTEGER NOT NULL,
            message_id      INTEGER NOT NULL,
            PRIMARY KEY (fixture_id, guild_id)
        );

        -- Tournament channel registry
        CREATE TABLE IF NOT EXISTS tournament_channels (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id        INTEGER NOT NULL,
            tournament      TEXT NOT NULL,
            season          INTEGER NOT NULL,
            channel_id      INTEGER NOT NULL,
            channel_type    TEXT NOT NULL,  -- news|fixtures|standings|results|brackets
            UNIQUE(guild_id, tournament, season, channel_type)
        );

        -- Guild settings (per-server preferences)
        CREATE TABLE IF NOT EXISTS guild_settings (
            guild_id            INTEGER PRIMARY KEY,
            live_channel_id     INTEGER,
            fixtures_channel_id INTEGER,
            news_channel_id     INTEGER,
            transfers_channel_id INTEGER,
            standings_channel_id INTEGER,
            results_channel_id  INTEGER,
            reminders_channel_id INTEGER,
            tournament_category_id INTEGER,
            default_timezone    TEXT DEFAULT 'UTC',
            competitions        TEXT DEFAULT '[]',  -- JSON list
            updated_at          TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
        );

        -- Goals / match events log (for match hub detail)
        CREATE TABLE IF NOT EXISTS match_events (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            fixture_id      INTEGER NOT NULL,
            event_type      TEXT NOT NULL,  -- Goal|Card|Subst|VAR
            minute          INTEGER,
            team            TEXT,
            player          TEXT,
            detail          TEXT,
            recorded_at     TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
        );

        -- News cache (de-duplicate posts)
        CREATE TABLE IF NOT EXISTS news_cache (
            url             TEXT PRIMARY KEY,
            title           TEXT,
            posted_at       TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
        );

        -- =====================================================================
        -- 🔥 GOALWIRE CARD ECONOMY & GACHA SYSTEM LAYOUTS
        -- =====================================================================

        -- 1. Economy Profiles (Handles coins, tokens, daily tracking clocks)
        CREATE TABLE IF NOT EXISTS card_profiles (
            user_id         INTEGER PRIMARY KEY,
            coins           INTEGER DEFAULT 1000,
            tokens          INTEGER DEFAULT 0,
            last_daily      TEXT,
            last_claim      TEXT,
            created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
        );

        -- 2. Card Master Registry (Defines individual card entities, stats, ratings)
        CREATE TABLE IF NOT EXISTS card_registry (
            card_id         INTEGER PRIMARY KEY AUTOINCREMENT,
            player_name     TEXT NOT NULL,
            rating          INTEGER NOT NULL,
            position        TEXT NOT NULL,
            club            TEXT NOT NULL,
            nationality     TEXT NOT NULL,
            rarity          TEXT NOT NULL DEFAULT 'Gold', -- Bronze, Silver, Gold, Icon
            market_value    INTEGER DEFAULT 0
        );

        -- 3. User Inventories (Maps collected individual player cards to specific users)
        CREATE TABLE IF NOT EXISTS user_inventories (
            instance_id     INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER NOT NULL,
            card_id         INTEGER NOT NULL,
            serial_number   INTEGER DEFAULT 1,
            acquired_at     TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
            FOREIGN KEY(user_id) REFERENCES card_profiles(user_id) ON DELETE CASCADE,
            FOREIGN KEY(card_id) REFERENCES card_registry(card_id) ON DELETE CASCADE
        );

        -- 4. Global Market Exchanges (Active user auctions, bidding listings)
        CREATE TABLE IF NOT EXISTS card_market (
            listing_id      INTEGER PRIMARY KEY AUTOINCREMENT,
            seller_id       INTEGER NOT NULL,
            instance_id     INTEGER NOT NULL,
            buy_now_price   INTEGER NOT NULL,
            current_bid     INTEGER DEFAULT 0,
            highest_bidder  INTEGER,
            expires_at      TEXT NOT NULL,
            FOREIGN KEY(instance_id) REFERENCES user_inventories(instance_id) ON DELETE CASCADE
        );
        """)
        await db.commit()

    # ── Reminder Subscriptions ────────────────────────────────────────────────
    @classmethod
    async def add_reminder(cls, user_id: int, guild_id: int, fixture_id: int,
                           offset_minutes: int) -> bool:
        """Insert reminder; return True if new, False if already existed."""
        try:
            await cls.conn().execute(
                """INSERT INTO reminder_subscriptions
                   (user_id, guild_id, fixture_id, offset_minutes)
                   VALUES (?,?,?,?)""",
                (user_id, guild_id, fixture_id, offset_minutes)
            )
            await cls.conn().commit()
            return True
        except aiosqlite.IntegrityError:
            return False

    @classmethod
    async def remove_reminder(cls, user_id: int, fixture_id: int) -> int:
        """Delete all reminder offsets for a user+fixture. Return rows deleted."""
        cur = await cls.conn().execute(
            "DELETE FROM reminder_subscriptions WHERE user_id=? AND fixture_id=?",
            (user_id, fixture_id)
        )
        await cls.conn().commit()
        return cur.rowcount

    @classmethod
    async def get_user_reminders(cls, user_id: int, guild_id: int) -> list[aiosqlite.Row]:
        cur = await cls.conn().execute(
            """SELECT * FROM reminder_subscriptions
               WHERE user_id=? AND guild_id=? AND sent=0
               ORDER BY fixture_id""",
            (user_id, guild_id)
        )
        return await cur.fetchall()

    @classmethod
    async def get_pending_reminders(cls) -> list[aiosqlite.Row]:
        """All unsent reminders across all guilds."""
        cur = await cls.conn().execute(
            "SELECT * FROM reminder_subscriptions WHERE sent=0"
        )
        return await cur.fetchall()

    @classmethod
    async def mark_reminder_sent(cls, reminder_id: int) -> None:
        await cls.conn().execute(
            "UPDATE reminder_subscriptions SET sent=1 WHERE id=?", (reminder_id,)
        )
        await cls.conn().commit()

    # ── Live Messages ─────────────────────────────────────────────────────────
    @classmethod
    async def upsert_live_message(cls, fixture_id: int, guild_id: int,
                                  channel_id: int, message_id: int,
                                  competition: str, home: str, away: str) -> None:
        await cls.conn().execute(
            """INSERT INTO live_messages
               (fixture_id, guild_id, channel_id, message_id, competition, home_team, away_team, started_at)
               VALUES (?,?,?,?,?,?,?,?)
               ON CONFLICT(fixture_id) DO UPDATE SET
                 message_id=excluded.message_id,
                 channel_id=excluded.channel_id""",
            (fixture_id, guild_id, channel_id, message_id, competition, home, away,
             datetime.now(timezone.utc).isoformat())
        )
        await cls.conn().commit()

    @classmethod
    async def get_live_message(cls, fixture_id: int) -> aiosqlite.Row | None:
        cur = await cls.conn().execute(
            "SELECT * FROM live_messages WHERE fixture_id=?", (fixture_id,)
        )
        return await cur.fetchone()

    @classmethod
    async def delete_live_message(cls, fixture_id: int) -> None:
        await cls.conn().execute(
            "DELETE FROM live_messages WHERE fixture_id=?", (fixture_id,)
        )
        await cls.conn().commit()

    @classmethod
    async def get_all_live_messages(cls) -> list[aiosqlite.Row]:
        cur = await cls.conn().execute("SELECT * FROM live_messages")
        return await cur.fetchall()

    # ── Discord Events ────────────────────────────────────────────────────────
    @classmethod
    async def event_exists(cls, fixture_id: int, guild_id: int) -> bool:
        cur = await cls.conn().execute(
            "SELECT 1 FROM discord_events WHERE fixture_id=? AND guild_id=?",
            (fixture_id, guild_id)
        )
        return await cur.fetchone() is not None

    @classmethod
    async def save_discord_event(cls, fixture_id: int, event_id: str, guild_id: int) -> None:
        await cls.conn().execute(
            """INSERT OR REPLACE INTO discord_events (fixture_id, event_id, guild_id)
               VALUES (?,?,?)""",
            (fixture_id, event_id, guild_id)
        )
        await cls.conn().commit()

    # ── Match Hubs ────────────────────────────────────────────────────────────
    @classmethod
    async def save_match_hub(cls, fixture_id: int, guild_id: int,
                             channel_id: int, message_id: int) -> None:
        await cls.conn().execute(
            """INSERT OR REPLACE INTO match_hubs
               (fixture_id, guild_id, channel_id, message_id) VALUES (?,?,?,?)""",
            (fixture_id, guild_id, channel_id, message_id)
        )
        await cls.conn().commit()

    @classmethod
    async def get_match_hub(cls, fixture_id: int, guild_id: int) -> aiosqlite.Row | None:
        cur = await cls.conn().execute(
            "SELECT * FROM match_hubs WHERE fixture_id=? AND guild_id=?",
            (fixture_id, guild_id)
        )
        return await cur.fetchone()

    # ── Guild Settings ────────────────────────────────────────────────────────
    @classmethod
    async def get_guild_settings(cls, guild_id: int) -> aiosqlite.Row | None:
        cur = await cls.conn().execute(
            "SELECT * FROM guild_settings WHERE guild_id=?", (guild_id,)
        )
        return await cur.fetchone()

    @classmethod
    async def upsert_guild_settings(cls, guild_id: int, **kwargs) -> None:
        existing = await cls.get_guild_settings(guild_id)
        if existing:
            if not kwargs:
                return
            sets = ", ".join(f"{k}=?" for k in kwargs)
            vals = list(kwargs.values()) + [guild_id]
            await cls.conn().execute(
                f"UPDATE guild_settings SET {sets}, updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE guild_id=?",
                vals
            )
        else:
            kwargs["guild_id"] = guild_id
            cols = ", ".join(kwargs.keys())
            placeholders = ", ".join("?" * len(kwargs))
            await cls.conn().execute(
                f"INSERT INTO guild_settings ({cols}) VALUES ({placeholders})",
                list(kwargs.values())
            )
        await cls.conn().commit()

    # ── Match Events Log ──────────────────────────────────────────────────────
    @classmethod
    async def log_match_event(cls, fixture_id: int, event_type: str,
                              minute: int | None, team: str,
                              player: str, detail: str) -> None:
        await cls.conn().execute(
            """INSERT OR IGNORE INTO match_events
               (fixture_id, event_type, minute, team, player, detail)
               VALUES (?,?,?,?,?,?)""",
            (fixture_id, event_type, minute, team, player, detail)
        )
        await cls.conn().commit()

    @classmethod
    async def get_match_events(cls, fixture_id: int) -> list[aiosqlite.Row]:
        cur = await cls.conn().execute(
            "SELECT * FROM match_events WHERE fixture_id=? ORDER BY minute",
            (fixture_id,)
        )
        return await cur.fetchall()

    # ── News Cache ────────────────────────────────────────────────────────────
    @classmethod
    async def is_news_posted(cls, url: str) -> bool:
        cur = await cls.conn().execute(
            "SELECT 1 FROM news_cache WHERE url=?", (url,)
        )
        return await cur.fetchone() is not None

    @classmethod
    async def mark_news_posted(cls, url: str, title: str) -> None:
        await cls.conn().execute(
            "INSERT OR IGNORE INTO news_cache (url, title) VALUES (?,?)",
            (url, title)
        )
        await cls.conn().commit()

    # ── Tournament Channels ───────────────────────────────────────────────────
    @classmethod
    async def save_tournament_channel(cls, guild_id: int, tournament: str,
                                      season: int, channel_id: int,
                                      channel_type: str) -> None:
        await cls.conn().execute(
            """INSERT OR REPLACE INTO tournament_channels
               (guild_id, tournament, season, channel_id, channel_type)
               VALUES (?,?,?,?,?)""",
            (guild_id, tournament, season, channel_id, channel_type)
        )
        await cls.conn().commit()

    @classmethod
    async def get_tournament_channels(cls, guild_id: int,
                                      tournament: str) -> list[aiosqlite.Row]:
        cur = await cls.conn().execute(
            "SELECT * FROM tournament_channels WHERE guild_id=? AND tournament=?",
            (guild_id, tournament)
        )
        return await cur.fetchall()

    # ── Card Economy Helpers ──────────────────────────────────────────────────
    @classmethod
    async def get_profile(cls, user_id: int) -> aiosqlite.Row:
        """Fetch user cash balance profile. Automatically provisions profile if missing."""
        db = cls.conn()
        cur = await db.execute("SELECT * FROM card_profiles WHERE user_id=?", (user_id,))
        profile = await cur.fetchone()
        if not profile:
            await db.execute("INSERT OR IGNORE INTO card_profiles (user_id, coins) VALUES (?, 1000)", (user_id,))
            await db.commit()
            cur = await db.execute("SELECT * FROM card_profiles WHERE user_id=?", (user_id,))
            profile = await cur.fetchone()
        return profile

    @classmethod
    async def adjust_coins(cls, user_id: int, amount: int) -> None:
        """Add or remove coins from a user profile."""
        db = cls.conn()
        await cls.get_profile(user_id) # Ensure profile exists
        await db.execute("UPDATE card_profiles SET coins = coins + ? WHERE user_id = ?", (amount, user_id))
        await db.commit()

    @classmethod
    async def get_inventory(cls, user_id: int) -> list[aiosqlite.Row]:
        """Fetch entire card inventory collection for a user."""
        cur = await cls.conn().execute("""
            SELECT ui.instance_id, r.player_name, r.rating, r.rarity, r.club, r.position 
            FROM user_inventories ui
            JOIN card_registry r ON ui.card_id = r.card_id
            WHERE ui.user_id = ? ORDER BY r.rating DESC
        """, (user_id,))
        return await cur.fetchall()

    @classmethod
    async def add_card_to_inventory(cls, user_id: int, card_id: int) -> None:
        """Directly insert a card variant straight into user's ledger storage."""
        db = cls.conn()
        await db.execute("INSERT INTO user_inventories (user_id, card_id) VALUES (?, ?)", (user_id, card_id))
        await db.commit()

    # ── Advanced Trading & Market Exchange Helpers ───────────────────────────
    @classmethod
    async def create_market_listing(cls, seller_id: int, instance_id: int, price: int, duration_hours: int = 24) -> int | None:
        """Puts an inventory item up for public sale. Returns listing_id if successful."""
        db = cls.conn()
        cur = await db.execute("SELECT 1 FROM user_inventories WHERE instance_id=? AND user_id=?", (instance_id, seller_id))
        if not await cur.fetchone():
            return None
            
        expiry = (datetime.now(timezone.utc) + timedelta(hours=duration_hours)).strftime('%Y-%m-%dT%H:%M:%SZ')
        cur = await db.execute(
            """INSERT INTO card_market (seller_id, instance_id, buy_now_price, expires_at) 
               VALUES (?, ?, ?, ?)""",
            (seller_id, instance_id, price, expiry)
        )
        await db.commit()
        return cur.lastrowid

    @classmethod
    async def get_active_market(cls) -> list[aiosqlite.Row]:
        """Fetch all non-expired marketplace listings with card details attached."""
        cur = await cls.conn().execute("""
            SELECT m.listing_id, m.seller_id, m.buy_now_price, m.expires_at,
                   r.player_name, r.rating, r.rarity, r.position
            FROM card_market m
            JOIN user_inventories ui ON m.instance_id = ui.instance_id
            JOIN card_registry r ON ui.card_id = r.card_id
            WHERE datetime(m.expires_at) > datetime('now')
            ORDER BY m.listing_id DESC
        """)
        return await cur.fetchall()

    @classmethod
    async def buy_from_market(cls, listing_id: int, buyer_id: int) -> tuple[bool, str]:
        """Executes a buy-now market purchase transaction securely."""
        db = cls.conn()
        cur = await db.execute("""
            SELECT m.*, ui.user_id as owner_id, ui.instance_id
            FROM card_market m
            JOIN user_inventories ui ON m.instance_id = ui.instance_id
            WHERE m.listing_id = ?
        """, (listing_id,))
        listing = await cur.fetchone()
        
        if not listing:
            return False, "Listing not found or already closed."
        if listing["owner_id"] == buyer_id:
            return False, "You cannot buy your own card."
            
        buyer_profile = await cls.get_profile(buyer_id)
        price = listing["buy_now_price"]
        if buyer_profile["coins"] < price:
            return False, f"Insufficient coins. You need **{price}** coins."

        await cls.adjust_coins(buyer_id, -price)
        await cls.adjust_coins(listing["seller_id"], price)
        
        await db.execute("UPDATE user_inventories SET user_id = ? WHERE instance_id = ?", (buyer_id, listing["instance_id"]))
        await db.execute("DELETE FROM card_market WHERE listing_id = ?", (listing_id,))
        await db.commit()
        return True, "Success"

    @classmethod
    async def transfer_card_direct(cls, instance_id: int, sender_id: int, receiver_id: int) -> bool:
        """Directly updates a card instance ownership from sender to receiver."""
        db = cls.conn()
        cur = await db.execute("SELECT 1 FROM user_inventories WHERE instance_id=? AND user_id=?", (instance_id, sender_id))
        if not await cur.fetchone():
            return False
            
        await db.execute("UPDATE user_inventories SET user_id = ? WHERE instance_id = ?", (receiver_id, instance_id))
        await db.commit()
        return True
