import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import MatchService from '../../services/football/MatchService';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('lineup')
    .setDescription('View match lineups and formations')
    .addStringOption(opt =>
      opt.setName('fixture_id')
        .setDescription('Fixture ID')
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const fixtureId = interaction.options.getString('fixture_id', true);
    const lineups = await MatchService.getLineups(Number(fixtureId));

    if (!lineups) {
      await interaction.editReply({ embeds: [createErrorEmbed('No Lineups', 'Lineups not available yet for this match.')] });
      return;
    }

    const embed = createEmbed(
      `📋 Lineups: ${lineups.homeTeam} vs ${lineups.awayTeam}`,
      `Formation: ${lineups.homeFormation} vs ${lineups.awayFormation}`,
    ).setColor(Colors.PRIMARY);

    const homeXI = lineups.homeStarters || [];
    const awayXI = lineups.awayStarters || [];
    const homeSubs = lineups.homeSubstitutes || [];
    const awaySubs = lineups.awaySubstitutes || [];

    embed.addFields(
      {
        name: `🏠 ${lineups.homeTeam} (${lineups.homeFormation})`,
        value: homeXI.map((p, i) => `**${i + 1}.** ${p.number ? `#${p.number}` : ''} ${p.name}${p.captain ? ' 👑' : ''}`).join('\n').slice(0, 1024) || 'N/A',
        inline: true,
      },
      {
        name: `✈️ ${lineups.awayTeam} (${lineups.awayFormation})`,
        value: awayXI.map((p, i) => `**${i + 1}.** ${p.number ? `#${p.number}` : ''} ${p.name}${p.captain ? ' 👑' : ''}`).join('\n').slice(0, 1024) || 'N/A',
        inline: true,
      },
    );

    if (homeSubs.length > 0) {
      embed.addFields({
        name: `🔄 ${lineups.homeTeam} Subs (${homeSubs.length})`,
        value: homeSubs.map(p => `${p.number ? `#${p.number}` : ''} ${p.name}`).join(', ').slice(0, 1024),
        inline: false,
      });
    }

    if (awaySubs.length > 0) {
      embed.addFields({
        name: `🔄 ${lineups.awayTeam} Subs (${awaySubs.length})`,
        value: awaySubs.map(p => `${p.number ? `#${p.number}` : ''} ${p.name}`).join(', ').slice(0, 1024),
        inline: false,
      });
    }

    if (lineups.missingPlayers && lineups.missingPlayers.length > 0) {
      embed.addFields({
        name: `${EMOJIS.WARNING} Missing Players`,
        value: lineups.missingPlayers.map(p => `**${p.name}** — ${p.reason}`).join('\n').slice(0, 1024),
        inline: false,
      });
    }

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`match_stats_${fixtureId}`)
          .setLabel('Stats')
          .setEmoji(EMOJIS.CHART)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`match_timeline_${fixtureId}`)
          .setLabel('Timeline')
          .setEmoji('📋')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`match_refresh_${fixtureId}`)
          .setLabel('Refresh')
          .setEmoji('🔄')
          .setStyle(ButtonStyle.Primary),
      );

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};

export default command;
