const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('referee').setDescription('Referee stats - needs API-Football'),
    async execute(interaction) {
        await interaction.reply('Referee data requires API-Football. Not available in football-data.org.');
    }
};