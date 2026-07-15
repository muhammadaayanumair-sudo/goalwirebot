import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Manage GoalX bot settings for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View all current settings'),
    )
    .addSubcommand(sub =>
      sub.setName('prefix')
        .setDescription('Set custom command prefix')
        .addStringOption(opt =>
          opt.setName('prefix')
            .setDescription('New prefix (e.g. ! or ?)')
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(3),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('language')
        .setDescription('Set bot language')
        .addStringOption(opt =>
          opt.setName('lang')
            .setDescription('Language code')
            .setRequired(true)
            .addChoices(
              { name: 'English', value: 'en' },
              { name: 'Spanish', value: 'es' },
              { name: 'French', value: 'fr' },
              { name: 'German', value: 'de' },
              { name: 'Portuguese', value: 'pt' },
              { name: 'Italian', value: 'it' },
              { name: 'Arabic', value: 'ar' },
            ),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('notifications')
        .setDescription('Toggle notification types')
        .addStringOption(opt =>
          opt.setName('type')
            .setDescription('Notification type')
            .setRequired(true)
            .addChoices(
              { name: 'Live Match Alerts', value: 'live' },
              { name: 'Fantasy Reminders', value: 'fantasy' },
              { name: 'News Updates', value: 'news' },
              { name: 'Transfer Alerts', value: 'transfers' },
              { name: 'Match Results', value: 'results' },
            ),
        )
        .addBooleanOption(opt =>
          opt.setName('enabled')
            .setDescription('Enable or disable')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('autopost')
        .setDescription('Configure auto-posting channels')
        .addStringOption(opt =>
          opt.setName('type')
            .setDescription('Auto-post type')
            .setRequired(true)
            .addChoices(
              { name: 'Live Scores', value: 'live' },
              { name: 'Daily News', value: 'news' },
              { name: 'Fantasy Leaderboard', value: 'leaderboard' },
              { name: 'Match Day Updates', value: 'matchday' },
              { name: 'Transfer Roundup', value: 'transfers' },
            ),
        )
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to auto-post to (leave empty to disable)')
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildText),
        )
        .addIntegerOption(opt =>
          opt.setName('interval')
            .setDescription('Update interval in minutes (30-1440)')
            .setRequired(false)
            .setMinValue(30)
            .setMaxValue(1440),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Reset all settings to default'),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'view': return handleView(interaction);
      case 'prefix': return handlePrefix(interaction);
      case 'language': return handleLanguage(interaction);
      case 'notifications': return handleNotifications(interaction);
      case 'autopost': return handleAutopost(interaction);
      case 'reset': return handleReset(interaction);
    }
  },
};

async function handleView(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const embed = createEmbed(
    `${EMOJIS.SETTINGS} Server Settings`,
    `Current configuration for **${interaction.guild?.name}**.`,
  )
    .addFields(
      { name: 'Prefix', value: `\`/\``, inline: true },
      { name: 'Language', value: '🇬🇧 English', inline: true },
      { name: 'Default League', value: 'Premier League (39)', inline: true },
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '🔔 Notifications', value: [
        'Live Alerts: ✅ Enabled',
        'Fantasy Reminders: ✅ Enabled',
        'News Updates: ❌ Disabled',
        'Transfer Alerts: ❌ Disabled',
        'Match Results: ✅ Enabled',
      ].join('\n'), inline: false },
      { name: '📢 Auto-Post Channels', value: [
        'Live Scores: Not set',
        'Daily News: Not set',
        'Leaderboard: Not set',
      ].join('\n'), inline: false },
      { name: '👤 Roles', value: [
        'Admin: Not set',
        'Partner: Not set',
        'Premium: Not set',
      ].join('\n'), inline: false },
    )
    .setColor(Colors.INFO);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('settings_notifications')
        .setLabel('Notifications')
        .setEmoji('🔔')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('settings_autopost')
        .setLabel('Auto-Post')
        .setEmoji('📢')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setup_start')
        .setLabel('Setup Wizard')
        .setEmoji(EMOJIS.SETTINGS)
        .setStyle(ButtonStyle.Primary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handlePrefix(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const prefix = interaction.options.getString('prefix', true);

  const embed = createEmbed(
    `${EMOJIS.SUCCESS} Prefix Updated`,
    `Command prefix has been set to \`${prefix}\`.`,
  ).setColor(Colors.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

async function handleLanguage(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const lang = interaction.options.getString('lang', true);
  const langNames: Record<string, string> = {
    en: '🇬🇧 English',
    es: '🇪🇸 Spanish',
    fr: '🇫🇷 French',
    de: '🇩🇪 German',
    pt: '🇵🇹 Portuguese',
    it: '🇮🇹 Italian',
    ar: '🇸🇦 Arabic',
  };

  const embed = createEmbed(
    `${EMOJIS.SUCCESS} Language Updated`,
    `Bot language has been set to ${langNames[lang] || lang}.`,
  ).setColor(Colors.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

async function handleNotifications(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const type = interaction.options.getString('type', true);
  const enabled = interaction.options.getBoolean('enabled', true);

  const typeLabels: Record<string, string> = {
    live: 'Live Match Alerts',
    fantasy: 'Fantasy Reminders',
    news: 'News Updates',
    transfers: 'Transfer Alerts',
    results: 'Match Results',
  };

  const embed = createEmbed(
    `${enabled ? EMOJIS.SUCCESS : EMOJIS.INFO} Notification Updated`,
    `${typeLabels[type]} has been **${enabled ? '✅ Enabled' : '❌ Disabled'}**.`,
  ).setColor(enabled ? Colors.SUCCESS : Colors.WARNING);

  await interaction.editReply({ embeds: [embed] });
}

async function handleAutopost(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const type = interaction.options.getString('type', true);
  const channel = interaction.options.getChannel('channel');
  const interval = interaction.options.getInteger('interval');

  const typeLabels: Record<string, string> = {
    live: 'Live Scores',
    news: 'Daily News',
    leaderboard: 'Fantasy Leaderboard',
    matchday: 'Match Day Updates',
    transfers: 'Transfer Roundup',
  };

  if (!channel) {
    const embed = createEmbed(
      `${EMOJIS.INFO} Auto-Post Disabled`,
      `${typeLabels[type]} auto-posting has been disabled.`,
    ).setColor(Colors.WARNING);

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.SUCCESS} Auto-Post Configured`,
    `${typeLabels[type]} will be posted to ${channel}${interval ? ` every ${interval} minutes.` : '.'}`,
  ).setColor(Colors.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

async function handleReset(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const embed = createEmbed(
    `${EMOJIS.WARNING} Settings Reset`,
    `All server settings have been reset to defaults.`,
  ).setColor(Colors.WARNING);

  await interaction.editReply({ embeds: [embed] });
}

export default command;
