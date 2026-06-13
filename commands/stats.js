const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../utils/footballApi');
module.exports = {
    data: new SlashCommandBuilder().setName('stats').setDescription('Detailed match stats').addStringOption(opt => opt.setName('fixture_id').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const fixtureId = interaction.options.getString('fixture_id');
        try {
            const stats = await api.getFixtureStats(fixtureId);
            if (!stats.length) return interaction.editReply('No stats available yet');
            const home = stats[0], away = stats[1];
            const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle(`📊 Match Stats`)
          .addFields(home.statistics.map((s, i) => ({ name: s.type, value: `${s.value} - ${away.statistics[i].value}`, inline: true })));
            await interaction.editReply({ embeds: [embed] });
        } catch (e) { await interaction.editReply('Error - needs API-Football key'); }
    }
};
