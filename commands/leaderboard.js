const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../utils/database');
module.exports = {
    data: new SlashCommandBuilder().setName('leaderboard').setDescription('Top card collectors'),
    async execute(interaction) {
        db.all(`SELECT user_id, MAX(rating) as best_rating, COUNT(*) as total_cards FROM cards GROUP BY user_id ORDER BY best_rating DESC, total_cards DESC LIMIT 10`, [], async (err, rows) => {
            if (err ||!rows.length) return interaction.reply('No cards claimed yet!');
            const embed = new EmbedBuilder().setColor(0xFFD700).setTitle('🏆 Card Leaderboard')
           .setDescription((await Promise.all(rows.map(async (r, i) => {
                const user = await interaction.client.users.fetch(r.user_id).catch(() => null);
                return `**${i + 1}.** ${user? user.username : 'Unknown'} - ${r.best_rating} OVR Best | ${r.total_cards} cards`;
            }))).join('\n'));
            interaction.reply({ embeds: [embed] });
        });
    }
};