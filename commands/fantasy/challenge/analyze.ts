import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import FantasyService from '../../services/fantasy/FantasyService';
import AIService from '../../services/ai/AIService';
import { Colors } from '../../config/colors';
import { EMOJIS, COOLDOWNS } from '../../config/constants';
import { createEmbed, createErrorEmbed, createLoadingEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('analyze')
    .setDescription('AI analysis of your matchup')
    .addStringOption(opt =>
      opt.setName('matchup_id')
        .setDescription('Specific matchup ID (optional)')
        .setRequired(false),
    ),

  cooldown: COOLDOWNS.AI_ANALYSIS,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    await interaction.editReply({ embeds: [createLoadingEmbed('AI is analyzing the matchup...')] });

    const matchupId = interaction.options.getString('matchup_id');
    const result = await AIService.analyzeMatchup(interaction.user.id, matchupId || undefined);

    if (!result || !result.success) {
      await interaction.editReply({
        embeds: [createErrorEmbed('Analysis Failed', result?.error || 'Could not analyze matchup.')],
      });
      return;
    }

    const embed = createEmbed(
      `${EMOJIS.AI} Matchup Analysis`,
      `**${result.challenger}** vs **${result.opponent}** — GW${result.gameweek}`,
    )
      .setColor(Colors.PRIMARY);

    const predictionBar = createProgressBar(result.challengerWinProb, result.drawProb, result.opponentWinProb);

    embed.addFields(
      {
        name: `${result.challenger} Win Chance`,
        value: `${predictionBar.challengerBar} ${(result.challengerWinProb * 100).toFixed(1)}%`,
        inline: false,
      },
      {
        name: 'Draw Chance',
        value: `${predictionBar.drawBar} ${(result.drawProb * 100).toFixed(1)}%`,
        inline: false,
      },
      {
        name: `${result.opponent} Win Chance`,
        value: `${predictionBar.opponentBar} ${(result.opponentWinProb * 100).toFixed(1)}%`,
        inline: false,
      },
    );

    if (result.keyBattles && result.keyBattles.length > 0) {
      embed.addFields({
        name: '⚔️ Key Battles',
        value: result.keyBattles.slice(0, 5).map(b => `**${b.player1}** vs **${b.player2}** — ${b.advantage}`).join('\n'),
        inline: false,
      });
    }

    if (result.analysis) {
      embed.addFields({ name: '📊 Analysis', value: result.analysis.slice(0, 1024), inline: false });
    }

    if (result.recommendation) {
      embed.addFields({ name: '💡 Recommendation', value: result.recommendation.slice(0, 1024), inline: false });
    }

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`matchup_${result.matchupId}`)
          .setLabel('View Matchup')
          .setEmoji(EMOJIS.CROWN)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`analyze_refresh_${result.matchupId}`)
          .setLabel('Re-analyze')
          .setEmoji('🔄')
          .setStyle(ButtonStyle.Secondary),
      );

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};

function createProgressBar(challengerProb: number, drawProb: number, opponentProb: number) {
  const totalBars = 20;
  const challengerBars = Math.round(challengerProb * totalBars);
  const drawBars = Math.round(drawProb * totalBars);
  const opponentBars = totalBars - challengerBars - drawBars;

  return {
    challengerBar: '🟢'.repeat(Math.max(challengerBars, 0)) + '⚪'.repeat(Math.max(totalBars - challengerBars, 0)),
    drawBar: '🟡'.repeat(Math.max(drawBars, 0)) + '⚪'.repeat(Math.max(totalBars - drawBars, 0)),
    opponentBar: '🔴'.repeat(Math.max(opponentBars, 0)) + '⚪'.repeat(Math.max(totalBars - opponentBars, 0)),
  };
}

export default command;
