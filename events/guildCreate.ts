import { Guild, Client } from 'discord.js';
import { logger } from '../utils/logger';
import { BOT_NAME } from '../config/constants';

export default {
  name: 'guildCreate',
  async execute(guild: Guild, client: Client): Promise<void> {
    logger.info(`[GUILD] Joined ${guild.name} (${guild.id}) — ${guild.memberCount} members`);

    const owner = await guild.fetchOwner();
    const channel = guild.systemChannel || guild.channels.cache.find(c => c.type === 0);

    if (channel?.isTextBased()) {
      await channel.send({
        content: `👋 Hey **${guild.name}**! Thanks for adding **${BOT_NAME}**!\n\nUse \`/setup\` to configure the bot, or \`/help\` to see all commands.\n\n⚽ Let's play some fantasy football!`,
      });
    }

    logger.info(`[GUILD] Welcome message sent to ${guild.name}`);
  },
};
