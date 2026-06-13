const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('transfers').setDescription('Recent transfers').addStringOption(opt => opt.setName('team').setRequired(false)),
    async execute(interaction) {
        await interaction.reply('Transfer data requires API-Football or NewsAPI. football-data.org doesn\'t provide transfers. Want me to hook up NewsAPI for this?');
    }
};