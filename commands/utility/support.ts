import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription('Get support or report issues'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = createEmbed(
      `${EMOJIS.INFO} GoalX Support`,
      `Need help? We're here for you!`,
    )
      .addFields(
        { name: '📖 Documentation', value: 'Check out `/help` for command guides and usage.', inline: false },
        { name: '💬 Support Server', value: 'Join our Discord for live support: https://discord.gg/goalx', inline: false },
        { name: '🐛 Report a Bug', value: 'Use `/feedback type:bug` to report issues.', inline: false },
        { name: '💡 Feature Request', value: 'Use `/feedback type:feature` to suggest new features.', inline: false },
        { name: '🌐 Website', value: 'https://goalx.gg', inline: false },
        { name: '📧 Email', value: 'support@goalx.gg', inline: false },
      )
      .setColor(Colors.INFO);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Support Server')
          .setURL('https://discord.gg/goalx')
          .setStyle(ButtonStyle.Link)
          .setEmoji('💬'),
        new ButtonBuilder()
          .setLabel('Website')
          .setURL('https://goalx.gg')
          .setStyle(ButtonStyle.Link)
          .setEmoji('🌐'),
        new ButtonBuilder()
          .setLabel('Invite Bot')
          .setURL('https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot+applications.commands')
          .setStyle(ButtonStyle.Link)
          .setEmoji(EMOJIS.INFO),
      );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },
};

export default command;
