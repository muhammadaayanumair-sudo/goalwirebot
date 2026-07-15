import { Client } from 'discord.js';
import { startLiveUpdater, stopLiveUpdater } from './liveUpdater';
import { startFantasyPointsUpdater, stopFantasyPointsUpdater } from './fantasyPoints';
import { startFixturesUpdater, stopFixturesUpdater } from './fixturesUpdater';
import { startNewsUpdater, stopNewsUpdater } from './newsUpdater';
import { logger } from '../utils/logger';

export async function registerJobs(client: Client): Promise<void> {
  logger.info('[JOBS] Registering background workers...');

  await Promise.all([
    startLiveUpdater(client),
    startFantasyPointsUpdater(client),
    startFixturesUpdater(client),
    startNewsUpdater(client),
  ]);

  logger.info('[JOBS] All workers registered');
}

export function stopAllJobs(): void {
  stopLiveUpdater();
  stopFantasyPointsUpdater();
  stopFixturesUpdater();
  stopNewsUpdater();
  logger.info('[JOBS] All workers stopped');
}
