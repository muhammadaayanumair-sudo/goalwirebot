import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import MatchService from '../../services/football/MatchService';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('results')
    .setDescription('View recent match results')
    .addSubcommand(sub =>
      sub.setName('today')
        .setDescription('Today\'s results'),
    )
    .addSubcommand(sub =>
      sub.setName('yesterday')
        .setDescription('Yesterday\'s results'),
    )
    .addSubcommand(sub =>
      sub.setName('league')
        .setDescription('Results for a specific league')
        .addIntegerOption(opt =>
          opt.setName('league_id')
            .setDescription('League ID (default: 39 Premier League)')
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('team')
        .setDescription('Recent results for a team')
        .addStringOption(opt =>
          opt.setName('team')
            .setDescription('Team name')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('round')
        .setDescription('Results for a specific round')
        .addIntegerOption(opt =>
          opt.setName('league_id')
            .setDescription('League ID')
            .setRequired(false),
        )
        .addIntegerOption(opt =>
          opt.setName('round')
            .setDescription('Round number')
            .setRequired(false),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'today': return handleToday(interaction);
      case 'yesterday': return handleYesterday(interaction);
      case 'league': return handleLeague(interaction);
      case 'team': return handleTeam(interaction);
      case 'round': return handleRound(interaction);
    }
  },

  async autocomplete(interaction): Promise<void> {
    const focused = interaction.options.getFocused(true);
    const teams = await MatchService.searchTeams(focused.value as string);
    await interaction.respond(
      teams.slice(0, 25).map(t => ({
        name: `${t.name} (${t.country || ''})`,
        value: t.name,
      })),
    );
  },
};

async function handleToday(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const results = await MatchService.getResultsByDate('today');

  if (!results || results.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Results', 'No completed matches today.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CHART} Today's Results`,
    `${results.length} completed match(es).`,
  ).setColor(Colors.SUCCESS);

  const byLeague: Record<string, string[]> = {};
  for (const r of results) {
    if (!byLeague[r.league]) byLeague[r.league] = [];
    byLeague[r.league].push(`**${r.homeTeam} ${r.homeScore} — ${r.awayScore} ${r.awayTeam}** — ${r.status}`);
  }

  for (const [league, matches] of Object.entries(byLeague)) {
    embed.addFields({ name: `📋 ${league}`, value: matches.join('\n'), inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleYesterday(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const results = await MatchService.getResultsByDate('yesterday');

  if (!results || results.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Results', 'No completed matches yesterday.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CHART} Yesterday's Results`,
    `${results.length} completed match(es).`,
  ).setColor(Colors.SUCCESS);

  const byLeague: Record<string, string[]> = {};
  for (const r of results) {
    if (!byLeague[r.league]) byLeague[r.league] = [];
    byLeague[r.league].push(`**${r.homeTeam} ${r.homeScore} — ${r.awayScore} ${r.awayTeam}**`);
  }

  for (const [league, matches] of Object.entries(byLeague)) {
    embed.addFields({ name: `📋 ${league}`, value: matches.join('\n'), inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleLeague(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const leagueId = interaction.options.getInteger('league_id') || 39;
  const results = await MatchService.getResultsByLeague(leagueId);

  if (!results || results.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Results', 'No recent results for this league.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CHART} ${results[0].league} — Recent Results`,
    `Last ${results.length} completed matches.`,
  ).setColor(Colors.SUCCESS);

  const entries = results.map(r =>
    `**${r.homeTeam} ${r.homeScore} — ${r.awayScore} ${r.awayTeam}** | ${r.status}`,
  );

  embed.setDescription(entries.join('\n'));

  await interaction.editReply({ embeds: [embed] });
}

async function handleTeam(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const teamName = interaction.options.getString('team', true);
  const results = await MatchService.getResultsByTeam(teamName);

  if (!results || results.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Results', `No recent results for ${teamName}.`) }] });
    return;
  }

  const form = results.slice(-5).map(r => {
    const won = (r.homeTeam.toLowerCase() === teamName.toLowerCase() && r.homeScore > r.awayScore) ||
                (r.awayTeam.toLowerCase() === teamName.toLowerCase() && r.awayScore > r.homeScore);
    return won ? '✅' : r.homeScore === r.awayScore ? '➖' : '❌';
  }).join(' ');

  const embed = createEmbed(
    `${EMOJIS.CHART} ${teamName} — Recent Results`,
    `Last ${results.length} matches.`,
  ).setColor(Colors.PRIMARY);

  const entries = results.slice(-20).reverse().map(r => {
    const isHome = r.homeTeam.toLowerCase() === teamName.toLowerCase();
    const opponent = isHome ? r.awayTeam : r.homeTeam;
    const result = isHome
      ? `${r.homeScore} — ${r.awayScore}`
      : `${r.awayScore} — ${r.homeScore}`;
    const emoji = r.homeScore > r.awayScore
      ? (isHome ? '✅' : '❌')
      : r.homeScore < r.awayScore
        ? (isHome ? '❌' : '✅')
        : '➖';
    return `${emoji} **${teamName}** ${result} **${opponent}**`;
  });

  embed.setDescription(entries.join('\n'));
  embed.addFields({ name: '📊 Form', value: form, inline: false });

  await interaction.editReply({ embeds: [embed] });
}

async function handleRound(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const leagueId = interaction.options.getInteger('league_id') || 39;
  const round = interaction.options.getInteger('round');
  const results = await MatchService.getResultsByRound(leagueId, round);

  if (!results || results.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Results', `No results for round ${round || 'latest'}.`) }] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CHART} Round ${results[0].round || round || 'N/A'} Results`,
    `${results[0].league} — ${results.length} matches.`,
  ).setColor(Colors.SUCCESS);

  const entries = results.map(r =>
    `**${r.homeTeam} ${r.homeScore} — ${r.awayScore} ${r.awayTeam}**`,
  );

  embed.setDescription(entries.join('\n'));

  await interaction.editReply({ embeds: [embed] });
}

export default command;
