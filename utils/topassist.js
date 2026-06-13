const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('topassists').setDescription('Top assists - needs API-Football'),
    async execute(interaction) {
        await interaction.reply('Assists data requires API-Football. football-data.org only gives scorers.');
    }
};