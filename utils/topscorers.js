const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../utils/footballApi');
module.exports = {
    data: new SlashCommandBuilder().setName('topscorers').setDescription('League top scorers').addStringOption(opt => opt.setName('league').setDescription('PL, CL, BL1, SA, PD')),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const league = interaction.options.getString('league') || 'PL';
            const scorers = await api.getTopScorers(league);
            const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle(`🥇 Top Scorers - ${league}`)
            .setDescription(scorers.slice(0, 10).map((s, i) => `**${i + 1}. ${s.player.name}** - ${s.goals} goals | ${s.team.name}`).join('\n'));
            await interaction.editReply({ embeds: [embed] });
        } catch (e) { await interaction.editReply('Error. Use: PL, CL, BL1, SA, PD'); }
    }
};