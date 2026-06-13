const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('cleansheets').setDescription('Most clean sheets - needs API-Football').addStringOption(opt => opt.setName('league').setRequired(false)),
    async execute(interaction) {
        await interaction.reply('Clean sheet stats require API-Football. football-data.org free tier doesn\'t have it.');
    }
};
