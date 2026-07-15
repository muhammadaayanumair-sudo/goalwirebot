import { StringSelectMenuInteraction } from 'discord.js';
import { createErrorEmbed } from '../../utils/embeds';

export default {
  customId: ['league_select', 'standings_league_select', 'fixtures_league_select'],
  async execute(interaction: StringSelectMenuInteraction): Promise<void> {
    const value = interaction.values[0];
    await interaction.reply({ content: `Loading league data for ID: ${value}...`, ephemeral: true });
  },
};
