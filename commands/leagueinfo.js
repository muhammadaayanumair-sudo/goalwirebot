const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('leagueinfo').setDescription('League details').addStringOption(opt => opt.setName('league').setDescription('PL, CL, BL1, SA, PD').setRequired(true)),
    async execute(interaction) {
        const league = interaction.options.getString('league');
        const data = { PL: 'Premier League\n**Country:** England\n**Teams:** 20\n**Founded:** 1992', CL: 'Champions League\n**Teams:** 32\n**Founded:** 1955' };
        const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle(`🏆 ${league}`)
       .setDescription(data[league] || 'League info not found');
        await interaction.reply({ embeds: [embed] });
    }
};