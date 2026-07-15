import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import AIService from '../../services/ai/AIService';
import { Colors } from '../../config/colors';
import { EMOJIS, COOLDOWNS } from '../../config/constants';
import { createEmbed, createErrorEmbed, createLoadingEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('analyze')
    .setDescription('AI-powered analysis of matches, teams, or players')
    .addSubcommand(sub =>
      sub.setName('match')
        .setDescription('Analyze a specific match')
        .addStringOption(opt =>
          opt.setName('fixture_id')
            .setDescription('Fixture ID to analyze')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('team')
        .setDescription('Analyze a team\'s performance')
        .addStringOption(opt =>
          opt.setName('team')
            .setDescription('Team name')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('player')
        .setDescription('Analyze a player\'s form')
        .addStringOption(opt =>
          opt.setName('player')
            .setDescription('Player name')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('league')
        .setDescription('Analyze league trends')
        .addIntegerOption(opt =>
          opt.setName('league_id')
            .setDescription('League ID (default: 39)')
            .setRequired(false),
        ),
    ),

  cooldown: COOLDOWNS.AI_ANALYSIS,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'match': return handleMatch(interaction);
      case 'team': return handleTeam(interaction);
      case 'player': return handlePlayer(interaction);
      case 'league': return handleLeague(interaction);
    }
  },

  async autocomplete(interaction): Promise<void> {
    const focused = interaction.options.getFocused(true);
    const query = focused.value as string;
    const results = await AIService.searchAutocomplete(query);
    await interaction.respond(results.slice(0, 25));
  },
};

async function handleMatch(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const fixtureId = interaction.options.getString('fixture_id', true);
  await interaction.editReply({ embeds: [createLoadingEmbed(`${EMOJIS.AI} Analyzing match data...`)] });

  const result = await AIService.analyzeMatch(fixtureId);

  if (!result || !result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Analysis Failed', result?.error || 'Could not analyze match.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.AI} Match Analysis: ${result.match}`,
    `AI-powered tactical and statistical breakdown.`,
  )
    .setDescription(result.analysis.slice(0, 4000))
    .setColor(Colors.PRIMARY);

  embed.addFields(
    { name: 'Score Prediction', value: result.prediction || 'N/A', inline: true },
    { name: 'Confidence', value: `${(result.confidence * 100).toFixed(0)}%`, inline: true },
    { name: 'Key Factor', value: result.keyFactor || 'N/A', inline: true },
  );

  if (result.keyMoments && result.keyMoments.length > 0) {
    embed.addFields({ name: '⚡ Key Moments', value: result.keyMoments.join('\n'), inline: false });
  }

  if (result.verdict) {
    embed.addFields({ name: '📊 Verdict', value: result.verdict, inline: false });
  }

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`match_stats_${fixtureId}`)
        .setLabel('View Stats')
        .setEmoji(EMOJIS.CHART)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`analyze_refresh_${fixtureId}`)
        .setLabel('Re-analyze')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleTeam(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const teamName = interaction.options.getString('team', true);
  await interaction.editReply({ embeds: [createLoadingEmbed(`${EMOJIS.AI} Analyzing ${teamName}...`)] });

  const result = await AIService.analyzeTeam(teamName);

  if (!result || !result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Analysis Failed', result?.error || 'Could not analyze team.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.AI} Team Analysis: ${result.team}`,
    `Deep dive into performance, tactics, and form.`,
  )
    .setDescription(result.analysis.slice(0, 4000))
    .setColor(Colors.PRIMARY);

  embed.addFields(
    { name: 'Current Form', value: result.form || 'N/A', inline: true },
    { name: 'Strengths', value: result.strengths || 'N/A', inline: true },
    { name: 'Weaknesses', value: result.weaknesses || 'N/A', inline: true },
  );

  if (result.recommendation) {
    embed.addFields({ name: '💡 Recommendation', value: result.recommendation, inline: false });
  }

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`team_${result.teamId}`)
        .setLabel('View Team')
        .setEmoji(EMOJIS.INFO)
        .setStyle(ButtonStyle.Primary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handlePlayer(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const playerName = interaction.options.getString('player', true);
  await interaction.editReply({ embeds: [createLoadingEmbed(`${EMOJIS.AI} Analyzing ${playerName}...`)] });

  const result = await AIService.analyzePlayer(playerName);

  if (!result || !result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Analysis Failed', result?.error || 'Could not analyze player.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.AI} Player Analysis: ${result.player}`,
    `Performance analysis, comparisons, and projections.`,
  )
    .setDescription(result.analysis.slice(0, 4000))
    .setColor(Colors.PRIMARY);

  embed.addFields(
    { name: 'Rating', value: `${result.rating || 'N/A'}/10`, inline: true },
    { name: 'Form Trend', value: result.formTrend || 'N/A', inline: true },
    { name: 'Comparison', value: result.comparison || 'N/A', inline: true },
    { name: 'Fantasy Value', value: result.fantasyValue || 'N/A', inline: true },
  );

  if (result.prediction) {
    embed.addFields({ name: '🔮 Next GW Prediction', value: result.prediction, inline: false });
  }

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`player_${result.playerId}`)
        .setLabel('View Player')
        .setEmoji(EMOJIS.INFO)
        .setStyle(ButtonStyle.Primary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleLeague(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const leagueId = interaction.options.getInteger('league_id') || 39;
  await interaction.editReply({ embeds: [createLoadingEmbed(`${EMOJIS.AI} Analyzing league trends...`)] });

  const result = await AIService.analyzeLeague(leagueId);

  if (!result || !result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Analysis Failed', result?.error || 'Could not analyze league.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.AI} League Analysis: ${result.league}`,
    `Trends, storylines, and statistical insights.`,
  )
    .setDescription(result.analysis.slice(0, 4000))
    .setColor(Colors.PRIMARY);

  embed.addFields(
    { name: 'Most Exciting Team', value: result.mostExciting || 'N/A', inline: true },
    { name: 'Surprise Package', value: result.surprise || 'N/A', inline: true },
    { name: 'Title Race', value: result.titleRace || 'N/A', inline: true },
  );

  if (result.keyStorylines && result.keyStorylines.length > 0) {
    embed.addFields({ name: '📖 Key Storylines', value: result.keyStorylines.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n'), inline: false });
  }

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`standings_${leagueId}`)
        .setLabel('View Standings')
        .setEmoji(EMOJIS.CHART)
        .setStyle(ButtonStyle.Primary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

export default command;
