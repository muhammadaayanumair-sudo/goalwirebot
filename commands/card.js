const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('cards').setDescription('Most yellow/red cards - needs API-Football').addStringOption(opt => opt.setName('league').setRequired(false)),
    async execute(interaction) {
        await interaction.reply('Card stats require API-Football premium. Not in free APIs.');
    }
};