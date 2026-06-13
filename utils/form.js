const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../utils/footballApi');
module.exports = {
    data: new SlashCommandBuilder().setName('form').setDescription('Team form - last 5').addStringOption(opt => opt.setName('team').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const teamId = await api.searchTeam(interaction.options.getString('team'));
        if (!teamId) return interaction.editReply('Team not found');
        try {
            const matches = await api.getTeamResults(teamId);
            const form = matches.slice(0, 5).map(m => {
                const isHome = m.homeTeam.id === teamId;
                const gf = isHome? m.score.fullTime.home : m.score.fullTime.away;
                const ga = isHome? m.score.fullTime.away : m.score.fullTime.home;
                if (gf > ga) return '🟢W'; if (gf === ga) return '🟡D'; return '🔴L';
            }).join(' ');
            const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle('📈 Form - Last 5').setDescription(`**${form}**`);
            await interaction.editReply({ embeds: [embed] });
        } catch (e) { await interaction.editReply('Error'); }
    }
};