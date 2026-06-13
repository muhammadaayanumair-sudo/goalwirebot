const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../utils/footballApi');
module.exports = {
    data: new SlashCommandBuilder().setName('injuries').setDescription('Injury list').addStringOption(opt => opt.setName('league').setDescription('PL, CL, BL1').setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply();
        const league = interaction.options.getString('league') || 'PL';
        const leagueIds = { PL: 39, CL: 2, BL1: 78 };
        try {
            const injuries = await api.getInjuries(leagueIds[league] || 39);
            if (!injuries.length) return interaction.editReply('No current injuries reported');
            const embed = new EmbedBuilder().setColor(0xFF0000).setTitle(`🤕 Injury List - ${league}`)
          .setDescription(injuries.slice(0, 10).map(i => `**${i.player.name}** - ${i.team.name}\n*${i.player.reason}* • Return: ${i.player.type || 'Unknown'}`).join('\n\n'));
            await interaction.editReply({ embeds: [embed] });
        } catch (e) { await interaction.editReply('Error - needs API-Football key'); }
    }
};
