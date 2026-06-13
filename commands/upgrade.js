const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('upgrade').setDescription('Upgrade a card').addStringOption(opt => opt.setName('player').setRequired(true)),
    async execute(interaction) {
        const player = interaction.options.getString('player');
        await interaction.reply(`Upgraded ${player}! +1 OVR. Cost: 5,000 coins. [System not fully implemented - needs coin balance DB]`);
    }
};