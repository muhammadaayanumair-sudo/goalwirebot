import { Env } from './env';

export interface AIProviderConfig {
  provider: 'gemini' | 'groq' | 'mistral';
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface NewsProviderConfig {
  provider: 'gnews' | 'newsapi' | 'newsdata';
  apiKey: string;
  maxResults: number;
}

export interface FootballAPIConfig {
  provider: 'api-football' | 'football-data';
  apiKey: string;
  host: string;
  rateLimit: number;
}

export interface BotConfig {
  prefix: string;
  defaultLocale: string;
  supportGuildId: string;
  botLogChannelId: string;
  errorLogChannelId: string;
  partnerRoleId: string;
  premiumRoleId: string;
  defaultEmbedColor: number;
  maxEmbedFields: number;
  paginationTimeout: number;
  buttonCooldown: number;
}

class AppConfig {
  readonly bot: BotConfig = {
    prefix: '!',
    defaultLocale: 'en',
    supportGuildId: process.env.SUPPORT_GUILD_ID || '',
    botLogChannelId: process.env.BOT_LOG_CHANNEL_ID || '',
    errorLogChannelId: process.env.ERROR_LOG_CHANNEL_ID || '',
    partnerRoleId: process.env.PARTNER_ROLE_ID || '',
    premiumRoleId: process.env.PREMIUM_ROLE_ID || '',
    defaultEmbedColor: 0x00ff87,
    maxEmbedFields: 25,
    paginationTimeout: 120_000,
    buttonCooldown: 3_000,
  };

  readonly ai: AIProviderConfig[] = [
    {
      provider: 'gemini',
      apiKey: Env.GEMINI_API_KEY || '',
      model: 'gemini-2.0-flash',
      maxTokens: 1024,
      temperature: 0.7,
    },
    {
      provider: 'groq',
      apiKey: Env.GROQ_API_KEY || '',
      model: 'llama-3.3-70b-versatile',
      maxTokens: 1024,
      temperature: 0.7,
    },
    {
      provider: 'mistral',
      apiKey: Env.MISTRAL_API_KEY || '',
      model: 'mistral-large-latest',
      maxTokens: 1024,
      temperature: 0.7,
    },
  ];

  readonly news: NewsProviderConfig[] = [
    {
      provider: 'gnews',
      apiKey: Env.GNEWS_API_KEY || '',
      maxResults: 10,
    },
    {
      provider: 'newsapi',
      apiKey: Env.NEWSAPI_KEY || '',
      maxResults: 10,
    },
    {
      provider: 'newsdata',
      apiKey: Env.NEWSDATA_API_KEY || '',
      maxResults: 10,
    },
  ];

  readonly football: FootballAPIConfig = {
    provider: 'api-football',
    apiKey: Env.API_FOOTBALL_KEY,
    host: Env.API_FOOTBALL_HOST,
    rateLimit: 100,
  };

  readonly footballData: FootballAPIConfig = {
    provider: 'football-data',
    apiKey: Env.FOOTBALL_DATA_KEY || '',
    host: 'api.football-data.org',
    rateLimit: 10,
  };

  readonly cacheTTL = {
    football: 30,
    standings: 60,
    news: 300,
    fantasy: 10,
    leaderboard: 60,
    player: 3600,
    team: 1800,
  };

  readonly fantasy = {
    budget: 100_000_000,
    squadSize: 15,
    startingXI: 11,
    subs: 4,
    maxPerClub: 3,
    captainMultiplier: 2,
    viceCaptainMultiplier: 1.5,
    pointsPerGoal: 6,
    pointsPerAssist: 4,
    pointsPerCleanSheet: 4,
    pointsPerSave: 1,
    pointsPerPenaltySave: 5,
    pointsPerPenaltyMiss: -3,
    pointsPerYellowCard: -1,
    pointsPerRedCard: -3,
    pointsPerOwnGoal: -3,
    pointsPerAppearance: 2,
    pointsPerWin: 2,
    pointsPerDraw: 1,
    pointsPerBonus: 3,
    transferLimit: 2,
    transferCost: 0,
    wildcardsPerSeason: 2,
  };
}

export const config = new AppConfig();
