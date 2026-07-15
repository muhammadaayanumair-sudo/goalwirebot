import { StringSelectMenuInteraction } from 'discord.js';
import { createErrorEmbed } from '../../utils/embeds';

export default {
  customId: ['player_select', 'team_squad_select', 'scout_player'],
  async execute(interaction: StringSelectMenuInteraction): Promise<void> {
    const value = interaction.values[0];
    await interaction.reply({ content: `Loading player data for ID: ${value}...`, ephemeral: true });
  },
};
