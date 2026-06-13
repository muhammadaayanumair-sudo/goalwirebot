const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('team').setDescription('Team info').addStringOption(opt => opt.setName('name').setRequired(true)),
    async execute(interaction) {
        const name = interaction.options.getString('name');
        const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle(`🏟️ ${name}`)
       .setDescription('**Founded:** 1880\n**Stadium:** Etihad Stadium\n**Manager:** Pep Guardiola\n**League:** Premier League')
       .setFooter({ text: 'Add API-Football for live data' });
        await interaction.reply({ embeds: [embed] });
    }
};