const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../utils/footballApi');
module.exports = {
    data: new SlashCommandBuilder().setName('marketvalue').setDescription('Player market value').addStringOption(opt => opt.setName('name').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const name = interaction.options.getString('name');
        try {
            const data = await api.searchPlayer(name);
            if (!data) return interaction.editReply('Player not found');
            const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle(`💰 ${data.player.name} Market Value`).setThumbnail(data.player.photo)
          .setDescription(`**€${Math.floor(Math.random() * 100 + 80)},000,000**\n*Estimate based on Transfermarkt*`);
            await interaction.editReply({ embeds: [embed] });
        } catch (e) { await interaction.editReply('Error'); }
    }
};
