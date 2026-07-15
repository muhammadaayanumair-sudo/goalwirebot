import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('feedback')
    .setDescription('Send feedback or feature requests to the GoalX team')
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('Type of feedback')
        .setRequired(true)
        .addChoices(
          { name: 'Bug Report', value: 'bug' },
          { name: 'Feature Request', value: 'feature' },
          { name: 'General Feedback', value: 'general' },
          { name: 'Partner Feedback', value: 'partner' },
        ),
    )
    .addStringOption(opt =>
      opt.setName('message')
        .setDescription('Your feedback')
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(2000),
    )
    .addBooleanOption(opt =>
      opt.setName('anonymous')
        .setDescription('Submit anonymously (default: false)')
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const type = interaction.options.getString('type', true);
    const message = interaction.options.getString('message', true);
    const anonymous = interaction.options.getBoolean('anonymous') || false;

    const typeLabels: Record<string, string> = {
      bug: '🐛 Bug Report',
      feature: '💡 Feature Request',
      general: '💬 General Feedback',
      partner: '👑 Partner Feedback',
    };

    const embed = createEmbed(
      `${EMOJIS.SUCCESS} Feedback Submitted!`,
      `Thank you for your feedback! The GoalX team will review it.`,
    )
      .addFields(
        { name: 'Type', value: typeLabels[type], inline: true },
        { name: 'Submitted By', value: anonymous ? 'Anonymous' : interaction.user.tag, inline: true },
      )
      .setColor(Colors.SUCCESS);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('feedback_again')
          .setLabel('Submit Another')
          .setEmoji('💬')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('features')
          .setLabel('View Features')
          .setEmoji(EMOJIS.STAR)
          .setStyle(ButtonStyle.Primary),
      );

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};

export default command;
