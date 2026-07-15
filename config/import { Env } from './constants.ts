export const BOT_NAME = 'GoalX';
export const BOT_VERSION = '2.0.0';
export const BOT_DESCRIPTION = 'The Ultimate Fantasy Football Discord Bot';
export const BOT_INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot+applications.commands';
export const SUPPORT_SERVER_URL = 'https://discord.gg/goalx';
export const WEBSITE_URL = 'https://goalx.gg';
export const GITHUB_URL = 'https://github.com/goalx/bot';

export const LEAGUE_IDS = {
  PREMIER_LEAGUE: 39,
  LA_LIGA: 140,
  BUNDESLIGA: 78,
  SERIE_A: 135,
  LIGUE_1: 61,
  CHAMPIONS_LEAGUE: 2,
  EUROPA_LEAGUE: 3,
  WORLD_CUP: 1,
  EURO_CHAMPIONSHIP: 4,
  COPA_AMERICA: 9,
};

export const POSITIONS = {
  GOALKEEPER: 'Goalkeeper',
  DEFENDER: 'Defender',
  MIDFIELDER: 'Midfielder',
  FORWARD: 'Forward',
} as const;

export const POSITION_SHORT = {
  Goalkeeper: 'GK',
  Defender: 'DEF',
  Midfielder: 'MID',
  Forward: 'FWD',
} as const;

export const FANTASY_LIMITS = {
  MAX_TEAMS_PER_USER: 3,
  MAX_LEAGUES_PER_USER: 10,
  MAX_PARTICIPANTS_PER_LEAGUE: 50,
  SQUAD_SIZE: 15,
  STARTING_XI: 11,
  SUBS: 4,
  MAX_PER_CLUB: 3,
  TRANSFERS_PER_GAMEWEEK: 2,
  WILDCARDS_PER_SEASON: 2,
  FREE_HITS_PER_SEASON: 1,
  BENCH_BOOSTS_PER_SEASON: 1,
  TRIPLE_CAPTAINS_PER_SEASON: 1,
};

export const POINTS = {
  GOAL: 6,
  ASSIST: 4,
  CLEAN_SHEET: 4,
  SAVE: 1,
  PENALTY_SAVE: 5,
  PENALTY_MISS: -3,
  YELLOW_CARD: -1,
  RED_CARD: -3,
  OWN_GOAL: -3,
  APPEARANCE: 2,
  WIN: 2,
  DRAW: 1,
  BONUS: 3,
  CAPTAIN_MULTIPLIER: 2,
  VICE_CAPTAIN_MULTIPLIER: 1.5,
};

export const ECONOMY = {
  STARTING_BUDGET: 100_000_000,
  TRANSFER_COST: 0,
  PRICE_CHANGE_MIN: -0.5,
  PRICE_CHANGE_MAX: 0.5,
  PRICE_LOCK_GAMEWEEKS: 3,
};

export const COOLDOWNS = {
  TRANSFER: 3600,
  SCOUT: 30,
  AI_ANALYSIS: 15,
  PREDICT: 20,
  NEWS_REFRESH: 60,
  MATCH_REFRESH: 30,
};

export const EMOJIS = {
  GOAL: '⚽',
  ASSIST: '🎯',
  CLEAN_SHEET: '🧤',
  YELLOW_CARD: '🟨',
  RED_CARD: '🟥',
  SUBSTITUTION: '🔄',
  PENALTY: '⬜',
  OWN_GOAL: '😅',
  SAVE: '🙌',
  STAR: '⭐',
  CAPTAIN: '👑',
  VICE_CAPTAIN: '💎',
  TROPHY: '🏆',
  FIRE: '🔥',
  CROWN: '👑',
  LOCK: '🔒',
  UNLOCK: '🔓',
  MONEY: '💰',
  TRANSFER: '🔄',
  SCOUT: '🔍',
  AI: '🤖',
  NEWS: '📰',
  LIVE: '🔴',
  CALENDAR: '📅',
  CHART: '📊',
  SETTINGS: '⚙️',
  WARNING: '⚠️',
  ERROR: '❌',
  SUCCESS: '✅',
  INFO: 'ℹ️',
  LOADING: '🔄',
  BACK: '◀️',
  NEXT: '▶️',
};
