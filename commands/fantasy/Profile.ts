import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import FantasyService from '../../services/fantasy/FantasyService';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your fantasy football profile')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('View another user\'s profile')
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const profile = await FantasyService.getProfile(targetUser.id);

    if (!profile) {
      await interaction.editReply({
        embeds: [createErrorEmbed(
          'No Profile',
          `${targetUser.id === interaction.user.id ? 'You' : 'This user'} haven't played fantasy yet.\nUse \`/create\` to start!`,
        )],
      });
      return;
    }

    const totalPoints = profile.pointsHistory.reduce((a, b) => a + b, 0);
    const bestGW = Math.max(...profile.pointsHistory, 0);
    const avgPoints = profile.pointsHistory.length > 0
      ? (totalPoints / profile.pointsHistory.length).toFixed(1)
      : '0.0';

    const embed = createEmbed(
      `${EMOJIS.STAR} ${targetUser.username}'s Fantasy Profile`,
      `Fantasy football career stats.`,
    )
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'Team', value: profile.teamName || 'No team', inline: true },
        { name: 'Total Points', value: `${EMOJIS.STAR} ${totalPoints}`, inline: true },
        { name: 'Global Rank', value: `${EMOJIS.CROWN} #${profile.globalRank || 'N/A'}`, inline: true },
        { name: 'Best GW', value: `${EMOJIS.TROPHY} ${bestGW}pts`, inline: true },
        { name: 'Avg Points/GW', value: `${EMOJIS.CHART} ${avgPoints}`, inline: true },
        { name: 'Gameweeks Played', value: `${EMOJIS.CALENDAR} ${profile.pointsHistory.length}`, inline: true },
        { name: 'Leagues', value: `${EMOJIS.TROPHY} ${profile.leagueCount}`, inline: true },
        { name: 'Total Transfers', value: `${EMOJIS.TRANSFER} ${profile.totalTransfers}`, inline: true },
        { name: 'Wildcards Used', value: `${EMOJIS.FIRE} ${profile.wildcardsUsed}/${profile.wildcardLimit}`, inline: true },
      )
      .setColor(Colors.PRIMARY);

    if (profile.badges && profile.badges.length > 0) {
      embed.addFields({
        name: `${EMOJIS.CROWN} Badges`,
        value: profile.badges.map(b => `**${b.name}** — ${b.description}`).join('\n'),
        inline: false,
      });
    }

    if (profile.partnerBadge) {
      embed.addFields({ name: `${EMOJIS.AI} Partner`, value: '✅ Early Access Member', inline: true });
    }

    embed.addFields({
      name: '\u200B',
      value: profile.bio || `Hey, I'm playing GoalX Fantasy Football! Join me at https://goalx.gg`,
    });

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`team_${targetUser.id}`)
          .setLabel('View Team')
          .setEmoji(EMOJIS.TROPHY)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`profile_history_${targetUser.id}`)
          .setLabel('History')
          .setEmoji(EMOJIS.CHART)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`profile_share_${targetUser.id}`)
          .setLabel('Share')
          .setEmoji('📤')
          .setStyle(ButtonStyle.Secondary),
      );

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};

export default command;
