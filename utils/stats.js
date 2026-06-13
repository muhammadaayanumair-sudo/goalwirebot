const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('stats').setDescription('Detailed match stats - needs API-Football').addStringOption(opt => opt.setName('match').setRequired(true)),
    async execute(interaction) {
        await interaction.reply('Stats require API-Football key. Want me to add it?');
    }
};