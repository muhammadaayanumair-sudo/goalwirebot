import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import FantasyService from '../../services/fantasy/FantasyService';
import PointsService from '../../services/fantasy/PointsService';
import { Colors } from '../../config/colors';
import { EMOJIS, POINTS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('points')
    .setDescription('View points breakdown')
    .addSubcommand(sub =>
      sub.setName('team')
        .setDescription('View your team\'s total points')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('View another user\'s points')
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('gameweek')
        .setDescription('View points for a specific gameweek')
        .addIntegerOption(opt =>
          opt.setName('week')
            .setDescription('Gameweek number')
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('breakdown')
        .setDescription('Detailed points breakdown per player')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('User to check')
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('history')
        .setDescription('View your points history across all gameweeks'),
    )
    .addSubcommand(sub =>
      sub.setName('scoring')
        .setDescription('View the full points scoring system'),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'team': return handleTeam(interaction);
      case 'gameweek': return handleGameweek(interaction);
      case 'breakdown': return handleBreakdown(interaction);
      case 'history': return handleHistory(interaction);
      case 'scoring': return handleScoring(interaction);
    }
  },
};

async function handleTeam(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const targetUser = interaction.options.getUser('user') || interaction.user;
  const points = await PointsService.getTotalPoints(targetUser.id);

  if (points === null) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Team', `${targetUser.username} doesn't have a team.`)] });
    return;
  }

  const stats = await PointsService.getSeasonStats(targetUser.id);
  const rank = await PointsService.getRank(targetUser.id);

  const embed = createEmbed(
    `${EMOJIS.STAR} ${targetUser.username}'s Points`,
    `Season overview for **${targetUser.username}**`,
  )
    .setThumbnail(targetUser.displayAvatarURL())
    .addFields(
      { name: 'Total Points', value: `${EMOJIS.STAR} ${points.total}`, inline: true },
      { name: 'Gameweek Points', value: `${EMOJIS.FIRE} ${points.gameweek}`, inline: true },
      { name: 'Overall Rank', value: `${EMOJIS.CROWN} #${rank}`, inline: true },
      { name: 'Average Points', value: `${EMOJIS.CHART} ${stats.average.toFixed(1)}/GW`, inline: true },
      { name: 'Highest GW', value: `${EMOJIS.TROPHY} ${stats.highestGW} (GW${stats.highestWeek})`, inline: true },
      { name: 'Total Transfers', value: `${EMOJIS.TRANSFER} ${stats.transfers}`, inline: true },
    )
    .setColor(Colors.PRIMARY);

  await interaction.editReply({ embeds: [embed] });
}

async function handleGameweek(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const gw = interaction.options.getInteger('week') || await PointsService.getCurrentGameweek();
  const points = await PointsService.getGameweekPoints(interaction.user.id, gw);

  if (!points) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Data', `No points data for GW${gw}.`)] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.STAR} Gameweek ${gw} Points`,
    `Points breakdown for GW${gw}`,
  )
    .addFields(
      { name: 'Total', value: `${points.total} pts`, inline: true },
      { name: 'Captain', value: `${points.captain} pts${points.tripleCaptain ? ' (3x)' : ' (2x)'}`, inline: true },
      { name: 'Bench', value: `${points.bench} pts`, inline: true },
      { name: 'Transfers Hit', value: `-${points.hits} pts`, inline: true },
      { name: 'Overall Rank', value: `#${points.rank}`, inline: true },
      { name: 'Mini-League Rank', value: `#${points.leagueRank}`, inline: true },
    )
    .setColor(Colors.INFO);

  if (points.playerPoints.length > 0) {
    const breakdown = points.playerPoints
      .sort((a, b) => b.points - a.points)
      .slice(0, 15)
      .map(p => `${p.name}: ${p.points}pts${p.isCaptain ? ' 👑' : ''}${p.isViceCaptain ? ' 💎' : ''}`)
      .join('\n');
    embed.addFields({ name: 'Player Breakdown', value: breakdown.slice(0, 1024), inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleBreakdown(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const targetUser = interaction.options.getUser('user') || interaction.user;
  const breakdown = await PointsService.getDetailedBreakdown(targetUser.id);

  if (!breakdown || breakdown.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Data', 'No points breakdown available.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CHART} Detailed Points Breakdown`,
    `Points per player in your starting XI.`,
  )
    .setColor(Colors.PRIMARY);

  for (const entry of breakdown) {
    const badges = [];
    if (entry.isCaptain) badges.push(`${EMOJIS.CAPTAIN}C`);
    if (entry.isViceCaptain) badges.push(`${EMOJIS.VICE_CAPTAIN}VC`);
    if (entry.cleanSheet) badges.push('🧤');
    if (entry.goalScored) badges.push(`${EMOJIS.GOAL}`);
    if (entry.assist) badges.push(`${EMOJIS.ASSIST}`);
    if (entry.yellowCard) badges.push(`${EMOJIS.YELLOW_CARD}`);
    if (entry.redCard) badges.push(`${EMOJIS.RED_CARD}`);

    embed.addFields({
      name: `${entry.name} ${badges.join(' ')}`,
      value: [
        `**Total:** ${entry.total}pts`,
        `Appearance: ${entry.appearance} | Goals: ${entry.goals} | Assists: ${entry.assists}`,
        entry.cleanSheet ? 'Clean Sheet: ✅' : null,
        entry.bonus > 0 ? `Bonus: +${entry.bonus}` : null,
        entry.yellowCard ? 'Yellow Card: 🟨' : null,
        entry.redCard ? 'Red Card: 🟥' : null,
      ].filter(Boolean).join('\n'),
      inline: true,
    });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleHistory(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const history = await PointsService.getPointsHistory(interaction.user.id);

  if (!history || history.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No History', 'No points history available.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CHART} Points History`,
    'Your points across all gameweeks.',
  )
    .setColor(Colors.PRIMARY);

  const lines = history.map(gw =>
    `**GW${gw.week}:** ${gw.points}pts ${gw.captain > 0 ? `(C: ${gw.captain})` : ''} ${gw.rank ? `#${gw.rank}` : ''}`,
  );

  const total = history.reduce((sum, gw) => sum + gw.points, 0);
  const avg = (total / history.length).toFixed(1);

  embed.setDescription(lines.join('\n').slice(0, 4000));
  embed.addFields(
    { name: 'Total', value: `${total}pts`, inline: true },
    { name: 'Average', value: `${avg}/GW`, inline: true },
    { name: 'Gameweeks', value: `${history.length}`, inline: true },
  );

  await interaction.editReply({ embeds: [embed] });
}

async function handleScoring(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const embed = createEmbed(
    `${EMOJIS.STAR} Points Scoring System`,
    'How your fantasy players earn points.',
  )
    .addFields(
      { name: '⚽ Action', value: 'Goals, Assists & More', inline: false },
      { name: 'Goal (GK/DEF)', value: `+${POINTS.GOAL * 2}pts`, inline: true },
      { name: 'Goal (MID)', value: `+${POINTS.GOAL}pts`, inline: true },
      { name: 'Goal (FWD)', value: `+${POINTS.GOAL}pts`, inline: true },
      { name: 'Assist', value: `+${POINTS.ASSIST}pts`, inline: true },
      { name: 'Clean Sheet (GK/DEF)', value: `+${POINTS.CLEAN_SHEET}pts`, inline: true },
      { name: 'Clean Sheet (MID)', value: `+${POINTS.CLEAN_SHEET / 2}pts`, inline: true },
      { name: 'Save (3 saves)', value: `+${POINTS.SAVE}pt`, inline: true },
      { name: 'Penalty Save', value: `+${POINTS.PENALTY_SAVE}pts`, inline: true },
      { name: 'Penalty Miss', value: `${POINTS.PENALTY_MISS}pts`, inline: true },
      { name: 'Yellow Card', value: `${POINTS.YELLOW_CARD}pt`, inline: true },
      { name: 'Red Card', value: `${POINTS.RED_CARD}pts`, inline: true },
      { name: 'Own Goal', value: `${POINTS.OWN_GOAL}pts`, inline: true },
      { name: 'Appearance (60+ min)', value: `+${POINTS.APPEARANCE}pts`, inline: true },
      { name: 'Bonus Points', value: `+${POINTS.BONUS}pts`, inline: true },
      { name: 'Captain', value: `${POINTS.CAPTAIN_MULTIPLIER}x points`, inline: true },
      { name: 'Vice Captain', value: `${POINTS.VICE_CAPTAIN_MULTIPLIER}x points`, inline: true },
    )
    .setColor(Colors.INFO);

  await interaction.editReply({ embeds: [embed] });
}

export default command;
