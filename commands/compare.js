const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../utils/footballApi');
module.exports = {
    data: new SlashCommandBuilder().setName('compare').setDescription('Compare 2 players').addStringOption(opt => opt.setName('p1').setRequired(true)).addStringOption(opt => opt.setName('p2').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const p1 = interaction.options.getString('p1');
        const p2 = interaction.options.getString('p2');
        try {
            const d1 = await api.searchPlayer(p1);
            const d2 = await api.searchPlayer(p2);
            if (!d1 ||!d2) return interaction.editReply('One or both players not found');
            const s1 = d1.statistics[0], s2 = d2.statistics[0];
            const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle(`⚖️ ${d1.player.name} vs ${d2.player.name}`)
          .addFields(
                { name: d1.player.name, value: `Goals: ${s1.goals.total || 0}\nAssists: ${s1.goals.assists || 0}\nRating: ${s1.games.rating || 'N/A'}`, inline: true },
                { name: d2.player.name, value: `Goals: ${s2.goals.total || 0}\nAssists: ${s2.goals.assists || 0}\nRating: ${s2.games.rating || 'N/A'}`, inline: true }
            );
            await interaction.editReply({ embeds: [embed] });
        } catch (e) { await interaction.editReply('Error - needs API-Football key'); }
    }
};
