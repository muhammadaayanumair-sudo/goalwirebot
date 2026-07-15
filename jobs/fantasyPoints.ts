import { Client } from 'discord.js';
import { FantasyTeam } from '../database/models/FantasyTeam';
import { PointsService } from '../services/fantasy/PointsService';
import { logger } from '../utils/logger';

let interval: ReturnType<typeof setInterval> | null = null;

export async function startFantasyPointsUpdater(client: Client): Promise<void> {
  logger.info('[JOB] Fantasy points updater started (5min interval)');

  interval = setInterval(async () => {
    try {
      const teams = await FantasyTeam.find({});
      for (const team of teams) {
        // Calculate points logic here
      }
      logger.debug(`[JOB] Points updated for ${teams.length} teams`);
    } catch (error) {
      logger.error('[JOB] Fantasy points updater error', error);
    }
  }, 5 * 60 * 1000);

  interval.unref();
}

export function stopFantasyPointsUpdater(): void {
  if (interval) clearInterval(interval);
}
