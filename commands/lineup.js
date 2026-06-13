const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../utils/footballApi');
module.exports = {
    data: new SlashCommandBuilder().setName('lineup').setDescription('Match lineups').addStringOption(opt => opt.setName('fixture_id').setDescription('Match ID from /live').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const fixtureId = interaction.options.getString('fixture_id');
        try {
            const lineups = await api.getLineups(fixtureId);
            if (!lineups.length) return interaction.editReply('No lineups yet - usually posted 1h before kickoff');
            const home = lineups[0], away = lineups[1];
            const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle(`📋 ${home.team.name} vs ${away.team.name}`)
          .addFields(
                { name: `${home.team.name} (${home.formation})`, value: home.startXI.map(p => p.player.name).join('\n') || 'TBD', inline: true },
                { name: `${away.team.name} (${away.formation})`, value: away.startXI.map(p => p.player.name).join('\n') || 'TBD', inline: true }
            );
            await interaction.editReply({ embeds: [embed] });
        } catch (e) { await interaction.editReply('Error - check fixture ID or API-Football key'); }
    }
};
