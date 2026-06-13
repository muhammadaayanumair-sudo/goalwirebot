const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../utils/footballApi');
module.exports = {
    data: new SlashCommandBuilder().setName('score').setDescription('Latest score for a team').addStringOption(opt => opt.setName('team').setDescription('Team name').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const teamId = await api.searchTeam(interaction.options.getString('team'));
        if (!teamId) return interaction.editReply('Team not found. Try "Man United"');
        try {
            const matches = await api.getTeamResults(teamId);
            const m = matches[0];
            const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle(`${m.homeTeam.name} ${m.score.fullTime.home}-${m.score.fullTime.away} ${m.awayTeam.name}`)
              .setDescription(`**${m.competition.name}** • <t:${Math.floor(new Date(m.utcDate).getTime() / 1000)}:R>`);
            await interaction.editReply({ embeds: [embed] });
        } catch (e) { await interaction.editReply('Error'); }
    }
};