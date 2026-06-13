const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../utils/database');
const PLAYERS = [{ name: 'Haaland', rating: 91 }, { name: 'Mbappe', rating: 91 }, { name: 'Bellingham', rating: 90 }, { name: 'Vinicius Jr', rating: 89 }];
module.exports = {
    data: new SlashCommandBuilder().setName('pack').setDescription('Open a free card pack'),
    async execute(interaction) {
        const player = PLAYERS[Math.floor(Math.random() * PLAYERS.length)];
        db.run(`INSERT INTO cards (user_id, player_name, rating) VALUES (?,?,?)`, [interaction.user.id, player.name, player.rating]);
        const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle('🎁 Pack Opened!').setDescription(`You pulled **${player.name}** - ${player.rating} OVR!`);
        await interaction.reply({ embeds: [embed] });
    }
};