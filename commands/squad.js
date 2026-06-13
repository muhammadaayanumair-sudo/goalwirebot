const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('squad').setDescription('Full squad list').addStringOption(opt => opt.setName('team').setRequired(true)),
    async execute(interaction) {
        await interaction.reply('Squad data requires API-Football. football-data.org free gives limited squad. Add API-Football key to utils/footballApi.js and I\'ll update this.');
    }
};