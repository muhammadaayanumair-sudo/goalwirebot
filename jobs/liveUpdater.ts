import { Client } from 'discord.js';
import { LiveService } from '../services/football/LiveService';
import { NotificationService } from '../services/notification/NotificationService';
import { logger } from '../utils/logger';

let interval: ReturnType<typeof setInterval> | null = null;

export async function startLiveUpdater(client: Client): Promise<void> {
  logger.info('[JOB] Live updater started (30s interval)');

  interval = setInterval(async () => {
    try {
      const matches = await LiveService.getLiveMatches();
      if (matches.length > 0) {
        logger.debug(`[JOB] ${matches.length} live matches updating`);
      }
    } catch (error) {
      logger.error('[JOB] Live updater error', error);
    }
  }, 30_000);

  interval.unref();
}

export function stopLiveUpdater(): void {
  if (interval) {
    clearInterval(interval);
    interval = null;
    logger.info('[JOB] Live updater stopped');
  }
}
