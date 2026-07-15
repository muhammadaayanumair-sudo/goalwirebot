import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import NewsService from '../../services/news/NewsService';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed, createLoadingEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('breaking')
    .setDescription('Breaking football news and alerts')
    .addSubcommand(sub =>
      sub.setName('latest')
        .setDescription('Latest breaking news'),
    )
    .addSubcommand(sub =>
      sub.setName('transfers')
        .setDescription('Breaking transfer news'),
    )
    .addSubcommand(sub =>
      sub.setName('injuries')
        .setDescription('Breaking injury news'),
    )
    .addSubcommand(sub =>
      sub.setName('subscribe')
        .setDescription('Subscribe to breaking news alerts for a team')
        .addStringOption(opt =>
          opt.setName('team')
            .setDescription('Team name')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('unsubscribe')
        .setDescription('Unsubscribe from breaking news alerts'),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'latest': return handleLatest(interaction);
      case 'transfers': return handleTransfers(interaction);
      case 'injuries': return handleInjuries(interaction);
      case 'subscribe': return handleSubscribe(interaction);
      case 'unsubscribe': return handleUnsubscribe(interaction);
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

  await interaction.editReply({ embeds: [createLoadingEmbed('Fetching breaking news...')] });

  const result = await NewsService.getBreakingNews();

  if (!result || result.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Breaking News', 'No breaking news at this time.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.NEWS} 🔴 Breaking News`,
    `Latest breaking stories from the football world.`,
  ).setColor(Colors.ERROR);

  const entries = result.slice(0, 10).map((article, i) =>
    `**${i + 1}.** [${article.title}](${article.url})\n${article.source} • ${article.date} • ${article.time || ''}\n${article.description ? article.description.slice(0, 150) : ''}`,
  );

  embed.setDescription(entries.join('\n\n'));

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('breaking_refresh')
        .setLabel('Refresh')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('breaking_subscribe')
        .setLabel('Subscribe to Alerts')
        .setEmoji('🔔')
        .setStyle(ButtonStyle.Primary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleTransfers(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  await interaction.editReply({ embeds: [createLoadingEmbed('Fetching breaking transfer news...')] });

  const result = await NewsService.getBreakingTransferNews();

  if (!result || result.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Transfer News', 'No breaking transfer news right now.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.TRANSFER} 🔴 Breaking Transfer News`,
    `Latest transfer developments and rumours.`,
  ).setColor(Colors.ERROR);

  const entries = result.map((item, i) =>
    `**${i + 1}.** ${item.emoji || '🔄'} **${item.player}** ${item.type === 'done' ? '✅ Done Deal' : item.type === 'rumour' ? '❓ Rumour' : '📝 Negotiation'}\n${item.from} → ${item.to} | ${item.fee ? `$${(item.fee / 1_000_000).toFixed(1)}M` : 'Fee TBD'}\n${item.source} • ${item.date}\n${item.details || ''}`,
  );

  embed.setDescription(entries.join('\n\n'));

  await interaction.editReply({ embeds: [embed] });
}

async function handleInjuries(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  await interaction.editReply({ embeds: [createLoadingEmbed('Fetching injury news...')] });

  const result = await NewsService.getInjuryNews();

  if (!result || result.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Injury News', 'No major injury updates right now.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.WARNING} 🔴 Injury News`,
    `Latest player injury updates.`,
  ).setColor(Colors.WARNING);

  const entries = result.slice(0, 15).map((item, i) =>
    `**${i + 1}.** ${item.player} (${item.team})\n${item.injury} | ${item.expectedReturn ? `Return: ${item.expectedReturn}` : 'No return date'} | ${item.status === 'out' ? '❌ Out' : '⚠️ Doubtful'}`,
  );

  embed.setDescription(entries.join('\n\n'));

  await interaction.editReply({ embeds: [embed] });
}

async function handleSubscribe(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const teamName = interaction.options.getString('team', true);
  const result = await NewsService.subscribeToBreaking(interaction.user.id, teamName);

  if (!result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Subscribe Failed', result.error || 'Could not subscribe.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.SUCCESS} Subscribed to ${teamName} Alerts`,
    `You will receive breaking news for **${teamName}** in your DMs.`,
  ).setColor(Colors.SUCCESS);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('breaking_subscriptions')
        .setLabel('My Subscriptions')
        .setEmoji('🔔')
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleUnsubscribe(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const result = await NewsService.unsubscribeFromBreaking(interaction.user.id);

  if (!result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Error', result.error || 'You have no active subscriptions.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.INFO} Unsubscribed`,
    `You will no longer receive breaking news alerts.`,
  ).setColor(Colors.WARNING);

  await interaction.editReply({ embeds: [embed] });
}

export default command;
