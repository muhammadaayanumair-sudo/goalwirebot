const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../utils/football');
module.exports = {
    data: new SlashCommandBuilder().setName('h2h').setDescription('Head to head record').addStringOption(opt => opt.setName('team1').setRequired(true)).addStringOption(opt => opt.setName('team2').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const t1 = interaction.options.getString('team1');
        const t2 = interaction.options.getString('team2');
        const id1 = await api.searchTeam(t1);
        const id2 = await api.searchTeam(t2);
        if (!id1 ||!id2) return interaction.editReply('One or both teams not found');
        try {
            const matches = await api.getTeamResults(id1);
            const h2h = matches.filter(m => m.homeTeam.id === id2 || m.awayTeam.id === id2).slice(0, 5);
            if (!h2h.length) return interaction.editReply(`No recent H2H data for ${t1} vs ${t2}`);
            const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle(`⚔️ ${t1} vs ${t2} - Last 5`)
          .setDescription(h2h.map(m => `**${m.homeTeam.name} ${m.score.fullTime.home}-${m.score.fullTime.away} ${m.awayTeam.name}**\n<t:${Math.floor(new Date(m.utcDate).getTime() / 1000)}:D>`).join('\n\n'));
            await interaction.editReply({ embeds: [embed] });
        } catch (e) { await interaction.editReply('Error'); }
    }
};