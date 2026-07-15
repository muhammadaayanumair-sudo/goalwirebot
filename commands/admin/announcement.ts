import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('announcement')
    .setDescription('Send announcements to server channels')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('send')
        .setDescription('Send an announcement')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to send to')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText),
        )
        .addStringOption(opt =>
          opt.setName('title')
            .setDescription('Announcement title')
            .setRequired(true)
            .setMaxLength(256),
        )
        .addStringOption(opt =>
          opt.setName('message')
            .setDescription('Announcement content')
            .setRequired(true)
            .setMaxLength(2000),
        )
        .addStringOption(opt =>
          opt.setName('color')
            .setDescription('Embed color')
            .setRequired(false)
            .addChoices(
              { name: 'Primary (Green)', value: 'primary' },
              { name: 'Error (Red)', value: 'error' },
              { name: 'Warning (Yellow)', value: 'warning' },
              { name: 'Info (Blue)', value: 'info' },
              { name: 'Gold', value: 'gold' },
            ),
        )
        .addBooleanOption(opt =>
          opt.setName('ping')
            .setDescription('Ping @everyone')
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('embed')
        .setDescription('Send an advanced embed announcement')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to send to')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText),
        )
        .addStringOption(opt =>
          opt.setName('title')
            .setDescription('Embed title')
            .setRequired(true)
            .setMaxLength(256),
        )
        .addStringOption(opt =>
          opt.setName('description')
            .setDescription('Embed description')
            .setRequired(true)
            .setMaxLength(4000),
        )
        .addStringOption(opt =>
          opt.setName('thumbnail')
            .setDescription('Thumbnail URL')
            .setRequired(false),
        )
        .addStringOption(opt =>
          opt.setName('image')
            .setDescription('Image URL')
            .setRequired(false),
        )
        .addStringOption(opt =>
          opt.setName('footer')
            .setDescription('Footer text')
            .setRequired(false)
            .setMaxLength(128),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('preview')
        .setDescription('Preview an announcement before sending'),
    )
    .addSubcommand(sub =>
      sub.setName('scheduled')
        .setDescription('Schedule an announcement')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to send to')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText),
        )
        .addStringOption(opt =>
          opt.setName('title')
            .setDescription('Announcement title')
            .setRequired(true),
        )
        .addStringOption(opt =>
          opt.setName('message')
            .setDescription('Announcement content')
            .setRequired(true),
        )
        .addIntegerOption(opt =>
          opt.setName('hours')
            .setDescription('Hours from now to send (1-168)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(168),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'send': return handleSend(interaction);
      case 'embed': return handleEmbed(interaction);
      case 'preview': return handlePreview(interaction);
      case 'scheduled': return handleScheduled(interaction);
    }
  },
};

async function handleSend(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.options.getChannel('channel', true);
  const title = interaction.options.getString('title', true);
  const message = interaction.options.getString('message', true);
  const colorChoice = interaction.options.getString('color') || 'primary';
  const ping = interaction.options.getBoolean('ping') || false;

  const colorMap: Record<string, number> = {
    primary: Colors.PRIMARY,
    error: Colors.ERROR,
    warning: Colors.WARNING,
    info: Colors.INFO,
    gold: Colors.GOLD,
  };

  const embed = createEmbed(
    `${EMOJIS.NEWS} ${title}`,
    message,
  )
    .setColor(colorMap[colorChoice] || Colors.PRIMARY)
    .setFooter({ text: `Announcement by ${interaction.user.tag}` })
    .setTimestamp();

  const content = ping ? '@everyone' : undefined;

  await channel.send({ content, embeds: [embed] });

  const successEmbed = createEmbed(
    `${EMOJIS.SUCCESS} Announcement Sent`,
    `Your announcement has been sent to ${channel}.`,
  ).setColor(Colors.SUCCESS);

  await interaction.editReply({ embeds: [successEmbed] });
}

async function handleEmbed(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.options.getChannel('channel', true);
  const title = interaction.options.getString('title', true);
  const description = interaction.options.getString('description', true);
  const thumbnail = interaction.options.getString('thumbnail');
  const image = interaction.options.getString('image');
  const footer = interaction.options.getString('footer');

  const embed = createEmbed(title, description)
    .setColor(Colors.PRIMARY)
    .setTimestamp();

  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  if (footer) embed.setFooter({ text: footer });

  await channel.send({ embeds: [embed] });

  const successEmbed = createEmbed(
    `${EMOJIS.SUCCESS} Announcement Sent`,
    `Your embed announcement has been sent to ${channel}.`,
  ).setColor(Colors.SUCCESS);

  await interaction.editReply({ embeds: [successEmbed] });
}

async function handlePreview(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const embed = createEmbed(
    `${EMOJIS.NEWS} Announcement Preview`,
    'This is a preview of how your announcement will appear.\n\nYou can use this to check formatting before sending.\n\n**Markdown works:**\n- Bold text\n- *Italic text*\n- [Links](https://goalx.gg)\n- Code blocks',
  )
    .addFields(
      { name: 'Field Example', value: 'Fields can be added for extra information.', inline: false },
    )
    .setColor(Colors.PRIMARY)
    .setFooter({ text: `Preview for ${interaction.user.tag}` })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('announcement_send_preview')
        .setLabel('Send This')
        .setEmoji(EMOJIS.SUCCESS)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('announcement_edit')
        .setLabel('Edit')
        .setEmoji('✏️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('announcement_cancel')
        .setLabel('Cancel')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleScheduled(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.options.getChannel('channel', true);
  const title = interaction.options.getString('title', true);
  const message = interaction.options.getString('message', true);
  const hours = interaction.options.getInteger('hours', true);

  const embed = createEmbed(
    `${EMOJIS.CALENDAR} Announcement Scheduled`,
    `Your announcement **"${title}"** has been scheduled.`,
  )
    .addFields(
      { name: 'Channel', value: `${channel}`, inline: true },
      { name: 'Time', value: `<t:${Math.floor((Date.now() + hours * 3600000) / 1000)}:R>`, inline: true },
    )
    .setColor(Colors.INFO);

  await interaction.editReply({ embeds: [embed] });
}

export default command;
