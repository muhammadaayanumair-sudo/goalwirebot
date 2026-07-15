import { ButtonInteraction } from 'discord.js';
import MatchService from '../../services/football/MatchService';
import { createErrorEmbed } from '../../utils/embeds';

export default {
  customId: ['match_stats_', 'match_lineups_', 'match_timeline_', 'match_refresh_', 'match_follow_', 'match_h2h_'],
  async execute(interaction: ButtonInteraction): Promise<void> {
    const parts = interaction.customId.split('_');
    const action = parts[1];
    const fixtureId = parts.slice(2).join('_');

    switch (action) {
      case 'stats':
        await interaction.reply({ content: `Loading stats for match ${fixtureId}...`, ephemeral: true });
        break;
      case 'lineups':
        await interaction.reply({ content: `Loading lineups for match ${fixtureId}...`, ephemeral: true });
        break;
      case 'timeline':
        await interaction.reply({ content: `Loading timeline for match ${fixtureId}...`, ephemeral: true });
        break;
      case 'refresh':
        await interaction.reply({ content: `Refreshing match data...`, ephemeral: true });
        break;
      case 'follow':
        await interaction.reply({ content: `Toggling follow for match ${fixtureId}...`, ephemeral: true });
        break;
      case 'h2h':
        await interaction.reply({ content: `Loading head-to-head data...`, ephemeral: true });
        break;
      default:
        await interaction.reply({ embeds: [createErrorEmbed('Unknown Action', 'This button action is not recognized.')], ephemeral: true });
    }
  },
};
