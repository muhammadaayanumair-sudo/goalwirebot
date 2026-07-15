import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import FantasyService from '../../services/fantasy/FantasyService';
import RankingService from '../../services/fantasy/RankingService';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';
import { paginate } from '../../utils/pagination';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View fantasy leaderboards')
    .addSubcommand(sub =>
      sub.setName('global')
        .setDescription('Global leaderboard across all users'),
    )
    .addSubcommand(sub =>
      sub.setName('league')
        .setDescription('Your league leaderboard')
        .addStringOption(opt =>
          opt.setName('code')
            .setDescription('League code (optional)')
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('gameweek')
        .setDescription('This gameweek\'s top performers'),
    )
    .addSubcommand(sub =>
      sub.setName('friends')
        .setDescription('Leaderboard for friends'),
    )
    .addSubcommand(sub =>
      sub.setName('history')
        .setDescription('Past gameweek winners'),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'global': return handleGlobal(interaction);
      case 'league': return handleLeague(interaction);
      case 'gameweek': return handleGameweek(interaction);
      case 'friends': return handleFriends(interaction);
      case 'history': return handleHistory(interaction);
    }
  },
};

async function handleGlobal(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const page = 0;
  const limit = 10;
  const result = await RankingService.getGlobalLeaderboard(page, limit);
  const userRank = await RankingService.getUserGlobalRank(interaction.user.id);

  if (result.entries.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Data', 'No leaderboard data available yet.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.TROPHY} Global Leaderboard`,
    `Top fantasy managers worldwide`,
  )
    .setColor(Colors.GOLD);

  const entries = result.entries.map((entry, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    const isYou = entry.userId === interaction.user.id;
    return `${medal} **${entry.username}** ${isYou ? '⬅️' : ''} — ${entry.points}pts | ${entry.teamName} | GW${entry.gameweek} rank: #${entry.gameweekRank}`;
  });

  embed.setDescription(entries.join('\n'));

  if (userRank) {
    embed.addFields({
      name: 'Your Rank',
      value: `#${userRank.rank} — ${userRank.points}pts | ${userRank.teamName}`,
      inline: false,
    });
  }

  embed.setFooter({
    text: `Page ${page + 1} of ${result.totalPages} | Total Managers: ${result.total}`,
  });

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('lb_global_prev')
        .setLabel('◀ Prev')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId('lb_global_next')
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= result.totalPages - 1),
      new ButtonBuilder()
        .setCustomId('lb_myrank')
        .setLabel('My Rank')
        .setEmoji(EMOJIS.CROWN)
        .setStyle(ButtonStyle.Primary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleLeague(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const code = interaction.options.getString('code');
  const league = code
    ? await FantasyService.getLeagueByCode(code)
    : await FantasyService.getUserLeague(interaction.user.id);

  if (!league) {
    await interaction.editReply({
      embeds: [createErrorEmbed(
        'No League',
        code ? 'League not found. Check the code and try again.' : 'You are not in any league. Create or join one with `/league`.',
      )],
    });
    return;
  }

  const standings = await RankingService.getLeagueStandings(league.id);
  const userEntry = standings.find(s => s.userId === interaction.user.id);

  const embed = createEmbed(
    `${EMOJIS.TROPHY} ${league.name}`,
    `${league.description || `Fantasy league • ${standings.length} participants`}`,
  )
    .setColor(Colors.PRIMARY);

  const top10 = standings.slice(0, 10);
  const entries = top10.map((entry, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    const isYou = entry.userId === interaction.user.id;
    return `${medal} **${entry.username}** ${isYou ? '⬅️' : ''} — ${entry.points}pts${entry.gameweekPoints ? ` (GW: ${entry.gameweekPoints})` : ''}`;
  });

  embed.setDescription(entries.join('\n'));

  if (userEntry && !top10.some(e => e.userId === interaction.user.id)) {
    embed.addFields({
      name: 'Your Position',
      value: `#${userEntry.rank} — ${userEntry.points}pts`,
      inline: false,
    });
  }

  embed.addFields(
    { name: 'Code', value: `\`${league.code}\``, inline: true },
    { name: 'Participants', value: `${standings.length}`, inline: true },
    { name: 'Your Rank', value: userEntry ? `#${userEntry.rank}` : 'Unranked', inline: true },
  );

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`league_view_${league.code}`)
        .setLabel('Full Standings')
        .setEmoji(EMOJIS.CHART)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`league_share_${league.code}`)
        .setLabel('Share')
        .setEmoji('📤')
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleGameweek(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const result = await RankingService.getGameweekTop(10);

  if (result.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Data', 'No gameweek data available yet.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.FIRE} Gameweek ${result[0].gameweek} Top Performers`,
    `Highest scoring managers this gameweek`,
  )
    .setColor(Colors.WARNING);

  const entries = result.map((entry, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    const isYou = entry.userId === interaction.user.id;
    return `${medal} **${entry.username}** ${isYou ? '⬅️' : ''} — ${entry.points}pts | C: ${entry.captain} ${entry.captainPoints}pts | Captain: ${entry.tripleCaptain ? '3x' : '2x'}`;
  });

  embed.setDescription(entries.join('\n'));

  await interaction.editReply({ embeds: [embed] });
}

async function handleFriends(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const friends = await RankingService.getFriendLeaderboard(interaction.user.id);

  if (!friends || friends.length === 0) {
    await interaction.editReply({
      embeds: [createErrorEmbed(
        'No Friends',
        'Add friends using their user ID with `/friend add`.',
      )],
    });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CROWN} Friends Leaderboard`,
    'How you rank against your friends.',
  )
    .setColor(Colors.PRIMARY);

  const entries = friends.map((f, i) =>
    `${i + 1}. **${f.username}** — ${f.points}pts ${f.isYou ? '⬅️ You' : ''}`,
  );

  embed.setDescription(entries.join('\n'));
  await interaction.editReply({ embeds: [embed] });
}

async function handleHistory(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const history = await RankingService.getGameweekWinners(10);

  if (history.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No History', 'No past winners data.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.TROPHY} Past Gameweek Winners`,
    'Who topped each gameweek.',
  )
    .setColor(Colors.GOLD);

  const entries = history.map(h =>
    `**GW${h.gameweek}:** ${h.username} — ${h.points}pts`,
  );

  embed.setDescription(entries.join('\n'));
  await interaction.editReply({ embeds: [embed] });
}

export default command;
