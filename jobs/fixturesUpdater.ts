import { Client } from 'discord.js';
import { MatchService } from '../services/football/MatchService';
import { logger } from '../utils/logger';

let interval: ReturnType<typeof setInterval> | null = null;

export async function startFixturesUpdater(client: Client): Promise<void> {
  logger.info('[JOB] Fixtures updater started (1hr interval)');

  interval = setInterval(async () => {
    try {
      await MatchService.getFixturesByDate('today');
      logger.debug('[JOB] Fixtures cache refreshed');
    } catch (error) {
      logger.error('[JOB] Fixtures updater error', error);
    }
  }, 60 * 60 * 1000);

  interval.unref();
}

export function stopFixturesUpdater(): void {
  if (interval) clearInterval(interval);
}
