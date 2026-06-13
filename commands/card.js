const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('card')
        .setDescription('View your Goalwire player card collection')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('View another user\'s card collection') // ← This was likely missing
                .setRequired(false)),
    
    async execute(interaction) {
        await interaction.deferReply();
        const target = interaction.options.getUser('user') || interaction.user;
        // your card display logic here
        await interaction.editReply(`${target.username}'s cards will show here`);
    }
};
