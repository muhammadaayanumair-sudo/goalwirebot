import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import AIService from '../../services/ai/AIService';
import { Colors } from '../../config/colors';
import { EMOJIS, COOLDOWNS } from '../../config/constants';
import { createEmbed, createErrorEmbed, createLoadingEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('summarize')
    .setDescription('AI-powered football summaries and recaps')
    .addSubcommand(sub =>
      sub.setName('match')
        .setDescription('Summarize a completed match')
        .addStringOption(opt =>
          opt.setName('fixture_id')
            .setDescription('Fixture ID')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('gameweek')
        .setDescription('Summarize an entire gameweek')
        .addIntegerOption(opt =>
          opt.setName('league_id')
            .setDescription('League ID (default: 39)')
            .setRequired(false),
        )
        .addIntegerOption(opt =>
          opt.setName('gameweek')
            .setDescription('Gameweek number')
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('transferwindow')
        .setDescription('Summarize transfer window activity'),
    )
    .addSubcommand(sub =>
      sub.setName('season')
        .setDescription('Season recap summary')
        .addIntegerOption(opt =>
          opt.setName('league_id')
            .setDescription('League ID')
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('day')
        .setDescription('Today\'s football summary'),
    ),

  cooldown: COOLDOWNS.AI_ANALYSIS,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'match': return handleMatch(interaction);
      case 'gameweek': return handleGameweek(interaction);
      case 'transferwindow': return handleTransferWindow(interaction);
      case 'season': return handleSeason(interaction);
      case 'day': return handleDay(interaction);
    }
  },
};

async function handleMatch(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const fixtureId = interaction.options.getString('fixture_id', true);
  await interaction.editReply({ embeds: [createLoadingEmbed(`${EMOJIS.AI} Summarizing match...`)] });

  const result = await AIService.summarizeMatch(fixtureId);

  if (!result || !result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Summary Failed', result?.error || 'Could not generate summary.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.NEWS} Match Summary: ${result.match}`,
    `AI-generated recap of the action.`,
  )
    .setDescription(result.summary.slice(0, 4000))
    .setColor(Colors.PRIMARY);

  embed.addFields(
    { name: 'Final Score', value: `**${result.score}**`, inline: true },
    { name: 'Key Moment', value: result.keyMoment || 'N/A', inline: true },
    { name: 'Star Player', value: result.starPlayer || 'N/A', inline: true },
  );

  if (result.highlights && result.highlights.length > 0) {
    embed.addFields({ name: '⚡ Highlights', value: result.highlights.map(h => `• ${h}`).join('\n'), inline: false });
  }

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`match_stats_${fixtureId}`)
        .setLabel('Full Stats')
        .setEmoji(EMOJIS.CHART)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`summarize_share`)
        .setLabel('Share')
        .setEmoji('📤')
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleGameweek(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const leagueId = interaction.options.getInteger('league_id') || 39;
  const gameweek = interaction.options.getInteger('gameweek');
  await interaction.editReply({ embeds: [createLoadingEmbed(`${EMOJIS.AI} Summarizing gameweek...`)] });

  const result = await AIService.summarizeGameweek(leagueId, gameweek);

  if (!result || !result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Summary Failed', result?.error || 'Could not summarize gameweek.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.NEWS} ${result.league} — GW${result.gameweek} Summary`,
    `AI recap of the gameweek's action.`,
  )
    .setDescription(result.summary.slice(0, 4000))
    .setColor(Colors.PRIMARY);

  embed.addFields(
    { name: 'Match of the Week', value: result.matchOfTheWeek || 'N/A', inline: false },
    { name: 'Top Performer', value: result.topPerformer || 'N/A', inline: true },
    { name: 'Biggest Upset', value: result.biggestUpset || 'N/A', inline: true },
    { name: 'Total Goals', value: `${result.totalGoals || 0}`, inline: true },
  );

  if (result.keyMoments && result.keyMoments.length > 0) {
    embed.addFields({ name: '📋 Key Moments', value: result.keyMoments.slice(0, 5).map(m => `• ${m}`).join('\n'), inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleTransferWindow(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  await interaction.editReply({ embeds: [createLoadingEmbed(`${EMOJIS.AI} Summarizing transfer window...`)] });

  const result = await AIService.summarizeTransferWindow();

  if (!result || !result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Summary Failed', result?.error || 'Could not summarize transfers.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.TRANSFER} Transfer Window Summary`,
    `AI analysis of the latest transfer window activity.`,
  )
    .setDescription(result.summary.slice(0, 4000))
    .setColor(Colors.PRIMARY);

  embed.addFields(
    { name: 'Biggest Deal', value: result.biggestDeal || 'N/A', inline: true },
    { name: 'Biggest Spenders', value: result.biggestSpenders || 'N/A', inline: true },
    { name: 'Total Spent', value: result.totalSpent || 'N/A', inline: true },
    { name: 'Surprise Move', value: result.surpriseMove || 'N/A', inline: true },
  );

  if (result.bestSignings && result.bestSignings.length > 0) {
    embed.addFields({ name: '⭐ Best Signings', value: result.bestSignings.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n'), inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleSeason(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const leagueId = interaction.options.getInteger('league_id') || 39;
  await interaction.editReply({ embeds: [createLoadingEmbed(`${EMOJIS.AI} Summarizing season...`)] });

  const result = await AIService.summarizeSeason(leagueId);

  if (!result || !result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Summary Failed', result?.error || 'Could not summarize season.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.TROPHY} ${result.league} — Season Summary`,
    `AI-powered season recap.`,
  )
    .setDescription(result.summary.slice(0, 4000))
    .setColor(Colors.GOLD);

  embed.addFields(
    { name: 'Champion', value: result.champion || 'N/A', inline: true },
    { name: 'Top Scorer', value: result.topScorer || 'N/A', inline: true },
    { name: 'Most Assists', value: result.mostAssists || 'N/A', inline: true },
    { name: 'Best Defense', value: result.bestDefense || 'N/A', inline: true },
    { name: 'Worst Defense', value: result.worstDefense || 'N/A', inline: true },
    { name: 'Biggest Win', value: result.biggestWin || 'N/A', inline: true },
  );

  if (result.milestones && result.milestones.length > 0) {
    embed.addFields({ name: '🏅 Milestones', value: result.milestones.map((m: string) => `• ${m}`).join('\n'), inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleDay(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  await interaction.editReply({ embeds: [createLoadingEmbed(`${EMOJIS.AI} Summarizing today's football...`)] });

  const result = await AIService.summarizeDay();

  if (!result || !result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Summary Failed', result?.error || 'Could not summarize today.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.NEWS} Today in Football`,
    `AI-generated daily football digest.`,
  )
    .setDescription(result.summary.slice(0, 4000))
    .setColor(Colors.PRIMARY);

  embed.addFields(
    { name: 'Matches Today', value: `${result.matchesCount || 0}`, inline: true },
    { name: 'Biggest Match', value: result.biggestMatch || 'N/A', inline: true },
    { name: 'Highlight', value: result.highlight || 'N/A', inline: true },
  );

  if (result.topStories && result.topStories.length > 0) {
    embed.addFields({ name: '📰 Top Stories', value: result.topStories.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n'), inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}

export default command;
