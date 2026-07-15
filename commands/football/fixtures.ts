import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import MatchService from '../../services/football/MatchService';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';
import { getLeagueColor } from '../../config/colors';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('fixtures')
    .setDescription('View upcoming football fixtures')
    .addSubcommand(sub =>
      sub.setName('today')
        .setDescription('Today\'s fixtures'),
    )
    .addSubcommand(sub =>
      sub.setName('tomorrow')
        .setDescription('Tomorrow\'s fixtures'),
    )
    .addSubcommand(sub =>
      sub.setName('week')
        .setDescription('This week\'s fixtures'),
    )
    .addSubcommand(sub =>
      sub.setName('league')
        .setDescription('Fixtures for a specific league')
        .addIntegerOption(opt =>
          opt.setName('league_id')
            .setDescription('League ID (default: 39 Premier League)')
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('team')
        .setDescription('Fixtures for a specific team')
        .addStringOption(opt =>
          opt.setName('team')
            .setDescription('Team name')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('next')
        .setDescription('Next 5 fixtures for your followed teams'),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'today': return handleToday(interaction);
      case 'tomorrow': return handleTomorrow(interaction);
      case 'week': return handleWeek(interaction);
      case 'league': return handleLeague(interaction);
      case 'team': return handleTeam(interaction);
      case 'next': return handleNext(interaction);
    }
  },

  async autocomplete(interaction): Promise<void> {
    const focused = interaction.options.getFocused(true);
    const teams = await MatchService.searchTeams(focused.value as string);
    await interaction.respond(
      teams.slice(0, 25).map(t => ({
        name: `${t.name} (${t.country || 'Unknown'})`,
        value: t.name,
      })),
    );
  },
};

async function handleToday(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const fixtures = await MatchService.getFixturesByDate('today');

  if (!fixtures || fixtures.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Fixtures', 'No fixtures scheduled for today.')] });
    return;
  }

  const grouped = groupByLeague(fixtures);
  const embed = createEmbed(
    `${EMOJIS.CALENDAR} Today's Fixtures`,
    `${fixtures.length} match(es) scheduled today.`,
  ).setColor(Colors.PRIMARY);

  for (const [league, matches] of Object.entries(grouped)) {
    const list = matches.slice(0, 10).map(m => {
      const time = `<t:${Math.floor(new Date(m.date).getTime() / 1000)}:t>`;
      return `${time} — ${m.homeTeam} vs ${m.awayTeam}`;
    });
    embed.addFields({ name: `📋 ${league}`, value: list.join('\n'), inline: false });
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('fixtures_select')
    .setPlaceholder('View match details')
    .addOptions(
      fixtures.slice(0, 25).map(m => new StringSelectMenuOptionBuilder()
        .setLabel(`${m.homeTeam} vs ${m.awayTeam}`)
        .setValue(m.fixtureId.toString())
        .setDescription(m.league),
      ),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  const buttonRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('fixtures_refresh')
        .setLabel('Refresh')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary),
    );

  await interaction.editReply({ embeds: [embed], components: [row, buttonRow] });
}

async function handleTomorrow(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const fixtures = await MatchService.getFixturesByDate('tomorrow');

  if (!fixtures || fixtures.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Fixtures', 'No fixtures scheduled for tomorrow.')] });
    return;
  }

  const grouped = groupByLeague(fixtures);
  const embed = createEmbed(
    `${EMOJIS.CALENDAR} Tomorrow's Fixtures`,
    `${fixtures.length} match(es) scheduled tomorrow.`,
  ).setColor(Colors.PRIMARY);

  for (const [league, matches] of Object.entries(grouped)) {
    const list = matches.slice(0, 10).map(m => {
      const time = `<t:${Math.floor(new Date(m.date).getTime() / 1000)}:t>`;
      return `${time} — ${m.homeTeam} vs ${m.awayTeam}`;
    });
    embed.addFields({ name: `📋 ${league}`, value: list.join('\n'), inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleWeek(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const fixtures = await MatchService.getFixturesByDate('week');

  if (!fixtures || fixtures.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Fixtures', 'No fixtures this week.')] });
    return;
  }

  const grouped = groupByDate(fixtures);
  const embed = createEmbed(
    `${EMOJIS.CALENDAR} This Week's Fixtures`,
    `${fixtures.length} match(es) this week.`,
  ).setColor(Colors.PRIMARY);

  for (const [date, matches] of Object.entries(grouped)) {
    const list = matches.slice(0, 8).map(m => {
      const time = `<t:${Math.floor(new Date(m.date).getTime() / 1000)}:t>`;
      return `${time} — ${m.homeTeam} vs ${m.awayTeam} (${m.league})`;
    });
    embed.addFields({ name: `📅 ${date}`, value: list.join('\n'), inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleLeague(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const leagueId = interaction.options.getInteger('league_id') || 39;
  const fixtures = await MatchService.getFixturesByLeague(leagueId);

  if (!fixtures || fixtures.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Fixtures', 'No upcoming fixtures for this league.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CALENDAR} ${fixtures[0].league}`,
    `${fixtures.length} upcoming matches.`,
  ).setColor(getLeagueColor(leagueId));

  const entries = fixtures.slice(0, 30).map((m, i) => {
    const day = Math.ceil((new Date(m.date).getTime() - Date.now()) / 86400000);
    const prefix = day <= 0 ? '🔴' : day <= 1 ? '🟡' : '⚪';
    return `${prefix} **${m.homeTeam} vs ${m.awayTeam}** — <t:${Math.floor(new Date(m.date).getTime() / 1000)}:R>`;
  });

  embed.setDescription(entries.join('\n'));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('fixtures_league_select')
    .setPlaceholder('View match details')
    .addOptions(
      fixtures.slice(0, 25).map(m => new StringSelectMenuOptionBuilder()
        .setLabel(`${m.homeTeam} vs ${m.awayTeam}`)
        .setValue(m.fixtureId.toString())
        .setDescription(m.league),
      ),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleTeam(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const teamName = interaction.options.getString('team', true);
  const fixtures = await MatchService.getFixturesByTeamName(teamName);

  if (!fixtures || fixtures.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Fixtures', `No upcoming fixtures for ${teamName}.`) }] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CALENDAR} ${teamName} — Fixtures`,
    `Next ${fixtures.length} matches.`,
  ).setColor(Colors.PRIMARY);

  const entries = fixtures.map((m, i) => {
    const isHome = m.homeTeam.toLowerCase() === teamName.toLowerCase();
    const opponent = isHome ? m.awayTeam : m.homeTeam;
    const venue = isHome ? '🏠 Home' : '✈️ Away';
    return `${venue} **${teamName}** vs **${opponent}** — <t:${Math.floor(new Date(m.date).getTime() / 1000)}:R>`;
  });

  embed.setDescription(entries.join('\n'));

  if (fixtures.length >= 3) {
    const difficulty = calculateFixtureDifficulty(fixtures.slice(0, 5));
    embed.addFields({ name: '📊 Fixture Difficulty', value: `${'🟢'.repeat(difficulty.easy)}${'🟡'.repeat(difficulty.medium)}${'🔴'.repeat(difficulty.hard)} (next 5)`, inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleNext(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const fixtures = await MatchService.getFollowedTeamFixtures(interaction.user.id);

  if (!fixtures || fixtures.length === 0) {
    await interaction.editReply({
      embeds: [createErrorEmbed('No Followed Teams', 'You haven\'t followed any teams. Use `/team` and click Follow.')],
    });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CALENDAR} Your Followed Teams — Next Fixtures`,
    `Upcoming matches for teams you follow.`,
  ).setColor(Colors.PRIMARY);

  const byTeam: Record<string, string[]> = {};
  for (const f of fixtures) {
    if (!byTeam[f.team]) byTeam[f.team] = [];
    byTeam[f.team].push(`**${f.homeTeam}** vs **${f.awayTeam}** — <t:${Math.floor(new Date(f.date).getTime() / 1000)}:R>`);
  }

  for (const [team, list] of Object.entries(byTeam)) {
    embed.addFields({ name: `📋 ${team}`, value: list.slice(0, 5).join('\n'), inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}

function groupByLeague(fixtures: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};
  for (const f of fixtures) {
    if (!grouped[f.league]) grouped[f.league] = [];
    grouped[f.league].push(f);
  }
  return grouped;
}

function groupByDate(fixtures: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};
  for (const f of fixtures) {
    const date = new Date(f.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(f);
  }
  return grouped;
}

function calculateFixtureDifficulty(fixtures: any[]): { easy: number; medium: number; hard: number } {
  let easy = 0, medium = 0, hard = 0;
  for (const f of fixtures) {
    const rating = f.opponentStrength || 50;
    if (rating < 40) easy++;
    else if (rating < 65) medium++;
    else hard++;
  }
  return { easy, medium, hard };
}

export default command;
