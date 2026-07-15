import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import TeamService from '../../services/football/TeamService';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed, createLoadingEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('team')
    .setDescription('View football team information and stats')
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('View team details')
        .addStringOption(opt =>
          opt.setName('team')
            .setDescription('Team name')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('squad')
        .setDescription('View team squad')
        .addStringOption(opt =>
          opt.setName('team')
            .setDescription('Team name')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('injuries')
        .setDescription('View team injuries')
        .addStringOption(opt =>
          opt.setName('team')
            .setDescription('Team name')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('stats')
        .setDescription('View team season stats')
        .addStringOption(opt =>
          opt.setName('team')
            .setDescription('Team name')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('transfers')
        .setDescription('View team transfers')
        .addStringOption(opt =>
          opt.setName('team')
            .setDescription('Team name')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('trophies')
        .setDescription('View team trophy cabinet')
        .addStringOption(opt =>
          opt.setName('team')
            .setDescription('Team name')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'info': return handleInfo(interaction);
      case 'squad': return handleSquad(interaction);
      case 'injuries': return handleInjuries(interaction);
      case 'stats': return handleStats(interaction);
      case 'transfers': return handleTransfers(interaction);
      case 'trophies': return handleTrophies(interaction);
    }
  },

  async autocomplete(interaction): Promise<void> {
    const focused = interaction.options.getFocused(true);
    const teams = await TeamService.searchTeams(focused.value as string);
    await interaction.respond(
      teams.slice(0, 25).map(t => ({
        name: `${t.name} (${t.country || 'Unknown'})`,
        value: t.name,
      })),
    );
  },
};

async function handleInfo(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const teamName = interaction.options.getString('team', true);
  const team = await TeamService.getTeamInfo(teamName);

  if (!team) {
    await interaction.editReply({ embeds: [createErrorEmbed('Not Found', `Team "${teamName}" not found.`) }] });
    return;
  }

  const embed = createEmbed(
    `${team.badge || '⚽'} ${team.name}`,
    `${team.country || ''} | Founded: ${team.founded || 'N/A'}`,
  )
    .setThumbnail(team.badge || '')
    .setColor(team.color || Colors.PRIMARY);

  embed.addFields(
    { name: 'Venue', value: team.venue || 'N/A', inline: true },
    { name: 'Capacity', value: team.capacity?.toLocaleString() || 'N/A', inline: true },
    { name: 'League', value: team.league || 'N/A', inline: true },
    { name: 'Manager', value: team.manager || 'N/A', inline: true },
    { name: 'Season Points', value: `${team.seasonPoints || 0}`, inline: true },
    { name: 'League Position', value: team.position ? `#${team.position}` : 'N/A', inline: true },
    { name: 'Last 5 Form', value: (team.form || '').slice(-5).split('').map(c => c === 'W' ? '✅' : c === 'D' ? '➖' : '❌').join(' ') || 'N/A', inline: true },
    { name: 'Total Players', value: `${team.squadSize || 0}`, inline: true },
    { name: 'Foreign Players', value: `${team.foreignPlayers || 0}`, inline: true },
  );

  if (team.description) {
    embed.addFields({ name: 'About', value: team.description.slice(0, 1024), inline: false });
  }

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`team_squad_${team.id}`)
        .setLabel('Squad')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`team_stats_${team.id}`)
        .setLabel('Stats')
        .setEmoji(EMOJIS.CHART)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`team_fixtures_${team.id}`)
        .setLabel('Fixtures')
        .setEmoji(EMOJIS.CALENDAR)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`team_follow_${team.id}`)
        .setLabel('Follow')
        .setEmoji('🔔')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`team_compare_${team.id}`)
        .setLabel('Compare')
        .setEmoji('⚔️')
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleSquad(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const teamName = interaction.options.getString('team', true);
  const squad = await TeamService.getTeamSquad(teamName);

  if (!squad || squad.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Squad', `No squad data for ${teamName}.`) }] });
    return;
  }

  const gk = squad.filter(p => p.position === 'Goalkeeper');
  const def = squad.filter(p => p.position === 'Defender');
  const mid = squad.filter(p => p.position === 'Midfielder');
  const fwd = squad.filter(p => p.position === 'Forward');

  const embed = createEmbed(
    `📋 ${squad[0].teamName} — Squad`,
    `${squad.length} players`,
  )
    .setThumbnail(squad[0].teamBadge || '')
    .setColor(Colors.PRIMARY);

  if (gk.length) embed.addFields({ name: `🧤 Goalkeepers (${gk.length})`, value: gk.map(p => `${p.name} | ${p.nationality || ''} | #${p.number || '?'}`).join('\n').slice(0, 1024), inline: false });
  if (def.length) embed.addFields({ name: `🛡️ Defenders (${def.length})`, value: def.map(p => `${p.name} | ${p.nationality || ''} | #${p.number || '?'}`).join('\n').slice(0, 1024), inline: false });
  if (mid.length) embed.addFields({ name: `🎯 Midfielders (${mid.length})`, value: mid.map(p => `${p.name} | ${p.nationality || ''} | #${p.number || '?'}`).join('\n').slice(0, 1024), inline: false });
  if (fwd.length) embed.addFields({ name: `⚽ Forwards (${fwd.length})`, value: fwd.map(p => `${p.name} | ${p.nationality || ''} | #${p.number || '?'}`).join('\n').slice(0, 1024), inline: false });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('team_squad_select')
    .setPlaceholder('View player details')
    .addOptions(
      squad.slice(0, 25).map(p => new StringSelectMenuOptionBuilder()
        .setLabel(`${p.name} — ${p.position}`)
        .setValue(p.id.toString())
        .setDescription(`${p.nationality || 'N/A'} | #${p.number || '?'}`),
      ),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleInjuries(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const teamName = interaction.options.getString('team', true);
  const injuries = await TeamService.getTeamInjuries(teamName);

  if (!injuries || injuries.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Injuries', `No reported injuries for ${teamName}.`) }] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.WARNING} ${injuries[0].teamName} — Injuries`,
    `${injuries.length} player(s) currently injured.`,
  ).setColor(Colors.ERROR);

  const entries = injuries.map(p =>
    `**${p.name}** — ${p.position} | ${p.injury} | ${p.returnDate ? `Return: ${p.returnDate}` : 'No return date'} | Status: ${p.status === 'out' ? '❌ Out' : '⚠️ Doubtful'}`,
  );

  embed.setDescription(entries.join('\n'));

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`team_squad_${injuries[0].teamId}`)
        .setLabel('View Squad')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Primary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleStats(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const teamName = interaction.options.getString('team', true);
  const stats = await TeamService.getTeamSeasonStats(teamName);

  if (!stats) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Stats', `No season stats for ${teamName}.`) }] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CHART} ${stats.name} — Season Stats`,
    `${stats.league} | ${stats.season}`,
  )
    .setThumbnail(stats.badge || '')
    .setColor(Colors.PRIMARY);

  embed.addFields(
    { name: 'Matches Played', value: `${stats.played}`, inline: true },
    { name: 'Wins', value: `${stats.wins}`, inline: true },
    { name: 'Draws', value: `${stats.draws}`, inline: true },
    { name: 'Losses', value: `${stats.losses}`, inline: true },
    { name: 'Goals For', value: `${stats.goalsFor}`, inline: true },
    { name: 'Goals Against', value: `${stats.goalsAgainst}`, inline: true },
    { name: 'Goal Difference', value: `${stats.goalDiff > 0 ? `+${stats.goalDiff}` : stats.goalDiff}`, inline: true },
    { name: 'Avg Goals/Game', value: `${(stats.goalsFor / Math.max(stats.played, 1)).toFixed(2)}`, inline: true },
    { name: 'Clean Sheets', value: `${stats.cleanSheets || 0}`, inline: true },
    { name: 'Avg Possession', value: `${stats.avgPossession || 0}%`, inline: true },
    { name: 'Pass Accuracy', value: `${stats.passAccuracy || 0}%`, inline: true },
    { name: 'Shot Accuracy', value: `${stats.shotAccuracy || 0}%`, inline: true },
  );

  if (stats.topScorer) {
    embed.addFields({ name: 'Top Scorer', value: `${stats.topScorer} — ${stats.topScorerGoals} goals`, inline: true });
  }
  if (stats.topAssists) {
    embed.addFields({ name: 'Top Assists', value: `${stats.topAssists} — ${stats.topAssistsCount} assists`, inline: true });
  }

  if (stats.form) {
    embed.addFields({ name: 'Form (Last 10)', value: stats.form.slice(-10).split('').map(c => c === 'W' ? '✅' : c === 'D' ? '➖' : '❌').join(' '), inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleTransfers(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const teamName = interaction.options.getString('team', true);
  const transfers = await TeamService.getTeamTransfers(teamName);

  if (!transfers || transfers.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Transfers', `No transfer data for ${teamName} this window.`) }] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.TRANSFER} ${transfers[0].teamName} — Transfers`,
    `Transfer activity for the current window.`,
  ).setColor(Colors.PRIMARY);

  const ins = transfers.filter(t => t.type === 'in');
  const outs = transfers.filter(t => t.type === 'out');

  if (ins.length > 0) {
    embed.addFields({
      name: `📥 Incomings (${ins.length})`,
      value: ins.map(t => `**${t.playerName}** — ${t.from || 'Free'} | $${(t.fee || 0).toLocaleString()}`).join('\n').slice(0, 1024),
      inline: false,
    });
  }

  if (outs.length > 0) {
    embed.addFields({
      name: `📤 Outgoings (${outs.length})`,
      value: outs.map(t => `**${t.playerName}** → ${t.to || 'Released'} | $${(t.fee || 0).toLocaleString()}`).join('\n').slice(0, 1024),
      inline: false,
    });
  }

  if (transfers.length > 0) {
    const totalSpent = ins.reduce((s, t) => s + (t.fee || 0), 0);
    const totalReceived = outs.reduce((s, t) => s + (t.fee || 0), 0);
    embed.addFields(
      { name: 'Total Spent', value: `$${totalSpent.toLocaleString()}`, inline: true },
      { name: 'Total Received', value: `$${totalReceived.toLocaleString()}`, inline: true },
      { name: 'Net Spend', value: `$${(totalSpent - totalReceived).toLocaleString()}`, inline: true },
    );
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleTrophies(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const teamName = interaction.options.getString('team', true);
  const trophies = await TeamService.getTeamTrophies(teamName);

  if (!trophies || trophies.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Trophies', `No trophy data for ${teamName}.`) }] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.TROPHY} ${trophies[0].teamName} — Trophy Cabinet`,
    `Total: ${trophies.length} trophies`,
  ).setColor(Colors.GOLD);

  const byCompetition: Record<string, string[]> = {};
  for (const t of trophies) {
    if (!byCompetition[t.competition]) byCompetition[t.competition] = [];
    byCompetition[t.competition].push(t.season);
  }

  for (const [comp, seasons] of Object.entries(byCompetition)) {
    const emoji = comp.toLowerCase().includes('champions') || comp.toLowerCase().includes('world') ? '🌍' :
                  comp.toLowerCase().includes('cup') ? '🏆' :
                  comp.toLowerCase().includes('league') ? '📋' : '🏅';
    embed.addFields({
      name: `${emoji} ${comp} (${seasons.length}x)`,
      value: seasons.join(', '),
      inline: false,
    });
  }

  await interaction.editReply({ embeds: [embed] });
}

export default command;
