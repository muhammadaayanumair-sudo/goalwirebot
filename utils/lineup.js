const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('lineup').setDescription('Match lineups - needs API-Football').addStringOption(opt => opt.setName('match').setDescription('e.g. Arsenal vs Chelsea').setRequired(true)),
    async execute(interaction) {
        await interaction.reply('Lineups require API-Football key. football-data.org free tier doesn\'t provide lineups. Upgrade or I\'ll add API-Football integration next.');
    }
};