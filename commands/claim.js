const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('claim').setDescription('Claim daily reward'),
    async execute(interaction) {
        const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle('🎁 Daily Claimed!').setDescription('You received 500 coins + 1 Free Pack!');
        await interaction.reply({ embeds: [embed] });
    }
};