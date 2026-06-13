const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('stadium').setDescription('Stadium info').addStringOption(opt => opt.setName('team').setRequired(true)),
    async execute(interaction) {
        const team = interaction.options.getString('team');
        const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle(`🏟️ ${team} Stadium`)
       .setDescription('**Name:** Etihad Stadium\n**Capacity:** 53,400\n**Built:** 2002\n**Location:** Manchester')
       .setFooter({ text: 'Mock data - Add API-Football for real' });
        await interaction.reply({ embeds: [embed] });
    }
};