const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../utils/footballApi');
module.exports = {
    data: new SlashCommandBuilder().setName('player').setDescription('Player info').addStringOption(opt => opt.setName('name').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const name = interaction.options.getString('name');
        try {
            const data = await api.searchPlayer(name);
            if (!data) return interaction.editReply('Player not found');
            const p = data.player, s = data.statistics[0];
            const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle(`👤 ${p.name}`).setThumbnail(p.photo)
          .setDescription(`**${p.age}yo ${p.nationality}** | ${s.team.name}`)
          .addFields(
                { name: 'Position', value: s.games.position, inline: true },
                { name: 'Apps', value: `${s.games.appearences}`, inline: true },
                { name: 'Goals', value: `${s.goals.total || 0}`, inline: true },
                { name: 'Assists', value: `${s.goals.assists || 0}`, inline: true },
                { name: 'Rating', value: `${s.games.rating || 'N/A'}`, inline: true },
                { name: 'Minutes', value: `${s.games.minutes}`, inline: true }
            );
            await interaction.editReply({ embeds: [embed] });
        } catch (e) { await interaction.editReply('Error - needs API-Football key'); }
    }
};
