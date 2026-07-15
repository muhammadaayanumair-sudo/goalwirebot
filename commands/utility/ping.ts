import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency and response time'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sent = await interaction.deferReply({ fetchReply: true });

    const wsLatency = interaction.client.ws.ping;
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const uptime = process.uptime();
    const memory = process.memoryUsage().heapUsed / 1024 / 1024;

    const embed = createEmbed(
      `${EMOJIS.INFO} Pong!`,
      `GoalX bot latency and performance metrics.`,
    )
      .addFields(
        { name: 'WebSocket Latency', value: `\`${wsLatency}ms\``, inline: true },
        { name: 'Roundtrip Latency', value: `\`${roundtrip}ms\``, inline: true },
        { name: 'Uptime', value: `\`${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m\``, inline: true },
        { name: 'Memory Usage', value: `\`${memory.toFixed(1)}MB\``, inline: true },
        { name: 'Guilds', value: `\`${interaction.client.guilds.cache.size}\``, inline: true },
        { name: 'Users', value: `\`${interaction.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0).toLocaleString()}\``, inline: true },
      )
      .setColor(wsLatency < 100 ? Colors.SUCCESS : wsLatency < 300 ? Colors.WARNING : Colors.ERROR);

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
