import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import MatchService from '../../services/football/MatchService';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed, createLoadingEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('match')
    .setDescription('View detailed match information')
    .addStringOption(opt =>
      opt.setName('fixture_id')
        .setDescription('Fixture ID to view')
        .setRequired(false),
    )
    .addStringOption(opt =>
      opt.setName('team')
        .setDescription('Search by team name')
        .setRequired(false)
        .setAutocomplete(true),
    )
    .addSubcommand(sub =>
      sub.setName('details')
        .setDescription('Full match details')
        .addStringOption(opt =>
          opt.setName('fixture_id')
            .setDescription('Fixture ID')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('compare')
        .setDescription('Compare two matches side by side')
        .addStringOption(opt =>
          opt.setName('fixture_1')
            .setDescription('First fixture ID')
            .setRequired(true),
        )
        .addStringOption(opt =>
          opt.setName('fixture_2')
            .setDescription('Second fixture ID')
            .setRequired(true),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'details') return handleDetails(interaction);
    if (subcommand === 'compare') return handleCompare(interaction);
    return handleSearch(interaction);
  },

  async autocomplete(interaction): Promise<void> {
    const focused = interaction.options.getFocused(true);
    const teams = await MatchService.searchTeams(focused.value as string);
    await interaction.respond(
      teams.slice(0, 25).map(t => ({
        name: `${t.name} (${t.country || 'Unknown'})`,
        value: t.id.toString(),
      })),
    );
  },
};

async function handleSearch(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const fixtureId = interaction.options.getString('fixture_id');
  const teamQuery = interaction.options.getString('team');

  let match;

  if (fixtureId) {
    match = await MatchService.getMatchById(Number(fixtureId));
  } else if (teamQuery) {
    const matches = await MatchService.getMatchesByTeam(teamQuery);
    if (matches && matches.length > 0) {
      match = matches[0];
    }
  }

  if (!match) {
    await interaction.editReply({
      embeds: [createErrorEmbed('Match Not Found', 'Provide a valid fixture ID or team name.')],
    });
    return;
  }

  await renderMatch(interaction, match);
}

async function handleDetails(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const fixtureId = interaction.options.getString('fixture_id', true);
  const match = await MatchService.getMatchById(Number(fixtureId));

  if (!match) {
    await interaction.editReply({ embeds: [createErrorEmbed('Not Found', 'Invalid fixture ID.')] });
    return;
  }

  await renderMatch(interaction, match);
}

async function handleCompare(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const id1 = Number(interaction.options.getString('fixture_1', true));
  const id2 = Number(interaction.options.getString('fixture_2', true));

  const [match1, match2] = await Promise.all([
    MatchService.getMatchById(id1),
    MatchService.getMatchById(id2),
  ]);

  if (!match1 || !match2) {
    await interaction.editReply({ embeds: [createErrorEmbed('Not Found', 'One or both fixture IDs are invalid.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CHART} Match Comparison`,
    `Comparing two fixtures side by side.`,
  ).setColor(Colors.PRIMARY);

  embed.addFields(
    {
      name: `📋 ${match1.homeTeam} vs ${match1.awayTeam}`,
      value: [
        `Score: **${match1.homeScore}—${match1.awayScore}**`,
        `Status: ${match1.status}`,
        `Possession: ${match1.stats?.homePossession || '?'}% — ${match1.stats?.awayPossession || '?'}%`,
        `Shots: ${match1.stats?.homeShots || 0} — ${match1.stats?.awayShots || 0}`,
        `Shots on Target: ${match1.stats?.homeShotsOnTarget || 0} — ${match1.stats?.awayShotsOnTarget || 0}`,
      ].join('\n'),
      inline: true,
    },
    {
      name: `📋 ${match2.homeTeam} vs ${match2.awayTeam}`,
      value: [
        `Score: **${match2.homeScore}—${match2.awayScore}**`,
        `Status: ${match2.status}`,
        `Possession: ${match2.stats?.homePossession || '?'}% — ${match2.stats?.awayPossession || '?'}%`,
        `Shots: ${match2.stats?.homeShots || 0} — ${match2.stats?.awayShots || 0}`,
        `Shots on Target: ${match2.stats?.homeShotsOnTarget || 0} — ${match2.stats?.awayShotsOnTarget || 0}`,
      ].join('\n'),
      inline: true,
    },
  );

  await interaction.editReply({ embeds: [embed] });
}

async function renderMatch(interaction: ChatInputCommandInteraction, match: any): Promise<void> {
  const statusEmoji = match.status === 'LIVE' ? '🔴' : match.status === 'FT' ? '✅' : '⏳';
  const scoreDisplay = match.status === 'NS' || match.status === 'TBD'
    ? 'vs'
    : `**${match.homeScore} — ${match.awayScore}**`;

  const embed = createEmbed(
    `${statusEmoji} ${match.homeTeam} ${scoreDisplay} ${match.awayTeam}`,
    `${match.league} | ${match.round || ''}`,
  ).setColor(match.status === 'LIVE' ? Colors.ERROR : match.status === 'FT' ? Colors.SUCCESS : Colors.PRIMARY);

  if (match.date) {
    embed.addFields({ name: 'Date', value: `<t:${Math.floor(new Date(match.date).getTime() / 1000)}:F>`, inline: true });
  }

  embed.addFields(
    { name: 'Venue', value: match.venue || 'TBD', inline: true },
    { name: 'Referee', value: match.referee || 'TBD', inline: true },
    { name: 'Status', value: match.status === 'LIVE' ? `${match.elapsed}'` : match.status, inline: true },
  );

  if (match.status === 'LIVE' || match.status === 'FT') {
    const homeGoals = match.events?.filter(e => e.type === 'Goal' && e.team === match.homeTeam) || [];
    const awayGoals = match.events?.filter(e => e.type === 'Goal' && e.team === match.awayTeam) || [];

    const homeScorers = homeGoals.map(g => `${g.player} ${g.elapsed}'${g.extraMin ? `+${g.extraMin}` : ''}`).join(', ');
    const awayScorers = awayGoals.map(g => `${g.player} ${g.elapsed}'${g.extraMin ? `+${g.extraMin}` : ''}`).join(', ');

    if (homeScorers) embed.addFields({ name: `${match.homeTeam} Scorers`, value: homeScorers, inline: true });
    if (awayScorers) embed.addFields({ name: `${match.awayTeam} Scorers`, value: awayScorers, inline: true });
  }

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`match_stats_${match.fixtureId}`)
        .setLabel('Stats')
        .setEmoji(EMOJIS.CHART)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`match_lineups_${match.fixtureId}`)
        .setLabel('Lineups')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`match_h2h_${match.fixtureId}`)
        .setLabel('H2H')
        .setEmoji('⚔️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`match_refresh_${match.fixtureId}`)
        .setLabel('Refresh')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`match_follow_${match.fixtureId}`)
        .setLabel(match.isFollowed ? 'Unfollow' : 'Follow')
        .setEmoji('🔔')
        .setStyle(match.isFollowed ? ButtonStyle.Danger : ButtonStyle.Success),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

export default command;
