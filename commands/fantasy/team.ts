import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import FantasyService from '../../services/fantasy/FantasyService';
import { Colors } from '../../config/colors';
import { EMOJIS, FANTASY_LIMITS, ECONOMY } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';
import { formatPrice, formatPosition } from '../../utils/formatter';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('team')
    .setDescription('View your fantasy team')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('View another user\'s team')
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const team = await FantasyService.getTeam(targetUser.id);

    if (!team) {
      await interaction.editReply({
        embeds: [createErrorEmbed(
          'No Team Found',
          `${targetUser.id === interaction.user.id ? 'You don\'t' : `${targetUser.username} doesn't`} have a fantasy team yet.\nUse \`/create\` to get started!`,
        )],
      });
      return;
    }

    const formation = FantasyService.getFormation(team.lineup);
    const totalValue = team.players.reduce((sum, p) => sum + p.currentPrice, 0);
    const pointsMeta = await FantasyService.getTeamPoints(targetUser.id);

    const embed = createEmbed(
      `${EMOJIS.TROPHY} ${team.name}`,
      `Managed by **${targetUser.username}**`,
    )
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'Formation', value: formation, inline: true },
        { name: 'Total Value', value: `${EMOJIS.MONEY} ${formatPrice(totalValue)}`, inline: true },
        { name: 'Budget', value: `${EMOJIS.MONEY} ${formatPrice(team.budget)}`, inline: true },
        { name: 'Overall Points', value: `${EMOJIS.STAR} ${pointsMeta.totalPoints}`, inline: true },
        { name: 'Gameweek Points', value: `${EMOJIS.FIRE} ${pointsMeta.gameweekPoints}`, inline: true },
        { name: 'Rank', value: `${EMOJIS.CROWN} #${pointsMeta.rank}`, inline: true },
      )
      .setColor(Colors.PRIMARY);

    if (team.captain) {
      embed.addFields({ name: `${EMOJIS.CAPTAIN} Captain`, value: `${team.captain.name} (${formatPosition(team.captain.position)})`, inline: true });
    }

    if (team.viceCaptain) {
      embed.addFields({ name: `${EMOJIS.VICE_CAPTAIN} Vice Captain`, value: `${team.viceCaptain.name} (${formatPosition(team.viceCaptain.position)})`, inline: true });
    }

    const squadList = team.players
      .filter(p => p.inStartingXI)
      .map((p, i) => `**${i + 1}.** ${p.name} — ${formatPosition(p.position)} — ${formatPrice(p.currentPrice)}`)
      .join('\n');

    const subsList = team.players
      .filter(p => !p.inStartingXI)
      .map((p, i) => `**${i + 1}.** ${p.name} — ${formatPosition(p.position)}`)
      .join('\n');

    if (squadList) embed.addFields({ name: `${EMOJIS.GOAL} Starting XI (${formation})`, value: squadList.slice(0, 1024) });
    if (subsList) embed.addFields({ name: `${EMOJIS.SUBSTITUTION} Substitutes`, value: subsList.slice(0, 1024) });

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`team_transfers_${targetUser.id}`)
          .setLabel('Transfers')
          .setEmoji(EMOJIS.TRANSFER)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`team_lineup_${targetUser.id}`)
          .setLabel('Lineup')
          .setEmoji('📋')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`team_captain_${targetUser.id}`)
          .setLabel('Captain')
          .setEmoji(EMOJIS.CAPTAIN)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`team_scout_${targetUser.id}`)
          .setLabel('AI Scout')
          .setEmoji(EMOJIS.SCOUT)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`team_leaderboard_${targetUser.id}`)
          .setLabel('Leaderboard')
          .setEmoji(EMOJIS.TROPHY)
          .setStyle(ButtonStyle.Secondary),
      );

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};

export default command;
