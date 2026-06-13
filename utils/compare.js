const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('compare').setDescription('Compare 2 players').addStringOption(opt => opt.setName('p1').setRequired(true)).addStringOption(opt => opt.setName('p2').setRequired(true)),
    async execute(interaction) {
        const p1 = interaction.options.getString('p1');
        const p2 = interaction.options.getString('p2');
        const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle(`⚖️ ${p1} vs ${p2}`)
        .addFields(
            { name: p1, value: 'Goals: 28\nAssists: 5\nRating: 91', inline: true },
            { name: p2, value: 'Goals: 35\nAssists: 2\nRating: 91', inline: true }
         ).setFooter({ text: 'Mock data - Add API-Football for real stats' });
        await interaction.reply({ embeds: [embed] });
    }
};