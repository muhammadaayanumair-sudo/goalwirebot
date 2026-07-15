import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import TeamService from '../../services/football/TeamService';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('transfers')
    .setDescription('View football transfers and transfer news')
    .addSubcommand(sub =>
      sub.setName('recent')
        .setDescription('Recent completed transfers'),
    )
    .addSubcommand(sub =>
      sub.setName('biggest')
        .setDescription('Biggest transfers of the window'),
    )
    .addSubcommand(sub =>
      sub.setName('team')
        .setDescription('Transfers for a specific team')
        .addStringOption(opt =>
          opt.setName('team')
            .setDescription('Team name')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('league')
        .setDescription('Transfers in a league')
        .addIntegerOption(opt =>
          opt.setName('league_id')
            .setDescription('League ID (default: 39)')
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('rumours')
        .setDescription('Latest transfer rumours'),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'recent': return handleRecent(interaction);
      case 'biggest': return handleBiggest(interaction);
      case 'team': return handleTeam(interaction);
      case 'league': return handleLeague(interaction);
      case 'rumours': return handleRumours(interaction);
    }
  },

  async autocomplete(interaction): Promise<void> {
    const focused = interaction.options.getFocused(true);
    const teams = await TeamService.searchTeams(focused.value as string);
    await interaction.respond(
      teams.slice(0, 25).map(t => ({
        name: `${t.name} (${t.country || ''})`,
        value: t.name,
      })),
    );
  },
};

async function handleRecent(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const transfers = await TeamService.getRecentTransfers();

  if (!transfers || transfers.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Transfers', 'No recent transfers found.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.TRANSFER} Recent Transfers`,
    `Latest completed deals across all leagues.`,
  ).setColor(Colors.PRIMARY);

  const entries = transfers.slice(0, 25).map((t, i) =>
    `**${i + 1}.** ${t.playerName} | ${t.fromTeam} → ${t.toTeam} | $${(t.fee || 0).toLocaleString()} | ${t.date}`,
  );

  embed.setDescription(entries.join('\n'));

  const totalSpent = transfers.slice(0, 25).reduce((s, t) => s + (t.fee || 0), 0);
  embed.addFields({ name: 'Total Value (shown)', value: `$${totalSpent.toLocaleString()}`, inline: true });

  await interaction.editReply({ embeds: [embed] });
}

async function handleBiggest(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const transfers = await TeamService.getBiggestTransfers();

  if (!transfers || transfers.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Data', 'Biggest transfers data not available.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.MONEY} Biggest Transfers`,
    `The most expensive deals this window.`,
  ).setColor(Colors.GOLD);

  const entries = transfers.map((t, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
    return `${medal} **${t.playerName}** | ${t.fromTeam} → ${t.toTeam} | **$${(t.fee / 1_000_000).toFixed(1)}M** | ${t.position} | ${t.date}`;
  });

  embed.setDescription(entries.join('\n'));

  const total = transfers.reduce((s, t) => s + (t.fee || 0), 0);
  embed.addFields({ name: 'Total Market Spend', value: `$${(total / 1_000_000_000).toFixed(2)}B`, inline: false });

  await interaction.editReply({ embeds: [embed] });
}

async function handleTeam(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const teamName = interaction.options.getString('team', true);
  const transfers = await TeamService.getTeamTransfers(teamName);

  if (!transfers || transfers.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Transfers', `No transfers found for ${teamName}.`) }] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.TRANSFER} ${transfers[0].teamName} — Transfers`,
    `Window transfer activity.`,
  ).setColor(Colors.PRIMARY);

  const ins = transfers.filter(t => t.type === 'in');
  const outs = transfers.filter(t => t.type === 'out');

  if (ins.length > 0) {
    embed.addFields({
      name: `📥 In (${ins.length})`,
      value: ins.map(t => `**${t.playerName}** — ${t.from || 'Free'} | $${(t.fee || 0).toLocaleString()}`).join('\n').slice(0, 1024),
      inline: true,
    });
  }

  if (outs.length > 0) {
    embed.addFields({
      name: `📤 Out (${outs.length})`,
      value: outs.map(t => `**${t.playerName}** → ${t.to || 'Released'} | $${(t.fee || 0).toLocaleString()}`).join('\n').slice(0, 1024),
      inline: true,
    });
  }

  const spent = ins.reduce((s, t) => s + (t.fee || 0), 0);
  const received = outs.reduce((s, t) => s + (t.fee || 0), 0);
  embed.addFields({
    name: '💰 Net Spend',
    value: `Spent: $${spent.toLocaleString()} | Received: $${received.toLocaleString()} | Net: $${(spent - received).toLocaleString()}`,
    inline: false,
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleLeague(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const leagueId = interaction.options.getInteger('league_id') || 39;
  const transfers = await TeamService.getLeagueTransfers(leagueId);

  if (!transfers || transfers.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Transfers', 'No transfers found for this league.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.TRANSFER} ${transfers[0].leagueName} — Transfers`,
    `${transfers.length} deals in the window.`,
  ).setColor(Colors.PRIMARY);

  const byTeam: Record<string, { ins: any[]; outs: any[] }> = {};
  for (const t of transfers) {
    const team = t.type === 'in' ? t.to : t.from;
    if (!byTeam[team]) byTeam[team] = { ins: [], outs: [] };
    byTeam[team][t.type === 'in' ? 'ins' : 'outs'].push(t);
  }

  const entries = Object.entries(byTeam)
    .sort(([, a], [, b]) => (b.ins.length + b.outs.length) - (a.ins.length + a.outs.length))
    .slice(0, 15);

  for (const [team, data] of entries) {
    const inCount = data.ins.length;
    const outCount = data.outs.length;
    const totalFee = [...data.ins, ...data.outs].reduce((s, t) => s + (t.fee || 0), 0);
    embed.addFields({
      name: `📋 ${team}`,
      value: `📥 ${inCount} in | 📤 ${outCount} out | 💰 $${(totalFee / 1_000_000).toFixed(1)}M`,
      inline: true,
    });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleRumours(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const rumours = await TeamService.getTransferRumours();

  if (!rumours || rumours.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Rumours', 'No transfer rumours available.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.NEWS} Transfer Rumours`,
    `Latest speculation and gossip from around the football world.`,
  ).setColor(Colors.WARNING);

  const entries = rumours.slice(0, 15).map((r, i) =>
    `**${i + 1}.** ${r.playerName} → **${r.linkedClub}** | Fee: ${r.fee ? `$${(r.fee / 1_000_000).toFixed(1)}M` : 'Unknown'} | Reliability: ${'🟢'.repeat(Math.max(0, r.reliability))}${'⚪'.repeat(Math.max(0, 5 - r.reliability))} | ${r.source}`,
  );

  embed.setDescription(entries.join('\n'));
  embed.addFields({ name: 'Reliability Key', value: '🟢🟢🟢🟢🟢 = Very likely → ⚪ = Unlikely', inline: false });

  await interaction.editReply({ embeds: [embed] });
}

export default command;
