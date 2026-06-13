const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('trade').setDescription('Trade cards with a user').addUserOption(opt => opt.setName('user').setRequired(true)),
    async execute(interaction) {
        const target = interaction.options.getUser('user');
        if (target.id === interaction.user.id) return interaction.reply({ content: 'Can\'t trade with yourself', ephemeral: true });
        const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle('🔄 Trade Request').setDescription(`${interaction.user} wants to trade with ${target}`);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`trade_accept_${interaction.user.id}`).setLabel('Accept').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('trade_decline').setLabel('Decline').setStyle(ButtonStyle.Danger)
        );
        await interaction.reply({ content: `${target}`, embeds: [embed], components: [row] });
    }
};