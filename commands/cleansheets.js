const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cleansheets')
        .setDescription('Show goalkeeper clean sheet stats for a league or team')
        .addStringOption(option =>
            option.setName('league')
                .setDescription('League name or ID, e.g. Premier League') // ← was missing
                .setRequired(false))
        .addStringOption(option =>
            option.setName('team')
                .setDescription('Team name to filter by, e.g. Arsenal') // ← was missing
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('season')
                .setDescription('Season year, e.g. 2023') // ← was missing
                .setRequired(false)),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        const league = interaction.options.getString('league');
        const team = interaction.options.getString('team');
        const season = interaction.options.getInteger('season') || 2023;
        
        try {
            // your API call for clean sheets here
            await interaction.editReply(`Clean sheet stats for ${season} will show here`);
        } catch (error) {
            await interaction.editReply('Failed to fetch clean sheet data.');
        }
    }
};
