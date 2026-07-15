import { GoalXClient } from './client/GoalXClient';
import { logger } from './utils/logger';
import { BOT_NAME, BOT_VERSION } from './config/constants';

export class Bot {
  private static instance: Bot;
  private client: GoalXClient;
  private startTime: number = 0;

  private constructor() {
    this.client = new GoalXClient();
  }

  public static getInstance(): Bot {
    if (!Bot.instance) {
      Bot.instance = new Bot();
    }
    return Bot.instance;
  }

  public async start(): Promise<void> {
    this.startTime = Date.now();

    try {
      logger.info(`[${BOT_NAME}] Booting ${BOT_NAME} v${BOT_VERSION}...`);
      await this.client.login();
    } catch (error) {
      logger.error(`[${BOT_NAME}] Failed to start`, error);
      throw error;
    }
  }

  public getClient(): GoalXClient {
    return this.client;
  }

  public getUptime(): number {
    return Date.now() - this.startTime;
  }

  public async shutdown(): Promise<void> {
    logger.info(`[${BOT_NAME}] Shutting down...`);
    this.client.destroy();
  }
}
