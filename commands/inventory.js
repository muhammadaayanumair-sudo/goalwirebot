const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../utils/database');
module.exports = {
    data: new SlashCommandBuilder().setName('inventory').setDescription('Your card collection'),
    async execute(interaction) {
        db.all(`SELECT player_name, rating, COUNT(*) as count FROM cards WHERE user_id =? GROUP BY player_name, rating ORDER BY rating DESC`, [interaction.user.id], (err, rows) => {
            if (err ||!rows.length) return interaction.reply('Your inventory is empty. Use `/pack` to open cards!');
            const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle(`🎒 ${interaction.user.username}'s Inventory`)
           .setDescription(rows.map(r => `**${r.player_name}** - ${r.rating} OVR ${r.count > 1? `x${r.count}` : ''}`).join('\n'));
            interaction.reply({ embeds: [embed] });
        });
    }
};