import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed, createLoadingEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Set up GoalX in your server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('start')
        .setDescription('Start the interactive setup wizard'),
    )
    .addSubcommand(sub =>
      sub.setName('channel')
        .setDescription('Set a specific channel for GoalX features')
        .addStringOption(opt =>
          opt.setName('type')
            .setDescription('Channel type')
            .setRequired(true)
            .addChoices(
              { name: 'Live Scores', value: 'live' },
              { name: 'Match Updates', value: 'matches' },
              { name: 'Fantasy Updates', value: 'fantasy' },
              { name: 'News', value: 'news' },
              { name: 'Bot Logs', value: 'logs' },
              { name: 'Welcome', value: 'welcome' },
              { name: 'Announcements', value: 'announcements' },
            ),
        )
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('The channel to use')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('role')
        .setDescription('Set a role for GoalX features')
        .addStringOption(opt =>
          opt.setName('type')
            .setDescription('Role type')
            .setRequired(true)
            .addChoices(
              { name: 'Admin Role', value: 'admin' },
              { name: 'Partner Role', value: 'partner' },
              { name: 'Premium Role', value: 'premium' },
              { name: 'Verified Role', value: 'verified' },
            ),
        )
        .addRoleOption(opt =>
          opt.setName('role')
            .setDescription('The role to assign')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('league')
        .setDescription('Set default football league for this server')
        .addIntegerOption(opt =>
          opt.setName('league_id')
            .setDescription('League ID (default: 39 Premier League)')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('verify')
        .setDescription('Check your current server setup'),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'start': return handleStart(interaction);
      case 'channel': return handleChannel(interaction);
      case 'role': return handleRole(interaction);
      case 'league': return handleLeague(interaction);
      case 'verify': return handleVerify(interaction);
    }
  },
};

async function handleStart(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const embed = createEmbed(
    `${EMOJIS.SETTINGS} GoalX Setup Wizard`,
    `Welcome to GoalX! Let's get your server configured in a few steps.\n\nUse the buttons below to configure each feature. You can skip any step and configure it later.`,
  )
    .addFields(
      { name: 'Step 1: Channels', value: 'Set where live scores, match updates, fantasy, and news appear.', inline: false },
      { name: 'Step 2: Roles', value: 'Configure admin, partner, and premium roles.', inline: false },
      { name: 'Step 3: Default League', value: 'Choose your default football league for news and updates.', inline: false },
      { name: 'Step 4: Language', value: 'Set the bot language for this server.', inline: false },
    )
    .setColor(Colors.PRIMARY);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_channels')
        .setLabel('Step 1: Channels')
        .setEmoji('📢')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('setup_roles')
        .setLabel('Step 2: Roles')
        .setEmoji('👤')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('setup_league')
        .setLabel('Step 3: League')
        .setEmoji('⚽')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('setup_language')
        .setLabel('Step 4: Language')
        .setEmoji('🌐')
        .setStyle(ButtonStyle.Primary),
    );

  const doneRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_done')
        .setLabel('✅ Complete Setup')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('setup_skip')
        .setLabel('Skip')
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row, doneRow] });
}

async function handleChannel(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const channelType = interaction.options.getString('type', true);
  const channel = interaction.options.getChannel('channel', true);

  const channelLabels: Record<string, string> = {
    live: 'Live Scores',
    matches: 'Match Updates',
    fantasy: 'Fantasy Updates',
    news: 'News',
    logs: 'Bot Logs',
    welcome: 'Welcome',
    announcements: 'Announcements',
  };

  const embed = createEmbed(
    `${EMOJIS.SUCCESS} Channel Set!`,
    `${channelLabels[channelType]} channel has been set to ${channel}.`,
  ).setColor(Colors.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

async function handleRole(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const roleType = interaction.options.getString('type', true);
  const role = interaction.options.getRole('role', true);

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    partner: 'Partner',
    premium: 'Premium',
    verified: 'Verified',
  };

  const embed = createEmbed(
    `${EMOJIS.SUCCESS} Role Set!`,
    `${roleLabels[roleType]} role has been set to ${role}.`,
  ).setColor(Colors.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

async function handleLeague(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const leagueId = interaction.options.getInteger('league_id', true);

  const embed = createEmbed(
    `${EMOJIS.SUCCESS} Default League Set!`,
    `Default league has been set to ID **${leagueId}**.`,
  ).setColor(Colors.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

async function handleVerify(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const embed = createEmbed(
    `${EMOJIS.INFO} Server Setup Status`,
    `Current configuration for **${interaction.guild?.name}**.`,
  )
    .addFields(
      { name: 'Live Scores Channel', value: 'Not set 🔴', inline: true },
      { name: 'Match Updates', value: 'Not set 🔴', inline: true },
      { name: 'Fantasy Updates', value: 'Not set 🔴', inline: true },
      { name: 'News Channel', value: 'Not set 🔴', inline: true },
      { name: 'Admin Role', value: 'Not set 🔴', inline: true },
      { name: 'Partner Role', value: 'Not set 🔴', inline: true },
      { name: 'Default League', value: 'Premier League (39)', inline: true },
      { name: 'Language', value: 'English', inline: true },
    )
    .setColor(Colors.INFO);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('setup_start')
        .setLabel('Run Setup Wizard')
        .setEmoji(EMOJIS.SETTINGS)
        .setStyle(ButtonStyle.Primary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

export default command;
