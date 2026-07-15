import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import AIService from '../../services/ai/AIService';
import { Colors } from '../../config/colors';
import { EMOJIS, COOLDOWNS } from '../../config/constants';
import { createEmbed, createErrorEmbed, createLoadingEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('predict')
    .setDescription('AI match predictions and forecasts')
    .addSubcommand(sub =>
      sub.setName('match')
        .setDescription('Predict match outcome')
        .addStringOption(opt =>
          opt.setName('fixture_id')
            .setDescription('Fixture ID')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('gameweek')
        .setDescription('Predict all matches this gameweek')
        .addIntegerOption(opt =>
          opt.setName('league_id')
            .setDescription('League ID')
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('score')
        .setDescription('Predict exact score for a match')
        .addStringOption(opt =>
          opt.setName('home')
            .setDescription('Home team')
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption(opt =>
          opt.setName('away')
            .setDescription('Away team')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('topscorer')
        .setDescription('Predict top scorer of the season'),
    )
    .addSubcommand(sub =>
      sub.setName('winner')
        .setDescription('Predict league winner')
        .addIntegerOption(opt =>
          opt.setName('league_id')
            .setDescription('League ID')
            .setRequired(false),
        ),
    ),

  cooldown: COOLDOWNS.PREDICT,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'match': return handleMatch(interaction);
      case 'gameweek': return handleGameweek(interaction);
      case 'score': return handleScore(interaction);
      case 'topscorer': return handleTopScorer(interaction);
      case 'winner': return handleWinner(interaction);
    }
  },

  async autocomplete(interaction): Promise<void> {
    const focused = interaction.options.getFocused(true);
    const results = await AIService.searchTeamsAutocomplete(focused.value as string);
    await interaction.respond(
      results.slice(0, 25).map(r => ({ name: r.name, value: r.name })),
    );
  },
};

async function handleMatch(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const fixtureId = interaction.options.getString('fixture_id', true);
  await interaction.editReply({ embeds: [createLoadingEmbed(`${EMOJIS.AI} Analyzing match data for prediction...`)] });

  const result = await AIService.predictMatch(fixtureId);

  if (!result || !result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Prediction Failed', result?.error || 'Could not generate prediction.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.AI} Match Prediction: ${result.homeTeam} vs ${result.awayTeam}`,
    `AI-powered outcome prediction based on form, stats, and historical data.`,
  ).setColor(Colors.PRIMARY);

  embed.addFields(
    { name: `${result.homeTeam} Win`, value: `${(result.homeWinProb * 100).toFixed(1)}%`, inline: true },
    { name: 'Draw', value: `${(result.drawProb * 100).toFixed(1)}%`, inline: true },
    { name: `${result.awayTeam} Win`, value: `${(result.awayWinProb * 100).toFixed(1)}%`, inline: true },
  );

  if (result.predictedScore) {
    embed.addFields({ name: 'Predicted Score', value: `**${result.predictedScore}**`, inline: false });
  }

  if (result.reasoning) {
    embed.addFields({ name: '📊 Reasoning', value: result.reasoning.slice(0, 1024), inline: false });
  }

  if (result.keyFactors && result.keyFactors.length > 0) {
    embed.addFields({ name: '🔑 Key Factors', value: result.keyFactors.map(f => `• ${f}`).join('\n'), inline: false });
  }

  const bar = createPredictionBar(result.homeWinProb, result.drawProb, result.awayWinProb);
  embed.addFields({ name: '📈 Probability Distribution', value: bar, inline: false });

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`predict_refresh_${fixtureId}`)
        .setLabel('Re-predict')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`match_${fixtureId}`)
        .setLabel('Match Details')
        .setEmoji(EMOJIS.INFO)
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleGameweek(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const leagueId = interaction.options.getInteger('league_id') || 39;
  await interaction.editReply({ embeds: [createLoadingEmbed(`${EMOJIS.AI} Predicting gameweek outcomes...`)] });

  const result = await AIService.predictGameweek(leagueId);

  if (!result || !result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Prediction Failed', result?.error || 'Could not predict gameweek.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.AI} ${result.league} — GW${result.gameweek} Predictions`,
    `AI predictions for all matches this gameweek.`,
  ).setColor(Colors.PRIMARY);

  const entries = result.predictions.map((p: any, i: number) =>
    `**${i + 1}.** ${p.homeTeam} vs ${p.awayTeam} → **${p.prediction}** (${(p.confidence * 100).toFixed(0)}%)`,
  );

  embed.setDescription(entries.join('\n'));

  if (result.bestBet) {
    embed.addFields({ name: '💰 Best Bet', value: `${result.bestBet.match} — ${result.bestBet.prediction} (${(result.bestBet.confidence * 100).toFixed(0)}%)`, inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleScore(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const home = interaction.options.getString('home', true);
  const away = interaction.options.getString('away', true);
  await interaction.editReply({ embeds: [createLoadingEmbed(`${EMOJIS.AI} Predicting exact score...`)] });

  const result = await AIService.predictExactScore(home, away);

  if (!result || !result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Prediction Failed', result?.error || 'Could not predict score.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.AI} Score Prediction: ${home} vs ${away}`,
    `AI predicts the exact scoreline.`,
  )
    .addFields(
      { name: 'Predicted Score', value: `**${result.predictedScore}**`, inline: false },
      { name: 'Confidence', value: `${(result.confidence * 100).toFixed(0)}%`, inline: true },
      { name: 'Both Teams to Score', value: result.btts ? '✅ Yes' : '❌ No', inline: true },
      { name: 'Over/Under 2.5', value: result.overUnder, inline: true },
    )
    .setColor(Colors.PRIMARY);

  if (result.reasoning) {
    embed.addFields({ name: '📊 Reasoning', value: result.reasoning.slice(0, 1024), inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleTopScorer(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  await interaction.editReply({ embeds: [createLoadingEmbed(`${EMOJIS.AI} Predicting the top scorer race...`)] });

  const result = await AIService.predictTopScorer();

  if (!result || !result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Prediction Failed', result?.error || 'Could not predict top scorer.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.GOAL} AI Top Scorer Prediction`,
    `Predicting the Golden Boot race across top leagues.`,
  ).setColor(Colors.GOLD);

  const entries = result.predictions.map((p: any, i: number) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    return `${medal} **${p.name}** — ${p.team} | Predicted: **${p.predictedGoals} goals** | Current: ${p.currentGoals} | Confidence: ${(p.confidence * 100).toFixed(0)}%`;
  });

  embed.setDescription(entries.join('\n'));

  if (result.reasoning) {
    embed.addFields({ name: '📊 Analysis', value: result.reasoning.slice(0, 1024), inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleWinner(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const leagueId = interaction.options.getInteger('league_id') || 39;
  await interaction.editReply({ embeds: [createLoadingEmbed(`${EMOJIS.AI} Predicting league winner...`)] });

  const result = await AIService.predictLeagueWinner(leagueId);

  if (!result || !result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Prediction Failed', result?.error || 'Could not predict winner.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.TROPHY} ${result.league} — Winner Prediction`,
    `AI predicts the champion.`,
  ).setColor(Colors.GOLD);

  const entries = result.predictions.map((p: any, i: number) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    return `${medal} **${p.team}** — ${p.predictedPoints}pts | ${(p.winProb * 100).toFixed(1)}% chance`;
  });

  embed.setDescription(entries.join('\n'));

  if (result.reasoning) {
    embed.addFields({ name: '📊 Reasoning', value: result.reasoning.slice(0, 1024), inline: false });
  }

  embed.addFields({ name: '📈 Predicted Final Table', value: `1st: ${result.predictions[0]?.team || 'N/A'} — ${result.predictions[0]?.predictedPoints || '?'}pts\nLast: ${result.predictions[result.predictions.length - 1]?.team || 'N/A'} — ${result.predictions[result.predictions.length - 1]?.predictedPoints || '?'}pts`, inline: false });

  await interaction.editReply({ embeds: [embed] });
}

function createPredictionBar(home: number, draw: number, away: number): string {
  const totalBars = 20;
  const homeBars = Math.round(home * totalBars);
  const drawBars = Math.round(draw * totalBars);
  const awayBars = totalBars - homeBars - drawBars;
  return `🏠 ${'🟢'.repeat(homeBars)}${'⚪'.repeat(Math.max(0, totalBars - homeBars))}\n➖ ${'🟡'.repeat(drawBars)}${'⚪'.repeat(Math.max(0, totalBars - drawBars))}\n✈️ ${'🔴'.repeat(awayBars)}${'⚪'.repeat(Math.max(0, totalBars - awayBars))}`;
}

export default command;
