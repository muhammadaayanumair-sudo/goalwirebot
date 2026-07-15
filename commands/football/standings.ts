import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import MatchService from '../../services/football/MatchService';
import { Colors, getLeagueColor } from '../../config/colors';
import { EMOJIS, LEAGUE_IDS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('standings')
    .setDescription('View league standings and tables')
    .addSubcommand(sub =>
      sub.setName('league')
        .setDescription('View standings for a league')
        .addIntegerOption(opt =>
          opt.setName('league_id')
            .setDescription('League ID (default: 39 Premier League)')
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('top4')
        .setDescription('Top 4 battle across top leagues'),
    )
    .addSubcommand(sub =>
      sub.setName('relegation')
        .setDescription('Relegation zone watch'),
    )
    .addSubcommand(sub =>
      sub.setName('form')
        .setDescription('Standings based on recent form (last 5)'),
    )
    .addSubcommand(sub =>
      sub.setName('homeaway')
        .setDescription('Home vs away standings split'),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'league': return handleLeague(interaction);
      case 'top4': return handleTop4(interaction);
      case 'relegation': return handleRelegation(interaction);
      case 'form': return handleForm(interaction);
      case 'homeaway': return handleHomeAway(interaction);
    }
  },
};

async function handleLeague(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const leagueId = interaction.options.getInteger('league_id') || 39;
  const standings = await MatchService.getStandings(leagueId);

  if (!standings || standings.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Data', 'Standings not available for this league yet.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CROWN} ${standings[0].leagueName}`,
    `${standings[0].season || 'Current'} Season | ${standings.length} teams`,
  ).setColor(getLeagueColor(leagueId));

  const entries = standings.slice(0, 20).map((t, i) => {
    const rank = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    const championsLeague = i < 4 ? '⚪' : '';
    const europaLeague = (i >= 4 && i < 6) ? '⚪' : '';
    const relegation = i >= standings.length - 3 ? '🔴' : '';
    const badge = championsLeague || europaLeague || relegation || '';
    const formIndicator = t.form ? t.form.slice(-5).split('').map((c: string) => c === 'W' ? '✅' : c === 'D' ? '➖' : '❌').join('') : '';
    return `${rank} ${badge} **${t.name}** | ${t.played}GP | ${t.wins}W ${t.draws}D ${t.losses}L | ${t.goalsFor}GF ${t.goalsAgainst}GA | **${t.points}Pts** | ${t.goalDiff > 0 ? `+${t.goalDiff}` : t.goalDiff} | ${formIndicator}`;
  });

  embed.setDescription(entries.join('\n'));

  const legend = [
    '⚪ = Champions League | ⚪ = Europa League | 🔴 = Relegation Zone',
    'Form: ✅ Win ➖ Draw ❌ Loss',
  ].join('\n');
  embed.addFields({ name: '📖 Legend', value: legend, inline: false });

  embed.setFooter({ text: 'Click a team below for detailed stats' });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('standings_team_select')
    .setPlaceholder('View team details')
    .addOptions(
      standings.slice(0, 25).map(t => new StringSelectMenuOptionBuilder()
        .setLabel(`${t.position}. ${t.name} — ${t.points}pts`)
        .setValue(t.teamId.toString())
        .setDescription(`GP: ${t.played} | GD: ${t.goalDiff}`),
      ),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  const buttonRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`standings_full_${leagueId}`)
        .setLabel('Full Table')
        .setEmoji(EMOJIS.CHART)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`standings_form_${leagueId}`)
        .setLabel('Form Table')
        .setEmoji(EMOJIS.FIRE)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`standings_refresh_${leagueId}`)
        .setLabel('Refresh')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row, buttonRow] });
}

async function handleTop4(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const leagueIds = [39, 140, 78, 135, 61];
  const allStandings = await Promise.all(
    leagueIds.map(id => MatchService.getStandings(id).then(s => ({ league: s?.[0]?.leagueName || `League ${id}`, standings: s?.slice(0, 4) || [] }))),
  );

  const embed = createEmbed(
    `${EMOJIS.CROWN} Top 4 Battle`,
    'Champions League qualification race across top leagues.',
  ).setColor(Colors.GOLD);

  for (const { league, standings } of allStandings) {
    if (standings.length === 0) continue;
    const entries = standings.map((t, i) =>
      `**${i + 1}.** ${t.name} — ${t.points}pts (GP: ${t.played}, GD: ${t.goalDiff})`,
    );
    embed.addFields({ name: `📋 ${league}`, value: entries.join('\n'), inline: true });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleRelegation(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const leagueIds = [39, 140, 78, 135, 61];
  const allStandings = await Promise.all(
    leagueIds.map(id => MatchService.getStandings(id).then(s => ({ league: s?.[0]?.leagueName || `League ${id}`, standings: s?.slice(-5) || [] }))),
  );

  const embed = createEmbed(
    `${EMOJIS.WARNING} Relegation Zone Watch`,
    'Teams fighting to stay up across top leagues.',
  ).setColor(Colors.ERROR);

  for (const { league, standings } of allStandings) {
    if (standings.length === 0) continue;
    const entries = standings.map(t =>
      `**${t.position}.** ${t.name} — ${t.points}pts | ${t.form?.slice(-5) || 'N/A'}`,
    );
    embed.addFields({ name: `📋 ${league}`, value: entries.join('\n'), inline: true });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleForm(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const leagueId = 39;
  const standings = await MatchService.getStandings(leagueId);

  if (!standings || standings.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Data', 'Form standings not available.')] });
    return;
  }

  const formStandings = [...standings]
    .filter(t => t.form)
    .sort((a, b) => {
      const aForm = a.form || '';
      const bForm = b.form || '';
      const aPts = aForm.split('').reduce((s, c) => s + (c === 'W' ? 3 : c === 'D' ? 1 : 0), 0);
      const bPts = bForm.split('').reduce((s, c) => s + (c === 'W' ? 3 : c === 'D' ? 1 : 0), 0);
      return bPts - aPts;
    });

  const embed = createEmbed(
    `${EMOJIS.FIRE} Form Standings (Last 5)`,
    `${standings[0].leagueName} — Ranked by recent form.`,
  ).setColor(Colors.WARNING);

  const entries = formStandings.slice(0, 20).map((t, i) => {
    const formDisplay = (t.form || '').slice(-5).split('').map(c => c === 'W' ? '✅' : c === 'D' ? '➖' : '❌').join('');
    const formPts = (t.form || '').split('').slice(-5).reduce((s, c) => s + (c === 'W' ? 3 : c === 'D' ? 1 : 0), 0);
    return `${i + 1}. **${t.name}** — ${formPts}/15pts | ${formDisplay}`;
  });

  embed.setDescription(entries.join('\n'));

  await interaction.editReply({ embeds: [embed] });
}

async function handleHomeAway(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const leagueId = interaction.options.getInteger('league_id') || 39;
  const standings = await MatchService.getStandings(leagueId);

  if (!standings || standings.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Data', 'Standings not available.')] });
    return;
  }

  const homeSorted = [...standings].sort((a, b) => (b.homePoints || b.points) - (a.homePoints || a.points));
  const awaySorted = [...standings].sort((a, b) => (b.awayPoints || b.points) - (a.awayPoints || a.points));

  const embed = createEmbed(
    `${EMOJIS.CHART} Home vs Away Split`,
    `${standings[0].leagueName} — Best and worst home/away records.`,
  ).setColor(Colors.PRIMARY);

  const homeBest = homeSorted.slice(0, 5).map((t, i) => `${i + 1}. **${t.name}** — ${t.homePoints || t.points}pts`);
  const awayBest = awaySorted.slice(0, 5).map((t, i) => `${i + 1}. **${t.name}** — ${t.awayPoints || t.points}pts`);

  embed.addFields(
    { name: '🏠 Best Home Records', value: homeBest.join('\n'), inline: true },
    { name: '✈️ Best Away Records', value: awayBest.join('\n'), inline: true },
  );

  if (standings.length > 5) {
    const homeWorst = homeSorted.slice(-5).reverse().map((t, i) => `${standings.length - 4 + i}. **${t.name}** — ${t.homePoints || t.points}pts`);
    const awayWorst = awaySorted.slice(-5).reverse().map((t, i) => `${standings.length - 4 + i}. **${t.name}** — ${t.awayPoints || t.points}pts`);
    embed.addFields(
      { name: '🏠 Worst Home Records', value: homeWorst.join('\n'), inline: true },
      { name: '✈️ Worst Away Records', value: awayWorst.join('\n'), inline: true },
    );
  }

  await interaction.editReply({ embeds: [embed] });
}

export default command;
