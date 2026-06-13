const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('topassist').setDescription('Top assists').addStringOption(opt => opt.setName('league').setDescription('PL, CL, BL1').setRequired(false)),
    async execute(interaction) {
        await interaction.reply('Assists data requires API-Football premium. football-data.org only gives top scorers.');
    }
};