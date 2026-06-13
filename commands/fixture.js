const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../utils/footballApi');
module.exports = {
    data: new SlashCommandBuilder().setName('fixtures').setDescription('Upcoming matches').addStringOption(opt => opt.setName('team').setDescription('Team name').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const teamId = await api.searchTeam(interaction.options.getString('team'));
        if (!teamId) return interaction.editReply('Team not found');
        try {
            const matches = await api.getTeamFixtures(teamId);
            const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle('📅 Upcoming Fixtures')
              .setDescription(matches.map(m => `**${m.homeTeam.name} vs ${m.awayTeam.name}**\n<t:${Math.floor(new Date(m.utcDate).getTime() / 1000)}:F>`).join('\n\n'));
            await interaction.editReply({ embeds: [embed] });
        } catch (e) { await interaction.editReply('Error'); }
    }
};