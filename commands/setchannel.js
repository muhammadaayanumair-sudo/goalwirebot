const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { setChannel } = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
     .setName('setchannel')
     .setDescription('Set channel for auto football updates')
     .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
     .addChannelOption(opt => opt.setName('channel').setDescription('Channel to post in').addChannelTypes(ChannelType.GuildText).setRequired(true))
     .addBooleanOption(opt => opt.setName('fixtures').setDescription('Auto post fixtures'))
     .addBooleanOption(opt => opt.setName('news').setDescription('Auto post news'))
     .addBooleanOption(opt => opt.setName('topscorers').setDescription('Auto post top scorers'))
     .addBooleanOption(opt => opt.setName('transfers').setDescription('Auto post transfers'))
     .addBooleanOption(opt => opt.setName('highlights').setDescription('Auto post highlights'))
     .addBooleanOption(opt => opt.setName('lineups').setDescription('Auto post lineups'))
     .addStringOption(opt => opt.setName('league').setDescription('League: PL, CL, BL1, SA, PD')),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const settings = {
            fixtures: interaction.options.getBoolean('fixtures')? 1 : 0,
            transfers: interaction.options.getBoolean('transfers')? 1 : 0,
            news: interaction.options.getBoolean('news')? 1 : 0,
            topscorers: interaction.options.getBoolean('topscorers')? 1 : 0,
            highlights: interaction.options.getBoolean('highlights')? 1 : 0,
            lineups: interaction.options.getBoolean('lineups')? 1 : 0,
            league: interaction.options.getString('league') || 'PL'
        };

        setChannel(interaction.guildId, channel.id, settings);

        const enabled = Object.entries(settings)
         .filter(([k, v]) => v === 1 && k!== 'league')
         .map(([k]) => `✅ ${k}`)
         .join('\n') || 'None selected';

        const embed = new EmbedBuilder()
         .setColor(0x00BFFF)
         .setTitle('✅ Auto-Posting Configured')
         .setDescription(`Goalwire will now post to ${channel}`)
         .addFields(
                { name: 'Enabled Feeds', value: enabled, inline: true },
                { name: 'League', value: settings.league, inline: true }
            )
         .setFooter({ text: 'Use /setchannel again to change settings' });

        await interaction.reply({ embeds: [embed] });
    }
};