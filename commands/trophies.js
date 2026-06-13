const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('trophies').setDescription('Team trophy cabinet').addStringOption(opt => opt.setName('team').setRequired(true)),
    async execute(interaction) {
        const team = interaction.options.getString('team');
        const embed = new EmbedBuilder().setColor(0xFFD700).setTitle(`🏆 ${team} Trophies`)
       .setDescription('**Premier League:** 9\n**FA Cup:** 7\n**Champions League:** 1\n**UCL:** 1');
        await interaction.reply({ embeds: [embed] });
    }
};