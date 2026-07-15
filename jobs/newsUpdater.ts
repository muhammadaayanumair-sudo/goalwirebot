import { Client } from 'discord.js';
import { NewsService } from '../services/news/NewsService';
import { logger } from '../utils/logger';

let interval: ReturnType<typeof setInterval> | null = null;

export async function startNewsUpdater(client: Client): Promise<void> {
  logger.info('[JOB] News updater started (15min interval)');

  interval = setInterval(async () => {
    try {
      await NewsService.getLatestNews();
      logger.debug('[JOB] News cache refreshed');
    } catch (error) {
      logger.error('[JOB] News updater error', error);
    }
  }, 15 * 60 * 1000);

  interval.unref();
}

export function stopNewsUpdater(): void {
  if (interval) clearInterval(interval);
}
