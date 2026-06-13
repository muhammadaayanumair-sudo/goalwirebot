const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('market').setDescription('Card market'),
    async execute(interaction) {
        const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle('🛒 Card Market')
       .setDescription('**Haaland 91 OVR** - 50,000 coins by @User1\n**Mbappe 91 OVR** - 48,000 coins by @User2\n**Bellingham 90 OVR** - 35,000 coins by @User3')
       .setFooter({ text: 'Use /buy to purchase - Coming soon' });
        await interaction.reply({ embeds: [embed] });
    }
};