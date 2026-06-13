const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('announce').setDescription('Send announcement')
   .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
   .addChannelOption(opt => opt.setName('channel').setRequired(true))
   .addStringOption(opt => opt.setName('message').setRequired(true)),
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const message = interaction.options.getString('message');
        const embed = new EmbedBuilder().setColor(0xFF0000).setTitle('📢 Announcement').setDescription(message).setTimestamp();
        await channel.send({ embeds: [embed] });
        await interaction.reply({ content: `Announcement sent to ${channel}`, ephemeral: true });
    }
};