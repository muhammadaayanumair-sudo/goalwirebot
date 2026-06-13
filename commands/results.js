const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../utils/football');
module.exports = {
    data: new SlashCommandBuilder().setName('results').setDescription('Recent results for a team').addStringOption(opt => opt.setName('team').setDescription('Team name').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const teamId = await api.searchTeam(interaction.options.getString('team'));
        if (!teamId) return interaction.editReply('Team not found');
        try {
            const matches = await api.getTeamResults(teamId);
            const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle('📊 Recent Results')
          .setDescription(matches.map(m => `**${m.homeTeam.name} ${m.score.fullTime.home}-${m.score.fullTime.away} ${m.awayTeam.name}**\n<t:${Math.floor(new Date(m.utcDate).getTime() / 1000)}:D> • ${m.competition.name}`).join('\n\n'));
            await interaction.editReply({ embeds: [embed] });
        } catch (e) { await interaction.editReply('Error fetching results'); }
    }
};