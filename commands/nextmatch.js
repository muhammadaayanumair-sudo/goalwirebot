const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../utils/footballApi');
module.exports = {
    data: new SlashCommandBuilder().setName('nextmatch').setDescription('Next match for a team').addStringOption(opt => opt.setName('team').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const teamId = await api.searchTeam(interaction.options.getString('team'));
        if (!teamId) return interaction.editReply('Team not found');
        try {
            const matches = await api.getTeamFixtures(teamId);
            if (!matches.length) return interaction.editReply('No upcoming matches');
            const m = matches[0];
            const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle('⏭️ Next Match')
          .setDescription(`**${m.homeTeam.name} vs ${m.awayTeam.name}**\n<t:${Math.floor(new Date(m.utcDate).getTime() / 1000)}:F>\n${m.competition.name}`);
            await interaction.editReply({ embeds: [embed] });
        } catch (e) { await interaction.editReply('Error'); }
    }
};
