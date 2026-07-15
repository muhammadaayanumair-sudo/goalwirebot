import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import MatchService from '../../services/football/MatchService';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View match statistics')
    .addSubcommand(sub =>
      sub.setName('match')
        .setDescription('Stats for a specific match')
        .addStringOption(opt =>
          opt.setName('fixture_id')
            .setDescription('Fixture ID')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('league')
        .setDescription('League-wide stats leaders')
        .addIntegerOption(opt =>
          opt.setName('league_id')
            .setDescription('League ID (default: 39)')
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('player')
        .setDescription('Player stats this season')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('Player name')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'match': return handleMatch(interaction);
      case 'league': return handleLeague(interaction);
      case 'player': return handlePlayer(interaction);
    }
  },

  async autocomplete(interaction): Promise<void> {
    const focused = interaction.options.getFocused(true);
    const players = await MatchService.searchPlayers(focused.value as string);
    await interaction.respond(
      players.slice(0, 25).map(p => ({
        name: `${p.name} — ${p.team}`,
        value: p.name,
      })),
    );
  },
};

async function handleMatch(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const fixtureId = interaction.options.getString('fixture_id', true);
  const stats = await MatchService.getMatchStats(Number(fixtureId));

  if (!stats) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Stats', 'Statistics not available for this match.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CHART} Match Stats: ${stats.homeTeam} vs ${stats.awayTeam}`,
    `Score: ${stats.homeScore} — ${stats.awayScore}`,
  ).setColor(Colors.PRIMARY);

  const categories = [
    { label: 'Possession', home: `${stats.homePossession || 0}%`, away: `${stats.awayPossession || 0}%` },
    { label: 'Shots', home: `${stats.homeShots || 0}`, away: `${stats.awayShots || 0}` },
    { label: 'Shots on Target', home: `${stats.homeShotsOnTarget || 0}`, away: `${stats.awayShotsOnTarget || 0}` },
    { label: 'Corners', home: `${stats.homeCorners || 0}`, away: `${stats.awayCorners || 0}` },
    { label: 'Fouls', home: `${stats.homeFouls || 0}`, away: `${stats.awayFouls || 0}` },
    { label: 'Yellow Cards', home: `${stats.homeYellowCards || 0}`, away: `${stats.awayYellowCards || 0}` },
    { label: 'Red Cards', home: `${stats.homeRedCards || 0}`, away: `${stats.awayRedCards || 0}` },
    { label: 'Offsides', home: `${stats.homeOffsides || 0}`, away: `${stats.awayOffsides || 0}` },
    { label: 'Goal Kicks', home: `${stats.homeGoalKicks || 0}`, away: `${stats.awayGoalKicks || 0}` },
    { label: 'Throw-ins', home: `${stats.homeThrowIns || 0}`, away: `${stats.awayThrowIns || 0}` },
    { label: 'Passes', home: `${stats.homePasses || 0}`, away: `${stats.awayPasses || 0}` },
    { label: 'Pass Accuracy', home: `${stats.homePassAccuracy || 0}%`, away: `${stats.awayPassAccuracy || 0}%` },
  ];

  for (const cat of categories) {
    const bar = createStatBar(cat.home, cat.away);
    embed.addFields({
      name: cat.label,
      value: `\`${cat.home.padStart(6)}\` ${bar} \`${cat.away.padStart(6)}\``,
      inline: false,
    });
  }

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`match_lineups_${fixtureId}`)
        .setLabel('Lineups')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`match_refresh_${fixtureId}`)
        .setLabel('Refresh')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleLeague(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const leagueId = interaction.options.getInteger('league_id') || 39;
  const leaders = await MatchService.getLeagueStatsLeaders(leagueId);

  if (!leaders) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Data', 'League stats not available.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CHART} League Stats Leaders`,
    `${leaders.leagueName} — ${leaders.season || 'Current'}`,
  ).setColor(Colors.PRIMARY);

  if (leaders.topScorers) {
    embed.addFields({
      name: '⚽ Top Scorers',
      value: leaders.topScorers.slice(0, 10).map((p, i) => `**${i + 1}.** ${p.name} (${p.team}) — ${p.goals} goals`).join('\n'),
      inline: true,
    });
  }

  if (leaders.topAssists) {
    embed.addFields({
      name: '🎯 Top Assists',
      value: leaders.topAssists.slice(0, 10).map((p, i) => `**${i + 1}.** ${p.name} (${p.team}) — ${p.assists} assists`).join('\n'),
      inline: true,
    });
  }

  if (leaders.mostCards) {
    embed.addFields({
      name: '🟨 Most Cards',
      value: leaders.mostCards.slice(0, 5).map(p => `**${p.name}** (${p.team}) — 🟨${p.yellow} 🟥${p.red}`).join('\n'),
      inline: true,
    });
  }

  if (leaders.mostMinutes) {
    embed.addFields({
      name: '⏱ Most Minutes',
      value: leaders.mostMinutes.slice(0, 5).map((p, i) => `**${i + 1}.** ${p.name} (${p.team}) — ${p.minutes} min`).join('\n'),
      inline: true,
    });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handlePlayer(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const playerName = interaction.options.getString('name', true);
  const stats = await MatchService.getPlayerSeasonStats(playerName);

  if (!stats) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Stats', `No season stats for ${playerName}.`) }] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CHART} ${stats.name} — Season Stats`,
    `${stats.team} | ${stats.league}`,
  ).setColor(Colors.PRIMARY);

  embed.addFields(
    { name: 'Appearances', value: `${stats.appearances}`, inline: true },
    { name: 'Goals', value: `${stats.goals}`, inline: true },
    { name: 'Assists', value: `${stats.assists}`, inline: true },
    { name: 'Minutes Played', value: `${stats.minutes}`, inline: true },
    { name: 'Shots', value: `${stats.shots || 0}`, inline: true },
    { name: 'Shots on Target', value: `${stats.shotsOnTarget || 0}`, inline: true },
    { name: 'Pass Accuracy', value: `${stats.passAccuracy || 0}%`, inline: true },
    { name: 'Key Passes', value: `${stats.keyPasses || 0}`, inline: true },
    { name: 'Tackles', value: `${stats.tackles || 0}`, inline: true },
    { name: 'Interceptions', value: `${stats.interceptions || 0}`, inline: true },
    { name: 'Clearances', value: `${stats.clearances || 0}`, inline: true },
    { name: 'Dribbles', value: `${stats.dribbles || 0}`, inline: true },
    { name: 'Fouls', value: `${stats.fouls || 0}`, inline: true },
    { name: 'Yellow Cards', value: `${stats.yellowCards || 0}`, inline: true },
    { name: 'Red Cards', value: `${stats.redCards || 0}`, inline: true },
    { name: 'Rating', value: `${stats.rating || 0}/10`, inline: true },
  );

  await interaction.editReply({ embeds: [embed] });
}

function createStatBar(home: string, away: string): string {
  const hVal = parseInt(home) || 0;
  const aVal = parseInt(away) || 0;
  const total = hVal + aVal || 1;
  const bars = 20;
  const hBars = Math.round((hVal / total) * bars);
  const aBars = bars - hBars;
  return `${'🟢'.repeat(hBars)}${'🔴'.repeat(Math.max(aBars, 0))}`;
}

export default command;
