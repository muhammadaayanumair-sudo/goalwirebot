import { ButtonInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import FantasyService from '../../services/fantasy/FantasyService';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';

export default {
  customId: ['team_', 'lineup_', 'captain_', 'scout_', 'leaderboard_', 'transfers_'],
  async execute(interaction: ButtonInteraction): Promise<void> {
    const [action, userId] = interaction.customId.split('_').slice(1);

    if (action === 'transfers') {
      await interaction.reply({ content: `Opening transfers...`, ephemeral: true });
    } else if (action === 'lineup') {
      await interaction.reply({ content: `Opening lineup manager...`, ephemeral: true });
    } else if (action === 'captain') {
      await interaction.reply({ content: `Opening captain selector...`, ephemeral: true });
    } else if (action === 'scout') {
      await interaction.reply({ content: `Opening AI Scout...`, ephemeral: true });
    } else if (action === 'leaderboard') {
      await interaction.reply({ content: `Opening leaderboard...`, ephemeral: true });
    } else if (!action && userId) {
      await interaction.reply({ content: `Viewing team...`, ephemeral: true });
    }
  },
};
