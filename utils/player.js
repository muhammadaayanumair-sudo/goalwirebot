const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('player').setDescription('Player info').addStringOption(opt => opt.setName('name').setRequired(true)),
    async execute(interaction) {
        const name = interaction.options.getString('name');
        const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle(`👤 ${name}`)
        .setDescription('**Position:** Forward\n**Age:** 23\n**Nationality:** Norway\n**Club:** Man City')
        .addFields({ name: 'Season Goals', value: '28', inline: true }, { name: 'Assists', value: '5', inline: true }, { name: 'Rating', value: '91', inline: true })
        .setFooter({ text: 'football-data.org free tier lacks player search. Add API-Football for real data' });
        await interaction.reply({ embeds: [embed] });
    }
};