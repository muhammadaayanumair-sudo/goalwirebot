import { Interaction, Client } from 'discord.js';
import { logger } from '../utils/logger';

export default {
  name: 'interactionCreate',
  async execute(interaction: Interaction, client: Client): Promise<void> {
    try {
      if (interaction.isChatInputCommand()) {
        await client.commandHandler.handleCommand(interaction);
      } else if (interaction.isButton()) {
        await client.componentHandler.handleButton(interaction);
      } else if (interaction.isAnySelectMenu()) {
        await client.componentHandler.handleSelectMenu(interaction);
      } else if (interaction.isModalSubmit()) {
        await client.componentHandler.handleModal(interaction);
      } else if (interaction.isAutocomplete()) {
        await client.commandHandler.handleAutocomplete(interaction);
      }
    } catch (error) {
      logger.error('[INTERACTION] Unhandled error', error);
      if (interaction.isRepliable()) {
        const reply = { content: 'An unexpected error occurred.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
    }
  },
};
