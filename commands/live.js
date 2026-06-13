const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const api = require('../utils/footballApi');
module.exports = {
    data: new SlashCommandBuilder().setName('live').setDescription('Show live matches'),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const matches = await api.getLiveMatches();
            if (!matches.length) return interaction.editReply('No live matches 😴');
            const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle('🔴 Live Matches')
              .setDescription(matches.slice(0, 5).map(m => `**${m.homeTeam.name} ${m.score.fullTime.home?? 0}-${m.score.fullTime.away?? 0} ${m.awayTeam.name}**\n${m.competition.name} • ${m.minute}'`).join('\n\n'))
              .setFooter({ text: 'Goalwire' }).setTimestamp();
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`stats_${matches[0].id}`).setLabel('Stats').setStyle(ButtonStyle.Primary).setEmoji('📊'),
                new ButtonBuilder().setCustomId('refresh_live').setLabel('Refresh').setStyle(ButtonStyle.Success).setEmoji('🔄')
            );
            await interaction.editReply({ embeds: [embed], components: [row] });
        } catch (e) { await interaction.editReply('API error'); }
    }
};