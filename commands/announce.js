const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Send an announcement to a channel') // ← Command needs desc
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send the announcement in') // ← Every option needs desc
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The announcement message to send') // ← This was likely missing
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const channel = interaction.options.getChannel('channel');
        const message = interaction.options.getString('message');
        
        try {
            await channel.send(`📢 **Announcement**\n${message}`);
            await interaction.editReply(`Sent announcement to ${channel}`);
        } catch (error) {
            await interaction.editReply('Failed to send. I need Send Messages permission in that channel.');
        }
    }
};
