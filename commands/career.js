const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../utils/football');
module.exports = {
    data: new SlashCommandBuilder().setName('career').setDescription('Player career stats').addStringOption(opt => opt.setName('name').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const name = interaction.options.getString('name');
        try {
            const data = await api.searchPlayer(name);
            if (!data) return interaction.editReply('Player not found');
            const p = data.player;
            const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle(`📈 ${p.name} Career`).setThumbnail(p.photo)
          .setDescription(`**Age:** ${p.age} | **Nationality:** ${p.nationality}\n**Height:** ${p.height} | **Weight:** ${p.weight}`)
          .addFields(data.statistics.map(s => ({ name: `${s.league.name} ${s.league.season}`, value: `Apps: ${s.games.appearences} | Goals: ${s.goals.total || 0}`, inline: true })));
            await interaction.editReply({ embeds: [embed] });
        } catch (e) { await interaction.editReply('Error - needs API-Football key'); }
    }
};