const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('nationality').setDescription('Players by country').addStringOption(opt => opt.setName('country').setRequired(true)),
    async execute(interaction) {
        await interaction.reply('Nationality search needs API-Football. Want me to add it?');
    }
};