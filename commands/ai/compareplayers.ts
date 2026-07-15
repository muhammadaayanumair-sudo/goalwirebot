import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import AIService from '../../services/ai/AIService';
import { Colors } from '../../config/colors';
import { EMOJIS, COOLDOWNS } from '../../config/constants';
import { createEmbed, createErrorEmbed, createLoadingEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('compareplayers')
    .setDescription('AI-powered detailed player comparison')
    .addStringOption(opt =>
      opt.setName('player_1')
        .setDescription('First player')
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption(opt =>
      opt.setName('player_2')
        .setDescription('Second player')
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption(opt =>
      opt.setName('aspect')
        .setDescription('Comparison focus')
        .setRequired(false)
        .addChoices(
          { name: 'Overall', value: 'overall' },
          { name: 'Fantasy Value', value: 'fantasy' },
          { name: 'Form', value: 'form' },
          { name: 'Stats', value: 'stats' },
          { name: 'Potential', value: 'potential' },
        ),
    ),

  cooldown: COOLDOWNS.AI_ANALYSIS,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const player1 = interaction.options.getString('player_1', true);
    const player2 = interaction.options.getString('player_2', true);
    const aspect = interaction.options.getString('aspect') || 'overall';

    await interaction.editReply({ embeds: [createLoadingEmbed(`${EMOJIS.AI} Comparing ${player1} vs ${player2}...`)] });

    const result = await AIService.comparePlayers(player1, player2, aspect);

    if (!result || !result.success) {
      await interaction.editReply({ embeds: [createErrorEmbed('Comparison Failed', result?.error || 'Could not compare these players.')] });
      return;
    }

    const embed = createEmbed(
      `${EMOJIS.AI} AI Player Comparison`,
      `**${result.player1.name}** vs **${result.player2.name}** — Focus: ${aspect.charAt(0).toUpperCase() + aspect.slice(1)}`,
    )
      .setDescription(result.comparison.slice(0, 4000))
      .setColor(Colors.PRIMARY);

    embed.addFields(
      {
        name: `⚽ ${result.player1.name}`,
        value: [
          `Position: ${result.player1.position}`,
          `Team: ${result.player1.team}`,
          `Age: ${result.player1.age || 'N/A'}`,
          `Rating: ${result.player1.rating}/10`,
          `${aspect === 'fantasy' ? `Fantasy: ${result.player1.fantasyPoints}pts | ${result.player1.fantasyValue}` : ''}`,
          `${aspect === 'stats' ? `Goals: ${result.player1.goals} | Assists: ${result.player1.assists} | Pass%: ${result.player1.passAccuracy}%` : ''}`,
        ].filter(Boolean).join('\n'),
        inline: true,
      },
      {
        name: `⚽ ${result.player2.name}`,
        value: [
          `Position: ${result.player2.position}`,
          `Team: ${result.player2.team}`,
          `Age: ${result.player2.age || 'N/A'}`,
          `Rating: ${result.player2.rating}/10`,
          `${aspect === 'fantasy' ? `Fantasy: ${result.player2.fantasyPoints}pts | ${result.player2.fantasyValue}` : ''}`,
          `${aspect === 'stats' ? `Goals: ${result.player2.goals} | Assists: ${result.player2.assists} | Pass%: ${result.player2.passAccuracy}%` : ''}`,
        ].filter(Boolean).join('\n'),
        inline: true,
      },
    );

    if (result.verdict) {
      embed.addFields({ name: '🏆 Verdict', value: result.verdict, inline: false });
    }

    if (result.recommendation) {
      embed.addFields({ name: '💡 Recommendation', value: result.recommendation, inline: false });
    }

    if (result.winner) {
      embed.addFields({ name: '✅ Advantage', value: `**${result.winner}**`, inline: true });
    }
    if (result.confidence) {
      embed.addFields({ name: 'Confidence', value: `${(result.confidence * 100).toFixed(0)}%`, inline: true });
    }

    const statBars = [
      `**Attack:** ${createSimpleBar(result.player1.attackRating || 50, result.player2.attackRating || 50)}`,
      `**Defense:** ${createSimpleBar(result.player1.defenseRating || 50, result.player2.defenseRating || 50)}`,
      `**Pace:** ${createSimpleBar(result.player1.pace || 50, result.player2.pace || 50)}`,
      `**Passing:** ${createSimpleBar(result.player1.passing || 50, result.player2.passing || 50)}`,
    ];

    embed.addFields({ name: '📊 Attribute Comparison', value: statBars.join('\n'), inline: false });

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`compare_players_switch_aspect_${aspect}`)
          .setLabel('Switch Aspect')
          .setEmoji('🔄')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`player_${result.player1.id}`)
          .setLabel(result.player1.name.split(' ').pop() || 'P1')
          .setEmoji(EMOJIS.INFO)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`player_${result.player2.id}`)
          .setLabel(result.player2.name.split(' ').pop() || 'P2')
          .setEmoji(EMOJIS.INFO)
          .setStyle(ButtonStyle.Primary),
      );

    await interaction.editReply({ embeds: [embed], components: [row] });
  },

  async autocomplete(interaction): Promise<void> {
    const focused = interaction.options.getFocused(true);
    const players = await AIService.searchPlayers(focused.value as string);
    await interaction.respond(
      players.slice(0, 25).map(p => ({
        name: `${p.name} — ${p.team} | ${p.position}`,
        value: p.name,
      })),
    );
  },
};

function createSimpleBar(val1: number, val2: number): string {
  const bars = 10;
  const v1 = Math.round((val1 / 100) * bars);
  const v2 = Math.round((val2 / 100) * bars);
  const diff = v1 - v2;
  if (diff > 0) return `${'🟢'.repeat(v1)}${'⚪'.repeat(Math.max(0, bars - v1))} ${val1} vs ${'🔴'.repeat(v2)}${'⚪'.repeat(Math.max(0, bars - v2))} ${val2}`;
  if (diff < 0) return `${'🔴'.repeat(v1)}${'⚪'.repeat(Math.max(0, bars - v1))} ${val1} vs ${'🟢'.repeat(v2)}${'⚪'.repeat(Math.max(0, bars - v2))} ${val2}`;
  return `${'🟡'.repeat(v1)}${'⚪'.repeat(Math.max(0, bars - v1))} ${val1} vs ${'🟡'.repeat(v2)}${'⚪'.repeat(Math.max(0, bars - v2))} ${val2}`;
}

export default command;
