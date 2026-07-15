import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('disable')
    .setDescription('Disable or enable specific bot features')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('command')
        .setDescription('Disable or enable a specific command')
        .addStringOption(opt =>
          opt.setName('command')
            .setDescription('Command name to toggle')
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addBooleanOption(opt =>
          opt.setName('disabled')
            .setDescription('True to disable, false to enable')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('category')
        .setDescription('Disable or enable an entire command category')
        .addStringOption(opt =>
          opt.setName('category')
            .setDescription('Category to toggle')
            .setRequired(true)
            .addChoices(
              { name: 'Fantasy', value: 'fantasy' },
              { name: 'Football', value: 'football' },
              { name: 'AI', value: 'ai' },
              { name: 'News', value: 'news' },
              { name: 'Challenge', value: 'challenge' },
              { name: 'Admin', value: 'admin' },
              { name: 'Partner', value: 'partner' },
              { name: 'Utility', value: 'utility' },
            ),
        )
        .addBooleanOption(opt =>
          opt.setName('disabled')
            .setDescription('True to disable, false to enable')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('feature')
        .setDescription('Disable or enable a major bot feature')
        .addStringOption(opt =>
          opt.setName('feature')
            .setDescription('Feature to toggle')
            .setRequired(true)
            .addChoices(
              { name: 'Fantasy Football System', value: 'fantasy' },
              { name: 'Live Scores', value: 'live_scores' },
              { name: 'AI Assistant', value: 'ai' },
              { name: 'News System', value: 'news' },
              { name: 'Partner System', value: 'partner' },
              { name: 'Challenge System', value: 'challenge' },
            ),
        )
        .addBooleanOption(opt =>
          opt.setName('disabled')
            .setDescription('True to disable, false to enable')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('View all disabled commands and features'),
    )
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Enable all disabled commands and features'),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'command': return handleCommand(interaction);
      case 'category': return handleCategory(interaction);
      case 'feature': return handleFeature(interaction);
      case 'list': return handleList(interaction);
      case 'reset': return handleReset(interaction);
    }
  },

  async autocomplete(interaction): Promise<void> {
    const focused = interaction.options.getFocused(true);
    const commands = [
      { name: 'ask', value: 'ask' },
      { name: 'analyze', value: 'analyze' },
      { name: 'predict', value: 'predict' },
      { name: 'summarize', value: 'summarize' },
      { name: 'compareplayers', value: 'compareplayers' },
      { name: 'live', value: 'live' },
      { name: 'match', value: 'match' },
      { name: 'fixtures', value: 'fixtures' },
      { name: 'results', value: 'results' },
      { name: 'standings', value: 'standings' },
      { name: 'team', value: 'team' },
      { name: 'player', value: 'player' },
      { name: 'lineup', value: 'lineup' },
      { name: 'stats', value: 'stats' },
      { name: 'topscorers', value: 'topscorers' },
      { name: 'transfers', value: 'transfers' },
      { name: 'compare', value: 'compare' },
      { name: 'news', value: 'news' },
      { name: 'breaking', value: 'breaking' },
      { name: 'newstransfers', value: 'newstransfers' },
      { name: 'create', value: 'create' },
      { name: 'team', value: 'team' },
      { name: 'transfer', value: 'transfer' },
      { name: 'captain', value: 'captain' },
      { name: 'points', value: 'points' },
      { name: 'leaderboard', value: 'leaderboard' },
      { name: 'league', value: 'league' },
      { name: 'profile', value: 'profile' },
      { name: 'history', value: 'history' },
      { name: 'scout', value: 'scout' },
      { name: 'recommend', value: 'recommend' },
      { name: 'tips', value: 'tips' },
      { name: 'challenge', value: 'challenge' },
      { name: 'accept', value: 'accept' },
      { name: 'kickoff', value: 'kickoff' },
      { name: 'matchup', value: 'matchup' },
    ];

    const filtered = commands.filter(c =>
      c.name.toLowerCase().includes(focused.value.toLowerCase()),
    );
    await interaction.respond(filtered.slice(0, 25));
  },
};

async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const cmdName = interaction.options.getString('command', true);
  const disabled = interaction.options.getBoolean('disabled', true);

  const embed = createEmbed(
    `${disabled ? EMOJIS.ERROR : EMOJIS.SUCCESS} Command ${disabled ? 'Disabled' : 'Enabled'}`,
    `The \`/${cmdName}\` command has been **${disabled ? 'disabled' : 'enabled'}** in this server.`,
  ).setColor(disabled ? Colors.ERROR : Colors.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

async function handleCategory(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const category = interaction.options.getString('category', true);
  const disabled = interaction.options.getBoolean('disabled', true);

  const categoryLabels: Record<string, string> = {
    fantasy: 'Fantasy',
    football: 'Football',
    ai: 'AI',
    news: 'News',
    challenge: 'Challenge',
    admin: 'Admin',
    partner: 'Partner',
    utility: 'Utility',
  };

  const embed = createEmbed(
    `${disabled ? EMOJIS.ERROR : EMOJIS.SUCCESS} ${categoryLabels[category]} ${disabled ? 'Disabled' : 'Enabled'}`,
    `All **${categoryLabels[category]}** commands have been **${disabled ? 'disabled' : 'enabled'}** in this server.`,
  ).setColor(disabled ? Colors.ERROR : Colors.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

async function handleFeature(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const feature = interaction.options.getString('feature', true);
  const disabled = interaction.options.getBoolean('disabled', true);

  const featureLabels: Record<string, string> = {
    fantasy: 'Fantasy Football System',
    live_scores: 'Live Scores',
    ai: 'AI Assistant',
    news: 'News System',
    partner: 'Partner System',
    challenge: 'Challenge System',
  };

  const embed = createEmbed(
    `${disabled ? EMOJIS.ERROR : EMOJIS.SUCCESS} Feature ${disabled ? 'Disabled' : 'Enabled'}`,
    `The **${featureLabels[feature]}** has been **${disabled ? 'disabled' : 'enabled'}** in this server.`,
  ).setColor(disabled ? Colors.ERROR : Colors.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const embed = createEmbed(
    `${EMOJIS.INFO} Disabled Features`,
    `Commands and features currently disabled in **${interaction.guild?.name}**.`,
  )
    .addFields(
      { name: 'Disabled Commands', value: 'None — all commands are active.', inline: false },
      { name: 'Disabled Categories', value: 'None — all categories are active.', inline: false },
      { name: 'Disabled Features', value: 'None — all features are active.', inline: false },
    )
    .setColor(Colors.INFO);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('disable_reset')
        .setLabel('Enable All')
        .setEmoji(EMOJIS.SUCCESS)
        .setStyle(ButtonStyle.Success),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleReset(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const embed = createEmbed(
    `${EMOJIS.SUCCESS} All Features Enabled`,
    `All disabled commands and features have been re-enabled in this server.`,
  ).setColor(Colors.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

export default command;
