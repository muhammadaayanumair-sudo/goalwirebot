import { Client, ActivityType } from 'discord.js';
import { logger } from '../utils/logger';
import { BOT_NAME, BOT_VERSION } from '../config/constants';
import { Colors } from '../config/colors';

export default {
  name: 'ready',
  once: true,
  async execute(client: Client): Promise<void> {
    logger.info(`╔══════════════════════════════════════════╗`);
    logger.info(`║   ${BOT_NAME} v${BOT_VERSION} is online!              ║`);
    logger.info(`╚══════════════════════════════════════════╝`);
    logger.info(`[READY] Logged in as ${client.user?.tag}`);
    logger.info(`[READY] Guilds: ${client.guilds.cache.size}`);
    logger.info(`[READY] Users: ${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0).toLocaleString()}`);

    const statusMessages = [
      `${BOT_NAME} v${BOT_VERSION} | /help`,
      `${client.guilds.cache.size} servers | /invite`,
      `⚽ Fantasy Football | /create`,
      `🔴 Live Scores | /live`,
      `🤖 AI Assistant | /ask`,
    ];

    let index = 0;
    setInterval(() => {
      client.user?.setPresence({
        activities: [{
          name: statusMessages[index],
          type: ActivityType.Custom,
        }],
        status: 'online',
      });
      index = (index + 1) % statusMessages.length;
    }, 30_000);

    logger.info('[READY] Status rotation started');
  },
};
