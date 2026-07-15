import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import FantasyService from '../../services/fantasy/FantasyService';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';
import { paginate } from '../../utils/pagination';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('View your fantasy football history')
    .addSubcommand(sub =>
      sub.setName('gameweeks')
        .setDescription('View points per gameweek'),
    )
    .addSubcommand(sub =>
      sub.setName('transfers')
        .setDescription('View your transfer history'),
    )
    .addSubcommand(sub =>
      sub.setName('captains')
        .setDescription('View your captain history'),
    )
    .addSubcommand(sub =>
      sub.setName('rank')
        .setDescription('View your rank history'),
    )
    .addSubcommand(sub =>
      sub.setName('headtohead')
        .setDescription('View head-to-head results')
        .addUserOption(opt =>
          opt.setName('opponent')
            .setDescription('Opponent user')
            .setRequired(true),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'gameweeks': return handleGameweeks(interaction);
      case 'transfers': return handleTransfers(interaction);
      case 'captains': return handleCaptains(interaction);
      case 'rank': return handleRank(interaction);
      case 'headtohead': return handleHeadToHead(interaction);
    }
  },
};

async function handleGameweeks(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const history = await FantasyService.getGameweekHistory(interaction.user.id);

  if (!history || history.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No History', 'No gameweek data yet.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CHART} Gameweek History`,
    'Your performance across every gameweek.',
  ).setColor(Colors.PRIMARY);

  const recent = history.slice(-15).reverse();
  const lines = recent.map(gw =>
    `**GW${gw.week}:** ${gw.points}pts | Rank: #${gw.rank} | C: ${gw.captain} (${gw.captainPoints}pts) | Transfers: ${gw.transfers}`,
  );

  embed.setDescription(lines.join('\n'));

  const total = history.reduce((s, h) => s + h.points, 0);
  const avg = (total / history.length).toFixed(1);
  const best = [...history].sort((a, b) => b.points - a.points)[0];

  embed.addFields(
    { name: 'Total Points', value: `${total}`, inline: true },
    { name: 'Average', value: `${avg}/GW`, inline: true },
    { name: 'Best GW', value: `GW${best.week}: ${best.points}pts`, inline: true },
  );

  await interaction.editReply({ embeds: [embed] });
}

async function handleTransfers(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const transfers = await FantasyService.getTransferHistory(interaction.user.id);

  if (!transfers || transfers.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Transfers', 'No transfers made yet.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.TRANSFER} Transfer History`,
    'All your transfers sorted by most recent.',
  ).setColor(Colors.WARNING);

  const entries = transfers.slice(-20).reverse().map((t, i) =>
    `**${i + 1}.** GW${t.gameweek} | ${t.out} → ${t.in} | ${t.cost > 0 ? `-$${t.cost.toLocaleString()}` : 'Free'} | ${t.pointsHit > 0 ? `-${t.pointsHit}pts` : 'No hit'}`,
  );

  embed.setDescription(entries.join('\n'));

  const totalSpent = transfers.reduce((s, t) => s + t.cost, 0);
  const totalHits = transfers.reduce((s, t) => s + t.pointsHit, 0);

  embed.addFields(
    { name: 'Total Transfers', value: `${transfers.length}`, inline: true },
    { name: 'Total Spent', value: `$${totalSpent.toLocaleString()}`, inline: true },
    { name: 'Points Hit', value: `-${totalHits}pts`, inline: true },
  );

  await interaction.editReply({ embeds: [embed] });
}

async function handleCaptains(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const history = await FantasyService.getCaptainHistory(interaction.user.id);

  if (!history || history.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No History', 'No captain data yet.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CAPTAIN} Captain History`,
    'Your captain and vice-captain picks across gameweeks.',
  ).setColor(Colors.GOLD);

  const entries = history.slice(-20).reverse().map(h =>
    `**GW${h.week}:** 👑 ${h.captain} (${h.captainPoints}pts${h.tripleCaptain ? ' [3x]' : ''}) | 💎 ${h.viceCaptain || 'N/A'} (${h.viceCaptainPoints || 0}pts)`,
  );

  embed.setDescription(entries.join('\n'));

  const bestCaptain = [...history].sort((a, b) => b.captainPoints - a.captainPoints)[0];

  embed.addFields({
    name: 'Best Captain Pick',
    value: `GW${bestCaptain.week}: ${bestCaptain.captain} (${bestCaptain.captainPoints}pts)`,
    inline: false,
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleRank(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const history = await FantasyService.getRankHistory(interaction.user.id);

  if (!history || history.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Data', 'No rank history available.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CROWN} Rank History`,
    'Your global rank progression.',
  ).setColor(Colors.PRIMARY);

  const recent = history.slice(-20).reverse();
  const lines = recent.map(h =>
    `**GW${h.week}:** #${h.globalRank} ${h.change > 0 ? `📈 +${h.change}` : h.change < 0 ? `📉 ${h.change}` : '➡️ 0'} | ${h.points}pts`,
  );

  embed.setDescription(lines.join('\n'));

  const best = [...history].sort((a, b) => a.globalRank - b.globalRank)[0];

  embed.addFields(
    { name: 'Current Rank', value: `#${history[history.length - 1].globalRank}`, inline: true },
    { name: 'Best Rank', value: `#${best.globalRank} (GW${best.week})`, inline: true },
    { name: 'Gameweeks Tracked', value: `${history.length}`, inline: true },
  );

  await interaction.editReply({ embeds: [embed] });
}

async function handleHeadToHead(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const opponent = interaction.options.getUser('opponent', true);
  const results = await FantasyService.getHeadToHead(interaction.user.id, opponent.id);

  if (!results) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Data', 'No head-to-head history with this user.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CROWN} Head-to-Head`,
    `<@${interaction.user.id}> vs <@${opponent.id}>`,
  )
    .setColor(Colors.PRIMARY);

  const matches = results.matches.slice(-10).reverse().map(m =>
    `**GW${m.week}:** ${m.user1Points} — ${m.user2Points} ${m.user1Won ? '✅' : m.user2Won ? '❌' : '➖'}`,
  );

  embed.setDescription(matches.join('\n'));

  embed.addFields(
    { name: interaction.user.username, value: `${results.user1Wins}W ${results.draws}D ${results.user2Wins}L`, inline: true },
    { name: 'vs', value: `${results.matches.length} matches`, inline: true },
    { name: opponent.username, value: `${results.user2Wins}W ${results.draws}D ${results.user1Wins}L`, inline: true },
  );

  await interaction.editReply({ embeds: [embed] });
}

export default command;
