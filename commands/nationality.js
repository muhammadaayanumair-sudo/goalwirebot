const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('nationality').setDescription('Search players by country').addStringOption(opt => opt.setName('country').setRequired(true)),
    async execute(interaction) {
        await interaction.reply('Nationality search requires API-Football premium. Use /player for individual lookup.');
    }
};