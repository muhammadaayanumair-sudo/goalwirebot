import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import AIService from '../../services/ai/AIService';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed, createLoadingEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('tips')
    .setDescription('Fantasy football tips and advice')
    .addSubcommand(sub =>
      sub.setName('daily')
        .setDescription('Daily fantasy tip from AI'),
    )
    .addSubcommand(sub =>
      sub.setName('gameweek')
        .setDescription('Gameweek strategy tips'),
    )
    .addSubcommand(sub =>
      sub.setName('chip')
        .setDescription('When to use your chips'),
    )
    .addSubcommand(sub =>
      sub.setName('strategy')
        .setDescription('General fantasy strategies'),
    )
    .addSubcommand(sub =>
      sub.setName('mistakes')
        .setDescription('Common mistakes to avoid'),
    ),

  cooldown: 30,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'daily': return handleDaily(interaction);
      case 'gameweek': return handleGameweek(interaction);
      case 'chip': return handleChip(interaction);
      case 'strategy': return handleStrategy(interaction);
      case 'mistakes': return handleMistakes(interaction);
    }
  },
};

async function handleDaily(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  await interaction.editReply({ embeds: [createLoadingEmbed('AI is crafting your daily tip...')] });

  const tip = await AIService.generateFantasyTip('daily');

  const embed = createEmbed(
    `${EMOJIS.AI} Daily Fantasy Tip`,
    `AI-powered advice to improve your team.`,
  )
    .setDescription(tip.content.slice(0, 4000))
    .setColor(Colors.PRIMARY);

  if (tip.tags && tip.tags.length > 0) {
    embed.addFields({ name: 'Tags', value: tip.tags.map(t => `\`${t}\``).join(', '), inline: false });
  }

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('tips_daily_refresh')
        .setLabel('New Tip')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('tips_save')
        .setLabel('Save')
        .setEmoji('💾')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('tips_share')
        .setLabel('Share')
        .setEmoji('📤')
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleGameweek(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  await interaction.editReply({ embeds: [createLoadingEmbed('Analyzing upcoming gameweek...')] });

  const tips = await AIService.generateFantasyTip('gameweek');

  const embed = createEmbed(
    `${EMOJIS.CALENDAR} Gameweek Strategy Tips`,
    `Optimize your team for the upcoming gameweek.`,
  )
    .setDescription(tips.content.slice(0, 4000))
    .setColor(Colors.INFO);

  embed.addFields(
    { name: 'Pro Tip', value: 'Check fixtures and form before making transfers. Target players from teams with easy fixtures.', inline: false },
    { name: 'Key Areas', value: '• Captain pick is crucial\n• Check team news for injuries\n• Plan transfers ahead\n• Monitor press conferences', inline: false },
  );

  await interaction.editReply({ embeds: [embed] });
}

async function handleChip(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const embed = createEmbed(
    `${EMOJIS.FIRE} Chip Strategy Guide`,
    `When to use each chip for maximum impact.`,
  ).setColor(Colors.GOLD);

  embed.addFields(
    {
      name: `${EMOJIS.CAPTAIN} Triple Captain`,
      value: 'Best used on a player with:\n• Double gameweek\n• Easy fixture at home\n• In-form player\n• Penalty taker\n\nExample: Salah vs bottom-half team at Anfield.',
      inline: false,
    },
    {
      name: `${EMOJIS.TRANSFER} Wildcard`,
      value: 'Best used when:\n• Major price changes\n• Fixing multiple team issues\n• Before a double gameweek\n• After a bad run\n\nTip: Use early in season to build value.',
      inline: false,
    },
    {
      name: '🆓 Free Hit',
      value: 'Best used for:\n• Blank gameweeks\n• Double gameweeks\n• When many players have tough fixtures\n\nTip: Save for BGW/DGW weeks.',
      inline: false,
    },
    {
      name: '🧤 Bench Boost',
      value: 'Best used when:\n• All 15 players have good fixtures\n• Double gameweek for bench players\n• No injuries in squad\n\nTip: Pair with wildcard for max value.',
      inline: false,
    },
  );

  embed.addFields({
    name: '📅 Recommended GWs',
    value: '• Wildcard: GW6-8 (after intl break)\n• Triple Captain: DGW\n• Free Hit: BGW\n• Bench Boost: DGW with full squad',
    inline: false,
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleStrategy(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const embed = createEmbed(
    `${EMOJIS.TROPHY} Fantasy Strategy Guide`,
    `Proven strategies for long-term success.`,
  ).setColor(Colors.PRIMARY);

  embed.addFields(
    {
      name: '1. Team Value',
      value: '• Focus on early price rises\n• Buy players before price changes\n• Avoid too many transfers\n• Target players with rising ownership\n• Long-term value beats short-term gains',
      inline: false,
    },
    {
      name: '2. Formation Strategy',
      value: '• 3-4-3 for attacking focus\n• 4-4-2 for balanced approach\n• 5-3-2 for clean sheets\n• 4-3-3 is most flexible\n\nTip: Adapt formation to fixture difficulty.',
      inline: false,
    },
    {
      name: '3. Captain Strategy',
      value: '• Premium captains for safety\n• Differential captains for rank gain\n• Check captain poll %\n• Consider vice-captain carefully\n• Triple captain on DGW only',
      inline: false,
    },
    {
      name: '4. Transfer Strategy',
      value: '• Save transfers when possible\n• Plan 2-3 GWs ahead\n• Avoid -4 hits for sideways moves\n• Free transfers are gold\n• Use wildcard to fix multiple issues',
      inline: false,
    },
    {
      name: '5. Defense Strategy',
      value: '• Premium defenders are worth it\n• Target attacking fullbacks\n• Rotate based on fixtures\n• 3 good defenders + 2 cheap\n• Clean sheets win leagues',
      inline: false,
    },
  );

  await interaction.editReply({ embeds: [embed] });
}

async function handleMistakes(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const embed = createEmbed(
    `${EMOJIS.WARNING} Common Mistakes to Avoid`,
    `Don't let these errors ruin your season.`,
  ).setColor(Colors.ERROR);

  embed.addFields(
    {
      name: '❌ Taking Too Many Hits',
      value: 'Points hits add up fast. A -12 hit needs 12 points just to break even. Be patient and use free transfers.',
      inline: false,
    },
    {
      name: '❌ Chasing Last GW Points',
      value: 'Past performance doesn\'t guarantee future returns. Look at fixtures, form trends, and underlying stats.',
      inline: false,
    },
    {
      name: '❌ Ignoring Team News',
      value: 'Always check press conferences and injury updates before deadline. A late scratch can ruin your GW.',
      inline: false,
    },
    {
      name: '❌ Overloading One Team',
      value: `Max 3 per club for a reason. If that team has a bad week, your whole GW is ruined. Diversify.`,
      inline: false,
    },
    {
      name: '❌ Emotional Transfers',
      value: 'Don\'t transfer out a player right after one bad GW. Give them time. Rash decisions cost points and value.',
      inline: false,
    },
    {
      name: '❌ Forgetting Deadlines',
      value: 'Set reminders for GW deadlines. Missing a deadline means no changes and potential auto-subs issues.',
      inline: false,
    },
  );

  embed.addFields({
    name: '💡 Golden Rule',
    value: 'Patience wins fantasy leagues. Stick to your strategy, trust the process, and don\'t overreact.',
    inline: false,
  });

  await interaction.editReply({ embeds: [embed] });
}

export default command;
