import { config } from 'dotenv';
config();

export class Env {
  private static validate(name: string, value: string | undefined): string {
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  }

  static readonly NODE_ENV = process.env.NODE_ENV || 'development';

  static readonly DISCORD_TOKEN = Env.validate('DISCORD_TOKEN', process.env.DISCORD_TOKEN);
  static readonly CLIENT_ID = Env.validate('CLIENT_ID', process.env.CLIENT_ID);
  static readonly GUILD_ID = process.env.GUILD_ID;

  static readonly MONGO_URI = Env.validate('MONGO_URI', process.env.MONGO_URI);
  static readonly REDIS_URL = process.env.REDIS_URL;

  static readonly API_FOOTBALL_KEY = Env.validate('API_FOOTBALL_KEY', process.env.API_FOOTBALL_KEY);
  static readonly API_FOOTBALL_HOST = process.env.API_FOOTBALL_HOST || 'v3.football.api-sports.io';

  static readonly FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY;

  static readonly GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  static readonly GROQ_API_KEY = process.env.GROQ_API_KEY;
  static readonly MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

  static readonly GNEWS_API_KEY = process.env.GNEWS_API_KEY;
  static readonly NEWSAPI_KEY = process.env.NEWSAPI_KEY;
  static readonly NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY;

  static readonly POLLINATIONS_BASE_URL = process.env.POLLINATIONS_BASE_URL || 'https://text.pollinations.ai';

  static readonly LOG_LEVEL = process.env.LOG_LEVEL || 'info';
  static readonly DEV_MODE = process.env.DEV_MODE === 'true';

  static readonly PARTNER_LIMIT = Number(process.env.PARTNER_LIMIT) || 10;
  static readonly MAX_FANTASY_TEAMS = Number(process.env.MAX_FANTASY_TEAMS) || 3;
  static readonly TRANSFER_COOLDOWN = Number(process.env.TRANSFER_COOLDOWN) || 3600;
}
