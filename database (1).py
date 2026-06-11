# ── Schema Updates ────────────────────────────────────────────────────────
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
            offset_minutes  INTEGER NOT NULL,
            sent            INTEGER DEFAULT 0,
            created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
            UNIQUE(user_id, fixture_id, offset_minutes)
        );

        -- Tracked live fixtures
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

        -- Discord Scheduled Events
        CREATE TABLE IF NOT EXISTS discord_events (
            fixture_id      INTEGER PRIMARY KEY,
            event_id        TEXT NOT NULL,
            guild_id        INTEGER NOT NULL,
            created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
        );

        -- Match Hub messages
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
            channel_type    TEXT NOT NULL,
            UNIQUE(guild_id, tournament, season, channel_type)
        );

        -- Guild settings
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
            competitions        TEXT DEFAULT '[]',
            updated_at          TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
        );

        -- Match events log
        CREATE TABLE IF NOT EXISTS match_events (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            fixture_id      INTEGER NOT NULL,
            event_type      TEXT NOT NULL,
            minute          INTEGER,
            team            TEXT,
            player          TEXT,
            detail          TEXT,
            recorded_at     TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
        );

        -- News cache
        CREATE TABLE IF NOT EXISTS news_cache (
            url             TEXT PRIMARY KEY,
            title           TEXT,
            posted_at       TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
        );
        
        -- Tournament channels
        CREATE TABLE IF NOT EXISTS tournament_channels (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id        INTEGER NOT NULL,
            tournament      TEXT NOT NULL,
            season          INTEGER NOT NULL,
            channel_id      INTEGER NOT NULL,
            channel_type    TEXT NOT NULL,
            UNIQUE(guild_id, tournament, season, channel_type)
        );

        -- =====================================================================
        -- 🔥 GOALWIRE ULTIMATE CARD ECONOMY SYSTEM EXTENSIONS
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
            rarity          TEXT NOT NULL DEFAULT 'Gold', -- Bronze, Silver, Gold, Icon, Mystery
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
