import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import PlayerService from '../../services/football/PlayerService';
import { Colors, getRatingColor } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';
import { formatPosition } from '../../utils/formatter';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('player')
    .setDescription('View football player information and stats')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('Player name')
        .setRequired(true)
        .setAutocomplete(true),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const playerName = interaction.options.getString('name', true);
    const player = await PlayerService.getPlayerInfo(playerName);

    if (!player) {
      await interaction.editReply({ embeds: [createErrorEmbed('Not Found', `Player "${playerName}" not found.`) }] });
      return;
    }

    const embed = createEmbed(
      `${player.photo || '⚽'} ${player.name}`,
      `${player.team} | ${player.league} | #${player.number || '?'}`,
    )
      .setThumbnail(player.photo || '')
      .setColor(getRatingColor(player.rating || 0));

    embed.addFields(
      { name: 'Position', value: formatPosition(player.position), inline: true },
      { name: 'Age', value: `${player.age || 'N/A'}`, inline: true },
      { name: 'Nationality', value: `${player.flag || ''} ${player.nationality || 'N/A'}`, inline: true },
      { name: 'Height', value: player.height || 'N/A', inline: true },
      { name: 'Foot', value: player.foot || 'N/A', inline: true },
      { name: 'Market Value', value: player.marketValue ? `$${player.marketValue.toLocaleString()}` : 'N/A', inline: true },
    );

    if (player.seasonStats) {
      const s = player.seasonStats;
      embed.addFields(
        { name: '📊 Season Stats', value: [
          `Appearances: ${s.appearances || 0}`,
          `Goals: ${s.goals || 0}`,
          `Assists: ${s.assists || 0}`,
          `Minutes: ${s.minutes || 0}`,
        ].join(' | '), inline: false },
      );
    }

    if (player.form !== undefined) {
      embed.addFields({ name: 'Current Form', value: `${player.form}/10 ${'⭐'.repeat(Math.round(player.form / 2))}`, inline: true });
    }

    if (player.predictedPoints) {
      embed.addFields({ name: 'Fantasy Prediction', value: `${player.predictedPoints}pts (next GW)`, inline: true });
    }

    if (player.injured) {
      embed.addFields({ name: `${EMOJIS.WARNING} Injury Status`, value: `${player.injuryDetails || 'Injured'}`, inline: false });
    }

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`player_stats_${player.id}`)
          .setLabel('Full Stats')
          .setEmoji(EMOJIS.CHART)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`player_transfer_${player.id}`)
          .setLabel('Sign Player')
          .setEmoji(EMOJIS.TRANSFER)
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`player_compare_${player.id}`)
          .setLabel('Compare')
          .setEmoji('⚔️')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`player_follow_${player.id}`)
          .setLabel('Follow')
          .setEmoji('🔔')
          .setStyle(ButtonStyle.Secondary),
      );

    await interaction.editReply({ embeds: [embed], components: [row] });
  },

  async autocomplete(interaction): Promise<void> {
    const focused = interaction.options.getFocused(true);
    const players = await PlayerService.searchPlayers(focused.value as string);
    await interaction.respond(
      players.slice(0, 25).map(p => ({
        name: `${p.name} — ${p.team} — ${formatPosition(p.position)}`,
        value: p.name,
      })),
    );
  },
};

export default command;
