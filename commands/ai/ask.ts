import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import AIService from '../../services/ai/AIService';
import { Colors } from '../../config/colors';
import { EMOJIS, COOLDOWNS } from '../../config/constants';
import { createEmbed, createErrorEmbed, createLoadingEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask the GoalX AI anything about football')
    .addStringOption(opt =>
      opt.setName('question')
        .setDescription('Your football question')
        .setRequired(true)
        .setMinLength(5)
        .setMaxLength(500),
    )
    .addStringOption(opt =>
      opt.setName('provider')
        .setDescription('AI provider (default: auto)')
        .setRequired(false)
        .addChoices(
          { name: 'Gemini', value: 'gemini' },
          { name: 'Groq', value: 'groq' },
          { name: 'Mistral', value: 'mistral' },
          { name: 'Auto (Best)', value: 'auto' },
        ),
    ),

  cooldown: COOLDOWNS.AI_ANALYSIS,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const question = interaction.options.getString('question', true);
    const provider = interaction.options.getString('provider') || 'auto';

    await interaction.editReply({ embeds: [createLoadingEmbed(`${EMOJIS.AI} ${provider === 'auto' ? 'GoalX AI' : provider.charAt(0).toUpperCase() + provider.slice(1)} is thinking...`)] });

    const result = await AIService.askFootballQuestion(question, provider);

    if (!result || !result.success) {
      await interaction.editReply({
        embeds: [createErrorEmbed('AI Error', result?.error || 'Failed to get a response. Please try again.')],
      });
      return;
    }

    const embed = createEmbed(
      `${EMOJIS.AI} GoalX AI Response`,
      `**Question:** ${question}`,
    )
      .setDescription(result.response.slice(0, 4000))
      .setColor(Colors.PRIMARY);

    embed.addFields(
      { name: 'Provider', value: result.provider.charAt(0).toUpperCase() + result.provider.slice(1), inline: true },
      { name: 'Model', value: result.model || 'Default', inline: true },
    );

    if (result.confidence) {
      embed.addFields({ name: 'Confidence', value: `${(result.confidence * 100).toFixed(0)}%`, inline: true });
    }

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('ai_ask_followup')
          .setLabel('Ask Follow-up')
          .setEmoji(EMOJIS.AI)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('ai_search_web')
          .setLabel('Search Web')
          .setEmoji('🌐')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('ai_copy')
          .setLabel('Copy')
          .setEmoji('📋')
          .setStyle(ButtonStyle.Secondary),
      );

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};

export default command;
