import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import LiveService from '../../services/football/LiveService';
import { Colors } from '../../config/colors';
import { EMOJIS, COOLDOWNS } from '../../config/constants';
import { createEmbed, createErrorEmbed, createLoadingEmbed } from '../../utils/embeds';
import { paginate } from '../../utils/pagination';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('live')
    .setDescription('View live football matches and scores')
    .addSubcommand(sub =>
      sub.setName('now')
        .setDescription('Matches currently live'),
    )
    .addSubcommand(sub =>
      sub.setName('today')
        .setDescription('Today\'s match schedule'),
    )
    .addSubcommand(sub =>
      sub.setName('league')
        .setDescription('Live matches in a specific league')
        .addIntegerOption(opt =>
          opt.setName('league_id')
            .setDescription('League ID (default: 39 Premier League)')
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('followed')
        .setDescription('Live scores for your followed matches'),
    )
    .addSubcommand(sub =>
      sub.setName('events')
        .setDescription('View live events for a match')
        .addStringOption(opt =>
          opt.setName('fixture_id')
            .setDescription('Fixture ID')
            .setRequired(true),
        ),
    ),

  cooldown: COOLDOWNS.MATCH_REFRESH,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'now': return handleNow(interaction);
      case 'today': return handleToday(interaction);
      case 'league': return handleLeague(interaction);
      case 'followed': return handleFollowed(interaction);
      case 'events': return handleEvents(interaction);
    }
  },
};

async function handleNow(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const matches = await LiveService.getLiveMatches();

  if (!matches || matches.length === 0) {
    await interaction.editReply({
      embeds: [createErrorEmbed('No Live Matches', 'There are no matches currently live. Check back later or use `/fixtures` to see upcoming matches.')],
    });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.LIVE} LIVE — ${matches.length} Match${matches.length > 1 ? 'es' : ''}`,
    'Matches currently in progress.',
  ).setColor(Colors.ERROR);

  const entries = matches.slice(0, 20).map(m =>
    `**${m.league}**\n${m.homeTeam} ${m.homeScore} — ${m.awayScore} ${m.awayTeam}\n⏱ ${m.elapsed}' | ${m.status}\n${m.homeBadge ? m.homeBadge : ''} ${m.awayBadge ? m.awayBadge : ''}`,
  );

  embed.setDescription(entries.join('\n\n'));

  embed.setFooter({ text: '🔴 Scores update every 30s | Click a match for details' });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('live_select')
    .setPlaceholder('Select a match for details')
    .addOptions(
      matches.slice(0, 25).map(m => new StringSelectMenuOptionBuilder()
        .setLabel(`${m.homeTeam} vs ${m.awayTeam} (${m.homeScore}-${m.awayScore})`)
        .setValue(m.fixtureId.toString())
        .setDescription(`${m.league} — ${m.elapsed}'`),
      ),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  const buttonRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('live_refresh')
        .setLabel('Refresh')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('live_followed')
        .setLabel('My Followed')
        .setEmoji('🔔')
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row, buttonRow] });
}

async function handleToday(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const matches = await LiveService.getTodayMatches();

  if (!matches || matches.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Matches', 'No matches scheduled for today.')] });
    return;
  }

  const liveCount = matches.filter(m => m.status === 'LIVE').length;
  const finishedCount = matches.filter(m => m.status === 'FT').length;
  const upcomingCount = matches.filter(m => m.status === 'NS' || m.status === 'TBD').length;

  const embed = createEmbed(
    `${EMOJIS.CALENDAR} Today's Matches`,
    `${matches.length} matches — 🟢 ${liveCount} Live | ✅ ${finishedCount} FT | ⏳ ${upcomingCount} Upcoming`,
  ).setColor(Colors.PRIMARY);

  const byLeague: Record<string, string[]> = {};
  for (const m of matches) {
    if (!byLeague[m.league]) byLeague[m.league] = [];
    const status = m.status === 'LIVE' ? '🔴' : m.status === 'FT' ? '✅' : '⏳';
    const score = m.status === 'LIVE' || m.status === 'FT' ? ` ${m.homeScore}—${m.awayScore}` : '';
    byLeague[m.league].push(`${status} ${m.homeTeam}${score} ${m.awayTeam} ${m.status === 'LIVE' ? `(${m.elapsed}')` : ''}`);
  }

  for (const [league, matchesList] of Object.entries(byLeague)) {
    embed.addFields({ name: `📋 ${league}`, value: matchesList.slice(0, 10).join('\n'), inline: false });
  }

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('live_today_refresh')
        .setLabel('Refresh')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleLeague(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const leagueId = interaction.options.getInteger('league_id') || 39;
  const matches = await LiveService.getLiveMatchesByLeague(leagueId);

  if (!matches || matches.length === 0) {
    await interaction.editReply({
      embeds: [createErrorEmbed('No Live Matches', 'No live matches in this league right now.')],
    });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.LIVE} ${matches[0].league}`,
    `Live matches — ${matches.length} in progress`,
  ).setColor(Colors.ERROR);

  const entries = matches.map(m =>
    `**${m.homeTeam} ${m.homeScore} — ${m.awayScore} ${m.awayTeam}**\n⏱ ${m.elapsed}' | ${m.status}`,
  );

  embed.setDescription(entries.join('\n\n'));

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`live_refresh_${leagueId}`)
        .setLabel('Refresh')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleFollowed(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const matches = await LiveService.getFollowedMatches(interaction.user.id);

  if (!matches || matches.length === 0) {
    await interaction.editReply({
      embeds: [createErrorEmbed('No Followed Matches', 'You haven\'t followed any matches. Use `/match` and click the Follow button on a match.')],
    });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.LIVE} Your Followed Matches`,
    'Live scores for matches you\'re following.',
  ).setColor(Colors.PRIMARY);

  const entries = matches.map(m => {
    const statusEmoji = m.status === 'LIVE' ? '🔴' : m.status === 'FT' ? '✅' : '⏳';
    return `${statusEmoji} **${m.homeTeam} ${m.homeScore || 0}—${m.awayScore || 0} ${m.awayTeam}**\n${m.league} | ${m.status === 'LIVE' ? `${m.elapsed}'` : m.status}`;
  });

  embed.setDescription(entries.join('\n\n'));

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('live_followed_refresh')
        .setLabel('Refresh')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleEvents(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const fixtureId = interaction.options.getString('fixture_id', true);
  const match = await LiveService.getMatchDetail(Number(fixtureId));

  if (!match) {
    await interaction.editReply({ embeds: [createErrorEmbed('Match Not Found', 'Invalid fixture ID.')] });
    return;
  }

  const embed = createEmbed(
    `${match.status === 'LIVE' ? `${EMOJIS.LIVE} LIVE` : '⚽'} ${match.homeTeam} vs ${match.awayTeam}`,
    `${match.league} | ${match.venue || 'Venue TBD'} | ${match.referee || 'Referee TBD'}`,
  );

  if (match.status === 'LIVE' || match.status === 'FT') {
    embed.addFields(
      { name: 'Score', value: `**${match.homeScore} — ${match.awayScore}**`, inline: true },
      { name: 'Status', value: match.status === 'LIVE' ? `${match.elapsed}'` : match.status, inline: true },
    );
  }

  if (match.events && match.events.length > 0) {
    const eventEntries = match.events.slice(-20).reverse().map(e => {
      const emoji = e.type === 'Goal' ? (e.detail === 'Own Goal' ? EMOJIS.OWN_GOAL : EMOJIS.GOAL) :
                    e.type === 'Card' ? (e.detail === 'Red Card' ? EMOJIS.RED_CARD : EMOJIS.YELLOW_CARD) :
                    e.type === 'subst' ? EMOJIS.SUBSTITUTION :
                    e.type === 'Var' ? '📺' : '⚪';
      return `${emoji} ${e.elapsed}'${e.extraMin ? `+${e.extraMin}` : ''} — ${e.team} ${e.player}${e.assist ? ` (${e.assist})` : ''}`;
    });

    embed.addFields({ name: '📋 Timeline', value: eventEntries.join('\n').slice(0, 1024), inline: false });
  } else {
    embed.addFields({ name: '📋 Timeline', value: 'No events yet.', inline: false });
  }

  if (match.stats) {
    embed.addFields({
      name: '📊 Key Stats',
      value: [
        `Possession: ${match.stats.homePossession || 0}% — ${match.stats.awayPossession || 0}%`,
        `Shots: ${match.stats.homeShots || 0} — ${match.stats.awayShots || 0}`,
        `Shots on Target: ${match.stats.homeShotsOnTarget || 0} — ${match.stats.awayShotsOnTarget || 0}`,
      ].join('\n'),
      inline: false,
    });
  }

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`match_stats_${fixtureId}`)
        .setLabel('Stats')
        .setEmoji(EMOJIS.CHART)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`match_lineups_${fixtureId}`)
        .setLabel('Lineups')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`match_timeline_${fixtureId}`)
        .setLabel('Timeline')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`match_refresh_${fixtureId}`)
        .setLabel('Refresh')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`match_follow_${fixtureId}`)
        .setLabel(match.isFollowed ? 'Unfollow' : 'Follow')
        .setEmoji('🔔')
        .setStyle(match.isFollowed ? ButtonStyle.Danger : ButtonStyle.Success),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

export default command;
