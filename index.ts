import { config } from 'dotenv';
config();

import { GoalXClient } from './client/GoalXClient';
import { connectDatabase } from './database/mongo';
import { logger } from './utils/logger';
import { registerJobs } from './jobs';
import { ScheduleService } from './services/schedule/ScheduleService';

const BOT_NAME = 'GoalX';
const BOT_VERSION = '2.0.0';

let client: GoalXClient;

async function bootstrap(): Promise<void> {
  const startTime = Date.now();

  try {
    logger.info('╔══════════════════════════════════════════╗');
    logger.info(`║        ${BOT_NAME} v${BOT_VERSION} — Initializing...      ║`);
    logger.info('╚══════════════════════════════════════════╝');

    await connectDatabase();
    logger.info(`[${BOT_NAME}][DB] MongoDB connected successfully`);

    client = new GoalXClient();

    client.once('ready', async () => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`[${BOT_NAME}][BOOT] Online in ${elapsed}s`);

      const guildCount = client.guilds.cache.size;
      const userCount = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
      logger.info(`[${BOT_NAME}][STATS] Serving ${guildCount} guilds | ${userCount.toLocaleString()} users`);

      await ScheduleService.getInstance().initialize(client);
      logger.info(`[${BOT_NAME}][SCHEDULER] Auto-messages & cron jobs registered`);

      await registerJobs(client);
      logger.info(`[${BOT_NAME}][JOBS] Background workers started`);

      startHeartbeat();
    });

    client.on('shardError', (error: Error) => {
      logger.error(`[${BOT_NAME}][SHARD] Shard disconnected`, error);
    });

    client.on('rateLimit', (info) => {
      logger.warn(`[${BOT_NAME}][RATELIMIT]`, `${info.timeout}ms — ${info.method} ${info.route}`);
    });

    await client.login();

    setupProcessHandlers();
  } catch (error) {
    logger.error(`[${BOT_NAME}][FATAL] Boot failed`, error);
    await gracefulShutdown(1);
  }
}

function setupProcessHandlers(): void {
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    logger.error(`[${BOT_NAME}][PROCESS] Unhandled Rejection at:`, promise);
    logger.error(`[${BOT_NAME}][PROCESS] Reason:`, reason);
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error(`[${BOT_NAME}][PROCESS] Uncaught Exception`, error);
    gracefulShutdown(1);
  });

  process.on('SIGINT', () => {
    logger.info(`[${BOT_NAME}][PROCESS] Received SIGINT — shutting down`);
    gracefulShutdown(0);
  });

  process.on('SIGTERM', () => {
    logger.info(`[${BOT_NAME}][PROCESS] Received SIGTERM — shutting down`);
    gracefulShutdown(0);
  });

  process.on('warning', (warning: Error) => {
    logger.warn(`[${BOT_NAME}][PROCESS] Warning`, warning.message);
  });
}

function startHeartbeat(): void {
  setInterval(() => {
    if (!client || !client.isReady()) {
      logger.warn(`[${BOT_NAME}][HEARTBEAT] Client not ready — attempting reconnect`);
      return;
    }

    const guildCount = client.guilds.cache.size;
    const userCount = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;

    logger.info(
      `[${BOT_NAME}][HEARTBEAT] ` +
      `Guilds: ${guildCount} | ` +
      `Users: ${userCount.toLocaleString()} | ` +
      `Uptime: ${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s | ` +
      `Memory: ${memoryUsage.toFixed(1)}MB`,
    );
  }, 5 * 60 * 1000);
}

let shuttingDown = false;

async function gracefulShutdown(exitCode: number): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`[${BOT_NAME}][SHUTDOWN] Starting graceful shutdown...`);

  try {
    if (client) {
      await ScheduleService.getInstance().destroy();
      logger.info(`[${BOT_NAME}][SHUTDOWN] Scheduler stopped`);

      client.removeAllListeners();
      client.destroy();
      logger.info(`[${BOT_NAME}][SHUTDOWN] Discord client destroyed`);
    }
  } catch (error) {
    logger.error(`[${BOT_NAME}][SHUTDOWN] Error during cleanup`, error);
  }

  logger.info(`[${BOT_NAME}][SHUTDOWN] Goodbye. ⚽`);
  process.exit(exitCode);
}

bootstrap();
