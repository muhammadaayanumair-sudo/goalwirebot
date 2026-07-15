import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import { Colors } from '../../config/colors';
import { EMOJIS, BOT_NAME, BOT_VERSION } from '../../config/constants';
import { createEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get help with GoalX bot commands')
    .addStringOption(opt =>
      opt.setName('command')
        .setDescription('Specific command to get help for')
        .setRequired(false)
        .setAutocomplete(true),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const cmdName = interaction.options.getString('command');

    if (cmdName) {
      return handleCommandHelp(interaction, cmdName);
    }

    const embed = createEmbed(
      `${EMOJIS.INFO} ${BOT_NAME} v${BOT_VERSION} — Help`,
      `Your Ultimate Fantasy Football Discord Bot\n\nSelect a category below to view commands, or type \`/help <command>\` for specific command help.`,
    )
      .addFields(
        { name: `${EMOJIS.TROPHY} Fantasy`, value: 'Team management, transfers, leagues, challenges', inline: true },
        { name: `${EMOJIS.GOAL} Football`, value: 'Live scores, matches, standings, stats', inline: true },
        { name: `${EMOJIS.AI} AI Assistant`, value: 'Ask, analyze, predict, compare', inline: true },
        { name: `${EMOJIS.NEWS} News`, value: 'Football news, transfers, breaking', inline: true },
        { name: `${EMOJIS.CROWN} Partner`, value: 'Partner status, features, benefits', inline: true },
        { name: `${EMOJIS.SETTINGS} Admin`, value: 'Setup, settings, announcements', inline: true },
      )
      .setColor(Colors.PRIMARY);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Choose a category')
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel('Fantasy').setValue('fantasy').setDescription('Fantasy football commands').setEmoji(EMOJIS.TROPHY),
        new StringSelectMenuOptionBuilder().setLabel('Football').setValue('football').setDescription('Live football commands').setEmoji(EMOJIS.GOAL),
        new StringSelectMenuOptionBuilder().setLabel('AI').setValue('ai').setDescription('AI assistant commands').setEmoji(EMOJIS.AI),
        new StringSelectMenuOptionBuilder().setLabel('News').setValue('news').setDescription('News commands').setEmoji(EMOJIS.NEWS),
        new StringSelectMenuOptionBuilder().setLabel('Challenge').setValue('challenge').setDescription('Challenge commands').setEmoji(EMOJIS.CROWN),
        new StringSelectMenuOptionBuilder().setLabel('Partner').setValue('partner').setDescription('Partner commands').setEmoji(EMOJIS.CROWN),
        new StringSelectMenuOptionBuilder().setLabel('Admin').setValue('admin').setDescription('Admin commands').setEmoji(EMOJIS.SETTINGS),
        new StringSelectMenuOptionBuilder().setLabel('Utility').setValue('utility').setDescription('Utility commands').setEmoji('🔧'),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.editReply({ embeds: [embed], components: [row] });
  },

  async autocomplete(interaction): Promise<void> {
    const focused = interaction.options.getFocused(true);
    const commands = [
      'ask', 'analyze', 'predict', 'summarize', 'compareplayers',
      'live', 'match', 'fixtures', 'results', 'standings',
      'team', 'player', 'lineup', 'stats', 'topscorers', 'transfers', 'compare',
      'news', 'breaking', 'newstransfers',
      'create', 'team', 'transfer', 'captain', 'points',
      'leaderboard', 'league', 'profile', 'history', 'scout', 'recommend', 'tips',
      'challenge', 'accept', 'kickoff', 'matchup',
      'setup', 'settings', 'announcement', 'setfantasy', 'resetfantasy', 'lockfantasy', 'disable',
      'status', 'activate', 'features', 'feedback',
      'help', 'ping', 'invite', 'support',
    ];
    const filtered = commands.filter(c => c.includes(focused.value.toLowerCase()));
    await interaction.respond(filtered.slice(0, 25).map(c => ({ name: c, value: c })));
  },
};

async function handleCommandHelp(interaction: ChatInputCommandInteraction, cmdName: string): Promise<void> {
  const embed = createEmbed(
    `${EMOJIS.INFO} Help: /${cmdName}`,
    `Detailed information about the \`/${cmdName}\` command.`,
  )
    .addFields(
      { name: 'Description', value: 'View detailed command information and usage.', inline: false },
      { name: 'Usage', value: `\`/${cmdName} [options]\``, inline: false },
      { name: 'Examples', value: `\`/${cmdName}\`\n\`/${cmdName} [option]\``, inline: false },
    )
    .setColor(Colors.INFO)
    .setFooter({ text: 'Use /help to browse all commands' });

  await interaction.editReply({ embeds: [embed] });
}

export default command;
