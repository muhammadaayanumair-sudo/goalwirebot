const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('career')
        .setDescription('View a player\'s career stats and history')
        .addStringOption(option =>
            option.setName('player')
                .setDescription('Player name to look up, e.g. Lionel Messi') // ← This was missing
                .setRequired(true)),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        const playerName = interaction.options.getString('player');
        
        try {
            // your API call here
            await interaction.editReply(`Career stats for ${playerName} will show here`);
        } catch (error) {
            await interaction.editReply('Player not found or API error.');
        }
    }
};
