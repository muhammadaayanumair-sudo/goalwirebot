import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import FantasyService from '../../services/fantasy/FantasyService';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('accept')
    .setDescription('Accept a pending challenge')
    .addStringOption(opt =>
      opt.setName('challenge_id')
        .setDescription('Challenge ID (view with /challenge pending)')
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const challengeId = interaction.options.getString('challenge_id');
    const result = await FantasyService.acceptChallenge(interaction.user.id, challengeId || undefined);

    if (!result.success) {
      await interaction.editReply({
        embeds: [createErrorEmbed('Cannot Accept', result.error || 'No pending challenge found.')],
      });
      return;
    }

    const embed = createEmbed(
      `${EMOJIS.SUCCESS} Challenge Accepted!`,
      `**${result.challenger}** vs **${result.acceptor}** — GW${result.gameweek}`,
    )
      .addFields(
        { name: 'Gameweek', value: `GW${result.gameweek}`, inline: true },
        { name: 'Challenger', value: result.challenger, inline: true },
        { name: 'Acceptor', value: result.acceptor, inline: true },
        { name: 'Status', value: '🔴 Live — Waiting for gameweek', inline: true },
        { name: 'Kickoff', value: `<t:${result.kickoffTimestamp}:R>`, inline: true },
      )
      .setColor(Colors.SUCCESS);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`matchup_${result.matchupId}`)
          .setLabel('View Matchup')
          .setEmoji(EMOJIS.CROWN)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`analyze_${result.matchupId}`)
          .setLabel('Analyze')
          .setEmoji(EMOJIS.AI)
          .setStyle(ButtonStyle.Secondary),
      );

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};

export default command;
