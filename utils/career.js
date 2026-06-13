const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('career').setDescription('Player career stats').addStringOption(opt => opt.setName('name').setRequired(true)),
    async execute(interaction) {
        await interaction.reply('Career stats need API-Football. football-data.org free tier doesn\'t have it.');
    }
};