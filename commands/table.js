const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../utils/footballApi');
module.exports = {
    data: new SlashCommandBuilder().setName('table').setDescription('League standings').addStringOption(opt => opt.setName('league').setDescription('PL, CL, BL1, SA, PD')),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const league = interaction.options.getString('league') || 'PL';
            const table = await api.getStandings(league);
            const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle(`🏆 ${league} Standings`)
              .setDescription(table.slice(0, 10).map(t => `**${t.position}.** ${t.team.name} - ${t.points}pts`).join('\n'));
            await interaction.editReply({ embeds: [embed] });
        } catch (e) { await interaction.editReply('Error. Use: PL, CL, BL1, SA, PD'); }
    }
};