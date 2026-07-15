import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('activate')
    .setDescription('Activate your GoalX partner benefits')
    .addStringOption(opt =>
      opt.setName('code')
        .setDescription('Partner activation code')
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const code = interaction.options.getString('code', true);

    const embed = createEmbed(
      `${EMOJIS.SUCCESS} Partner Benefits Activated!`,
      `Welcome to the GoalX Partner Program! Your benefits are now active.`,
    )
      .addFields(
        { name: 'Features Unlocked', value: [
          `${EMOJis.STAR} Beta Fantasy Features`,
          `${EMOJIS.AI} Advanced AI Scout`,
          `${EMOJIS.CROWN} Exclusive Partner Badge`,
          `⚡ Early Command Access`,
          `🎯 Priority Support`,
        ].join('\n'), inline: false },
        { name: 'Tier', value: 'Gold', inline: true },
        { name: 'Next Steps', value: 'Check out `/partner` to view your benefits and explore new features.', inline: false },
      )
      .setColor(Colors.GOLD);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('partner_benefits')
          .setLabel('View Benefits')
          .setEmoji(EMOJIS.STAR)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('partner_feedback')
          .setLabel('Give Feedback')
          .setEmoji('💬')
          .setStyle(ButtonStyle.Secondary),
      );

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};

export default command;
