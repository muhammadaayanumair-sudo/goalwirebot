import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import NewsService from '../../services/news/NewsService';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed, createLoadingEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('newstransfers')
    .setDescription('Latest transfer news and rumours')
    .addSubcommand(sub =>
      sub.setName('latest')
        .setDescription('Latest transfer news'),
    )
    .addSubcommand(sub =>
      sub.setName('done')
        .setDescription('Confirmed done deals'),
    )
    .addSubcommand(sub =>
      sub.setName('rumours')
        .setDescription('Transfer rumours and gossip'),
    )
    .addSubcommand(sub =>
      sub.setName('team')
        .setDescription('Transfer news for a specific team')
        .addStringOption(opt =>
          opt.setName('team')
            .setDescription('Team name')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('biggest')
        .setDescription('Biggest transfer stories'),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'latest': return handleLatest(interaction);
      case 'done': return handleDone(interaction);
      case 'rumours': return handleRumours(interaction);
      case 'team': return handleTeam(interaction);
      case 'biggest': return handleBiggest(interaction);
    }
  },

  async autocomplete(interaction): Promise<void> {
    const focused = interaction.options.getFocused(true);
    const results = await NewsService.autocomplete(focused.value as string);
    await interaction.respond(results.slice(0, 25));
  },
};

async function handleLatest(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  await interaction.editReply({ embeds: [createLoadingEmbed('Fetching latest transfer news...')] });

  const result = await NewsService.getTransferNews();

  if (!result || result.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Transfer News', 'No transfer news available right now.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.TRANSFER} Latest Transfer News`,
    `${result.length} stories from the transfer market.`,
  ).setColor(Colors.PRIMARY);

  const entries = result.slice(0, 15).map((item, i) =>
    `**${i + 1}.** ${item.player} — ${item.from} → ${item.to}\n${item.fee ? `💰 $${(item.fee / 1_000_000).toFixed(1)}M` : '💰 Fee TBD'} | ${item.status === 'done' ? '✅ Done Deal' : item.status === 'rumour' ? '❓ Rumour' : '📝 Negotiating'}\n${item.source || ''}${item.date ? ` • ${item.date}` : ''}`,
  );

  embed.setDescription(entries.join('\n\n'));

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('newstransfers_refresh')
        .setLabel('Refresh')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('newstransfers_done')
        .setLabel('Done Deals')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('newstransfers_rumours')
        .setLabel('Rumours')
        .setEmoji('❓')
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleDone(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  await interaction.editReply({ embeds: [createLoadingEmbed('Fetching confirmed transfers...')] });

  const result = await NewsService.getDoneDeals();

  if (!result || result.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Done Deals', 'No confirmed transfers in this window yet.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.SUCCESS} Confirmed Transfers`,
    `${result.length} done deals this window.`,
  ).setColor(Colors.SUCCESS);

  const totalSpent = result.reduce((s, t) => s + (t.fee || 0), 0);

  const entries = result.slice(0, 20).map((item, i) =>
    `**${i + 1}.** ✅ **${item.player}** ${item.from ? `${item.from} →` : ''} **${item.to}**\n${item.fee ? `💰 $${(item.fee / 1_000_000).toFixed(1)}M` : '💰 Free Transfer'} | ${item.position || ''} | ${item.date}`,
  );

  embed.setDescription(entries.join('\n\n'));
  embed.addFields({ name: 'Total Market Spend', value: `$${(totalSpent / 1_000_000_000).toFixed(2)}B`, inline: false });

  await interaction.editReply({ embeds: [embed] });
}

async function handleRumours(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  await interaction.editReply({ embeds: [createLoadingEmbed('Fetching transfer rumours...')] });

  const result = await NewsService.getTransferRumours();

  if (!result || result.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Rumours', 'No transfer rumours right now.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.NEWS} Transfer Rumours`,
    `Latest gossip and speculation.`,
  ).setColor(Colors.WARNING);

  const entries = result.slice(0, 15).map((item, i) => {
    const reliability = '🟢'.repeat(item.reliability || 0) + '⚪'.repeat(Math.max(0, 5 - (item.reliability || 0)));
    return `**${i + 1}.** ❓ **${item.player}** → **${item.linkedClub}**\n${item.fee ? `💰 $${(item.fee / 1_000_000).toFixed(1)}M` : '💰 Fee TBD'} | Reliability: ${reliability}\n${item.source || ''}${item.date ? ` • ${item.date}` : ''}`;
  });

  embed.setDescription(entries.join('\n\n'));
  embed.addFields({ name: 'Reliability Key', value: '🟢🟢🟢🟢🟢 = Very likely → ⚪ = Unlikely', inline: false });

  await interaction.editReply({ embeds: [embed] });
}

async function handleTeam(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const teamName = interaction.options.getString('team', true);
  await interaction.editReply({ embeds: [createLoadingEmbed(`Fetching ${teamName} transfer news...`)] });

  const result = await NewsService.getTeamTransferNews(teamName);

  if (!result || result.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No News', `No transfer news for ${teamName}.`) }] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.TRANSFER} ${teamName} — Transfer News`,
    `All transfer stories related to ${teamName}.`,
  ).setColor(Colors.PRIMARY);

  const entries = result.slice(0, 15).map((item, i) =>
    `**${i + 1}.** ${item.status === 'done' ? '✅' : item.status === 'rumour' ? '❓' : '📝'} **${item.player}** ${item.from && item.from !== teamName ? `${item.from} →` : ''} ${item.to && item.to !== teamName ? `→ ${item.to}` : ''}\n${item.fee ? `💰 $${(item.fee / 1_000_000).toFixed(1)}M` : ''} | ${item.source || ''}`,
  );

  embed.setDescription(entries.join('\n\n'));

  const ins = result.filter(t => t.to === teamName && t.status === 'done');
  const outs = result.filter(t => t.from === teamName && t.status === 'done');
  const rumours = result.filter(t => t.status === 'rumour');

  embed.addFields(
    { name: '📥 In', value: `${ins.length}`, inline: true },
    { name: '📤 Out', value: `${outs.length}`, inline: true },
    { name: '❓ Rumours', value: `${rumours.length}`, inline: true },
  );

  await interaction.editReply({ embeds: [embed] });
}

async function handleBiggest(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  await interaction.editReply({ embeds: [createLoadingEmbed('Fetching biggest transfer stories...')] });

  const result = await NewsService.getBiggestTransferStories();

  if (!result || result.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Data', 'Biggest transfer stories not available.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.MONEY} Biggest Transfer Stories`,
    `The most talked about deals this window.`,
  ).setColor(Colors.GOLD);

  const entries = result.slice(0, 15).map((item, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
    return `${medal} **${item.player}** ${item.from ? `${item.from} →` : ''} **${item.to}**\n💰 $${(item.fee / 1_000_000).toFixed(1)}M | ${item.storyCount} sources | ${item.heat}%热度`;
  });

  embed.setDescription(entries.join('\n\n'));

  const totalValue = result.reduce((s, t) => s + (t.fee || 0), 0);
  embed.addFields({ name: 'Combined Value', value: `$${(totalValue / 1_000_000_000).toFixed(2)}B`, inline: false });

  await interaction.editReply({ embeds: [embed] });
}

export default command;
