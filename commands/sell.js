const { SlashCommandBuilder } = require('discord.js');
const { db } = require('../utils/database');
module.exports = {
    data: new SlashCommandBuilder().setName('sell').setDescription('Sell a card').addStringOption(opt => opt.setName('player').setRequired(true)),
    async execute(interaction) {
        const player = interaction.options.getString('player');
        db.run(`DELETE FROM cards WHERE user_id =? AND player_name =? LIMIT 1`, [interaction.user.id, player], function(err) {
            if (err || this.changes === 0) return interaction.reply({ content: `You don't have ${player}`, ephemeral: true });
            interaction.reply(`Sold ${player} for 2,500 coins! [Coin system not implemented yet]`);
        });
    }
};