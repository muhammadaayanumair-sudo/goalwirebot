import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('features')
    .setDescription('Browse all bot features and commands')
    .addSubcommand(sub =>
      sub.setName('all')
        .setDescription('View all available features'),
    )
    .addSubcommand(sub =>
      sub.setName('fantasy')
        .setDescription('Fantasy football features'),
    )
    .addSubcommand(sub =>
      sub.setName('football')
        .setDescription('Live football features'),
    )
    .addSubcommand(sub =>
      sub.setName('ai')
        .setDescription('AI assistant features'),
    )
    .addSubcommand(sub =>
      sub.setName('partner')
        .setDescription('Partner-exclusive features'),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'all': return handleAll(interaction);
      case 'fantasy': return handleFantasy(interaction);
      case 'football': return handleFootball(interaction);
      case 'ai': return handleAI(interaction);
      case 'partner': return handlePartner(interaction);
    }
  },
};

async function handleAll(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const embed = createEmbed(
    `${EMOJIS.STAR} GoalX Features`,
    `Your ultimate fantasy football companion bot.`,
  )
    .addFields(
      { name: `${EMOJIS.TROPHY} Fantasy Football`, value: 'Create teams, set lineups, make transfers, join leagues, and compete with friends.', inline: false },
      { name: `${EMOJIS.GOAL} Live Football`, value: 'Live scores, match stats, standings, fixtures, team info, and player profiles.', inline: false },
      { name: `${EMOJIS.AI} AI Assistant`, value: 'Ask football questions, get match predictions, AI analysis, and fantasy tips.', inline: false },
      { name: `${EMOJIS.NEWS} Football News`, value: 'Latest headlines, breaking news, transfer rumours, and injury updates.', inline: false },
      { name: `${EMOJIS.CROWN} Partner Program`, value: 'Early access to beta features, advanced AI, exclusive badges, and priority support.', inline: false },
    )
    .setColor(Colors.PRIMARY);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('features_menu')
        .setPlaceholder('Explore a category')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel('Fantasy').setValue('fantasy').setDescription('Fantasy football commands').setEmoji(EMOJIS.TROPHY),
          new StringSelectMenuOptionBuilder().setLabel('Football').setValue('football').setDescription('Live football commands').setEmoji(EMOJIS.GOAL),
          new StringSelectMenuOptionBuilder().setLabel('AI').setValue('ai').setDescription('AI assistant commands').setEmoji(EMOJIS.AI),
          new StringSelectMenuOptionBuilder().setLabel('News').setValue('news').setDescription('News commands').setEmoji(EMOJIS.NEWS),
          new StringSelectMenuOptionBuilder().setLabel('Partner').setValue('partner').setDescription('Partner features').setEmoji(EMOJIS.CROWN),
        ),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleFantasy(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const embed = createEmbed(
    `${EMOJIS.TROPHY} Fantasy Football Features`,
    `Complete fantasy football management system.`,
  )
    .addFields(
      { name: 'Team Management', value: '`/create`, `/team`, `/lineup`, `/captain`, `/transfer`', inline: false },
      { name: 'Points & Rankings', value: '`/points`, `/leaderboard`, `/history`, `/profile`', inline: false },
      { name: 'Scouting & AI', value: '`/scout`, `/recommend`, `/tips`', inline: false },
      { name: 'Leagues', value: '`/league create`, `/league join`, `/league info`', inline: false },
      { name: 'Challenges', value: '`/challenge send`, `/accept`, `/matchup`, `/kickoff`', inline: false },
      { name: 'Partner Exclusive', value: 'Advanced AI Scout, beta features, early commands', inline: false },
    )
    .setColor(Colors.PRIMARY);

  await interaction.editReply({ embeds: [embed] });
}

async function handleFootball(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const embed = createEmbed(
    `${EMOJIS.GOAL} Live Football Features`,
    `Real-time football data and statistics.`,
  )
    .addFields(
      { name: 'Live Scores', value: '`/live now`, `/live today`, `/live league`', inline: false },
      { name: 'Matches', value: '`/match`, `/fixtures`, `/results`, `/lineup`', inline: false },
      { name: 'Standings', value: '`/standings league`, `/standings top4`, `/standings form`', inline: false },
      { name: 'Teams & Players', value: '`/team info`, `/team squad`, `/player`, `/compare`', inline: false },
      { name: 'Statistics', value: '`/stats match`, `/stats league`, `/topscorers`', inline: false },
      { name: 'Transfers', value: '`/transfers recent`, `/transfers rumours`, `/transfers team`', inline: false },
    )
    .setColor(Colors.PRIMARY);

  await interaction.editReply({ embeds: [embed] });
}

async function handleAI(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const embed = createEmbed(
    `${EMOJIS.AI} AI Assistant Features`,
    `Powered by Gemini, Groq, and Mistral AI.`,
  )
    .addFields(
      { name: 'Ask Questions', value: '`/ask` — Any football question answered by AI.', inline: false },
      { name: 'Deep Analysis', value: '`/analyze match`, `/analyze team`, `/analyze player`', inline: false },
      { name: 'Predictions', value: '`/predict match`, `/predict gameweek`, `/predict winner`', inline: false },
      { name: 'Summaries', value: '`/summarize match`, `/summarize gameweek`, `/summarize season`', inline: false },
      { name: 'Comparisons', value: '`/compareplayers` — Detailed AI player comparison.', inline: false },
    )
    .setColor(Colors.PRIMARY);

  await interaction.editReply({ embeds: [embed] });
}

async function handlePartner(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const embed = createEmbed(
    `${EMOJIS.CROWN} Partner-Exclusive Features`,
    `Unlock the full potential of GoalX.`,
  )
    .addFields(
      { name: '🔬 Beta Features', value: 'Test new fantasy features and commands before anyone else.', inline: false },
      { name: '🤖 Advanced AI Scout', value: 'Get deeper AI analysis for fantasy recommendations.', inline: false },
      { name: '⚡ Early Access', value: 'Use new commands up to 2 weeks before public release.', inline: false },
      { name: '🏅 Exclusive Badge', value: 'Display a unique partner badge on your profile.', inline: false },
      { name: '🎯 Priority Support', value: 'Get faster responses from the GoalX team.', inline: false },
      { name: '📊 Analytics', value: 'Access detailed server and fantasy analytics.', inline: false },
    )
    .setColor(Colors.GOLD);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('partner_apply')
        .setLabel('Become a Partner')
        .setEmoji(EMOJIS.CROWN)
        .setStyle(ButtonStyle.Primary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

export default command;
