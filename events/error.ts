import { Client } from 'discord.js';
import { logger } from '../utils/logger';

export default {
  name: 'error',
  async execute(error: Error, client: Client): Promise<void> {
    logger.error('[CLIENT] Discord client error', error);
  },
};
