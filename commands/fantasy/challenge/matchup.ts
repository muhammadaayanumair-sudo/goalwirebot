import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import FantasyService from '../../services/fantasy/FantasyService';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('matchup')
    .setDescription('View a challenge matchup in detail')
    .addStringOption(opt =>
      opt.setName('matchup_id')
        .setDescription('Matchup ID to view')
        .setRequired(false),
    )
    .addUserOption(opt =>
      opt.setName('opponent')
        .setDescription('View matchup with a specific user')
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const matchupId = interaction.options.getString('matchup_id');
    const opponent = interaction.options.getUser('opponent');

    let matchup;

    if (matchupId) {
      matchup = await FantasyService.getMatchupById(matchupId);
    } else if (opponent) {
      matchup = await FantasyService.getMatchupWithUser(interaction.user.id, opponent.id);
    } else {
      matchup = await FantasyService.getCurrentMatchup(interaction.user.id);
    }

    if (!matchup) {
      await interaction.editReply({
        embeds: [createErrorEmbed(
          'No Matchup Found',
          matchupId ? 'Invalid matchup ID.' : opponent ? `No matchup with ${opponent.username}.` : 'You have no active matchup. Use `/challenge send` to start one!',
        )],
      });
      return;
    }

    const isUserChallenger = matchup.challengerId === interaction.user.id;
    const userData = isUserChallenger ? matchup.challengerData : matchup.opponentData;
    const oppData = isUserChallenger ? matchup.opponentData : matchup.challengerData;

    const embed = createEmbed(
      `${EMOJIS.CROWN} Matchup: GW${matchup.gameweek}`,
      `**${matchup.challenger}** vs **${matchup.opponent}**`,
    )
      .setColor(matchup.live ? Colors.WARNING : Colors.PRIMARY);

    if (matchup.live) {
      embed.addFields(
        { name: `${matchup.challenger} Score`, value: `**${matchup.challengerScore}** pts`, inline: true },
        { name: `${matchup.opponent} Score`, value: `**${matchup.opponentScore}** pts`, inline: true },
        { name: 'Status', value: '🔴 Live', inline: true },
      );
    } else if (matchup.completed) {
      const winner = matchup.challengerScore > matchup.opponentScore ? matchup.challenger : matchup.opponent;
      const isDraw = matchup.challengerScore === matchup.opponentScore;
      embed.addFields(
        { name: 'Final Score', value: `${matchup.challengerScore} — ${matchup.opponentScore}`, inline: false },
        { name: 'Result', value: isDraw ? '➖ Draw' : `✅ ${winner} wins!`, inline: false },
      );
    } else {
      embed.addFields(
        { name: 'Status', value: '⏳ Scheduled', inline: true },
        { name: 'Kickoff', value: `<t:${matchup.kickoffTimestamp}:R>`, inline: true },
      );
    }

    if (userData?.lineup) {
      embed.addFields({
        name: `📋 ${isUserChallenger ? matchup.challenger : matchup.opponent}'s XI`,
        value: userData.lineup.slice(0, 1024),
        inline: false,
      });
    }

    if (oppData?.lineup) {
      embed.addFields({
        name: `📋 ${isUserChallenger ? matchup.opponent : matchup.challenger}'s XI`,
        value: oppData.lineup.slice(0, 1024),
        inline: false,
      });
    }

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`analyze_${matchup.id}`)
          .setLabel('AI Analyze')
          .setEmoji(EMOJIS.AI)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`matchup_refresh_${matchup.id}`)
          .setLabel('Refresh')
          .setEmoji('🔄')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`matchup_share_${matchup.id}`)
          .setLabel('Share')
          .setEmoji('📤')
          .setStyle(ButtonStyle.Secondary),
      );

    if (matchup.live) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`matchup_follow_${matchup.id}`)
          .setLabel('Follow')
          .setEmoji('🔔')
          .setStyle(ButtonStyle.Success),
      );
    }

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};

export default command;
