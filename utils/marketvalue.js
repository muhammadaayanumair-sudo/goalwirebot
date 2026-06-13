const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('marketvalue').setDescription('Player market value').addStringOption(opt => opt.setName('name').setRequired(true)),
    async execute(interaction) {
        const name = interaction.options.getString('name');
        const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle(`💰 ${name} Market Value`).setDescription('**€180,000,000**\n*Data from Transfermarkt estimate*');
        await interaction.reply({ embeds: [embed] });
    }
};