import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Get the bot invite link'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = createEmbed(
      `${EMOJIS.INFO} Invite GoalX`,
      `Add GoalX to your server and start your fantasy football journey!`,
    )
      .addFields(
        { name: 'Bot Invite', value: '[Click here to invite](https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot+applications.commands)', inline: false },
        { name: 'Support Server', value: '[Join the support server](https://discord.gg/goalx)', inline: false },
        { name: 'Website', value: 'https://goalx.gg', inline: false },
      )
      .setColor(Colors.PRIMARY);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Invite Bot')
          .setURL('https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot+applications.commands')
          .setStyle(ButtonStyle.Link)
          .setEmoji(EMOJIS.INFO),
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
      );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },
};

export default command;
