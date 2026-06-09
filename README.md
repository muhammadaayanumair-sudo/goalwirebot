# Goal Wire Football Bot

A modular, high-performance Discord bot for real-time football data, player statistics, and interactive trivia. Built for speed and scalability.

## 🏆 Key Features
- **Live Match Updates**: Real-time scores, goal alerts, and match threads.
- **Data-Driven**: Statistics for 50,000+ players and 1,000+ teams.
- **Interactive**: Full slash command suite with custom embeds and button interactions.
- **Trivia System**: MCQ-based football quiz with streaks, scoring, and leaderboards.
- **Customizable**: Set your timezone, follow specific leagues/teams, and configure auto-post channels.

## 📊 Supported Leagues
| Code | League |
| :--- | :--- |
| **PL** | Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿 |
| **BL1** | Bundesliga 🇩🇪 |
| **SA** | Serie A 🇮🇹 |
| **PD** | La Liga 🇪🇸 |
| **FL1** | Ligue 1 🇫🇷 |
| **CL** | Champions League ⭐ |
| **EL** | Europa League 🟠 |

## ⚙️ Modular Architecture
This bot uses a Cog-based structure for clean, maintainable code:
- `bot.py`: Main entry point and loader.
- `cogs/football.py`: Core football data commands.
- `cogs/database.py`: Persistent data storage for guild settings/trivia.
- `cogs/fun.py`: Banter and Trivia system.
- `cogs/utils.py`: Shared API handling and UI formatting.

## 🚀 Setup & Deployment
1. **Clone the repository**: `git clone [your-repo-link]`
2. **Install dependencies**: `pip install -r requirements.txt`
3. **Environment**: Create a `.env` file with the following variables:
   - `DISCORD_TOKEN=...`
   - `FOOTBALL_API_KEY=...`
4. **Deploy**: The bot is configured for Railway deployment via `Procfile`.

## 🛠️ Commands Overview
| Category | Commands |
| :--- | :--- |
| **Live** | `/livescore`, `/fixtures`, `/result`, `/h2h` |
| **Stats** | `/standings`, `/team`, `/player`, `/topscorers` |
| **Trivia** | `/trivia start`, `/trivia leaderboard`, `/trivia daily` |
| **Admin** | `/setchannel`, `/settimezone`, `/follow`, `/unfollow` |

---
*Powered by Goal Wire | Data: Football-Data.org*
