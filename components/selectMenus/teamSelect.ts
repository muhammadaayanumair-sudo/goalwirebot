import { StringSelectMenuInteraction } from 'discord.js';
import TeamService from '../../services/football/TeamService';
import { createErrorEmbed } from '../../utils/embeds';

export default {
  customId: ['team_select', 'standings_team_select', 'compare_team_select'],
  async execute(interaction: StringSelectMenuInteraction): Promise<void> {
    const value = interaction.values[0];
    await interaction.reply({ content: `Loading team data for ID: ${value}...`, ephemeral: true });
  },
};
