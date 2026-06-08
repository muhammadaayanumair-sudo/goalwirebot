# ⚽ GoalWire

A feature-rich football Discord bot built with `discord.py`. Live scores, standings, FPL integration, AI match previews, and goal alerts — all in one bot.

---

## Features

| Category | Commands |
|---|---|
| 📺 **Live matches** | `/livescore`, `/fixtures`, `/result`, `/scorers`, `/h2h` |
| 📊 **Stats** | `/standings`, `/team`, `/teamsearch` |
| 🤖 **AI insights** | `/preview`, `/predict`, `/summarize`, `/scout` |
| 🏅 **Fantasy PL** | `/fpllink`, `/myfpl`, `/fplplayer`, `/fplleague` |
| 🔔 **Alerts** | `/alert add/list/remove` — auto-posts goals, kickoffs, results |
| 🎉 **Fun** | `/trivia`, `/poll`, `/banter`, `/whoami` |
| ⚙️ **Admin** | `/setup`, `/botinfo` |

---

## Supported Leagues

| Code | League |
|---|---|
| `PL` | Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿 |
| `BL1` | Bundesliga 🇩🇪 |
| `SA` | Serie A 🇮🇹 |
| `PD` | La Liga 🇪🇸 |
| `FL1` | Ligue 1 🇫🇷 |
| `CL` | Champions League ⭐ |
| `EL` | Europa League 🟠 |

---

## Setup (Local Development)

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/goalwire.git
cd goalwire
```

### 2. Create a virtual environment

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Get your API keys

| Key | Where to get it | Required? |
|---|---|---|
| `DISCORD_TOKEN` | [discord.com/developers](https://discord.com/developers/applications) → Bot tab | ✅ Yes |
| `FOOTBALL_DATA_API_KEY` | [football-data.org/client/register](https://www.football-data.org/client/register) (free) | ✅ Yes |
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | ⚡ AI features |

### 4. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in your keys
```

### 5. Invite the bot to your server

In the Discord Developer Portal → OAuth2 → URL Generator:
- Scopes: `bot`, `applications.commands`
- Bot permissions: `Send Messages`, `Embed Links`, `Add Reactions`, `Read Message History`

### 6. Run the bot

```bash
python bot/main.py
```

---

## Deploy to Railway

### First time setup

1. Push your code to GitHub (make sure `.env` is in `.gitignore` ✅)

2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo

3. Select your repository

4. Add a **PostgreSQL** plugin (optional but recommended):
   - Railway Dashboard → New → Database → PostgreSQL
   - `DATABASE_URL` is auto-injected

5. Add your environment variables in Railway's **Variables** tab:

```
DISCORD_TOKEN          = your_token
FOOTBALL_DATA_API_KEY  = your_key
OPENAI_API_KEY         = your_key  (optional)
```

6. Railway auto-deploys on every push to `main` ✅

### Auto-deploy via GitHub Actions (optional)

1. Get your Railway token: Railway Dashboard → Account → Tokens

2. Add it to GitHub Secrets:
   - GitHub repo → Settings → Secrets → Actions
   - Name: `RAILWAY_TOKEN`, Value: your token

3. Now every push to `main` runs tests first, then deploys ✅

---

## Project Structure

```
goalwire/
├── bot/
│   ├── main.py              # Entry point
│   ├── config.py            # Environment config
│   ├── cogs/
│   │   ├── matches.py       # /livescore /fixtures /result /scorers /h2h
│   │   ├── stats.py         # /standings /team /teamsearch
│   │   ├── fantasy.py       # /fpllink /myfpl /fplplayer /fplleague
│   │   ├── alerts.py        # /alert + background polling task
│   │   ├── ai.py            # /preview /predict /summarize /scout
│   │   ├── admin.py         # /setup /botinfo
│   │   └── fun.py           # /trivia /poll /banter /whoami
│   ├── embeds/
│   │   └── embeds.py        # All embed builders
│   └── models/
│       └── database.py      # SQLAlchemy models + async engine
├── services/
│   ├── football_api.py      # football-data.org client + cache
│   ├── fpl_service.py       # FPL API client
│   └── ai_service.py        # OpenAI integration
├── tests/
│   └── test_basic.py
├── .github/workflows/
│   └── deploy.yml           # CI/CD pipeline
├── Procfile                 # Railway process definition
├── railway.toml             # Railway config
├── requirements.txt
├── .env.example
└── README.md
```

---

## Adding a New Command

1. Create or pick a cog in `bot/cogs/`
2. Add an `@app_commands.command` method
3. Register it in `setup(bot)` at the bottom of the file
4. The bot auto-syncs slash commands on startup

Example:
```python
@app_commands.command(name="mycommand", description="Does something cool")
async def mycommand(self, interaction: discord.Interaction):
    await interaction.response.send_message("Hello!")
```

---

## Environment Variables Reference

| Variable | Description | Default |
|---|---|---|
| `DISCORD_TOKEN` | Bot token | Required |
| `FOOTBALL_DATA_API_KEY` | football-data.org key | Required |
| `OPENAI_API_KEY` | OpenAI key for AI features | Optional |
| `DATABASE_URL` | Postgres URL (Railway auto-sets) | SQLite fallback |
| `REDIS_URL` | Redis URL for faster caching | In-memory fallback |
| `DEFAULT_LEAGUE` | Default league code | `PL` |
| `CACHE_TTL` | API cache duration (seconds) | `60` |
| `ALERT_POLL_INTERVAL` | Live match polling interval (seconds) | `60` |

---

## License

MIT
