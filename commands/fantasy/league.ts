import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import FantasyService from '../../services/fantasy/FantasyService';
import { Colors } from '../../config/colors';
import { EMOJIS, FANTASY_LIMITS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('league')
    .setDescription('Manage fantasy leagues')
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a new fantasy league')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('League name')
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(50),
        )
        .addStringOption(opt =>
          opt.setName('description')
            .setDescription('League description')
            .setRequired(false)
            .setMaxLength(200),
        )
        .addStringOption(opt =>
          opt.setName('type')
            .setDescription('League type')
            .setRequired(false)
            .addChoices(
              { name: 'Public', value: 'public' },
              { name: 'Private', value: 'private' },
            ),
        )
        .addIntegerOption(opt =>
          opt.setName('max_players')
            .setDescription('Max participants')
            .setRequired(false)
            .setMinValue(2)
            .setMaxValue(FANTASY_LIMITS.MAX_PARTICIPANTS_PER_LEAGUE),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('join')
        .setDescription('Join a league using its code')
        .addStringOption(opt =>
          opt.setName('code')
            .setDescription('League invite code')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('leave')
        .setDescription('Leave your current league'),
    )
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('View league info')
        .addStringOption(opt =>
          opt.setName('code')
            .setDescription('League code')
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all your leagues'),
    )
    .addSubcommand(sub =>
      sub.setName('invite')
        .setDescription('Get league invite code')
        .addStringOption(opt =>
          opt.setName('code')
            .setDescription('League code')
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Delete your league (owner only)'),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'create': return handleCreate(interaction);
      case 'join': return handleJoin(interaction);
      case 'leave': return handleLeave(interaction);
      case 'info': return handleInfo(interaction);
      case 'list': return handleList(interaction);
      case 'invite': return handleInvite(interaction);
      case 'delete': return handleDelete(interaction);
    }
  },
};

async function handleCreate(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const name = interaction.options.getString('name', true);
  const description = interaction.options.getString('description') || undefined;
  const type = interaction.options.getString('type') as 'public' | 'private' | null || 'private';
  const maxPlayers = interaction.options.getInteger('max_players') || FANTASY_LIMITS.MAX_PARTICIPANTS_PER_LEAGUE;

  const result = await FantasyService.createLeague(interaction.user.id, name, { description, type, maxPlayers });

  if (!result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Creation Failed', result.error || 'Could not create league.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.SUCCESS} League Created!`,
    `**${name}** is ready for competitors.`,
  )
    .addFields(
      { name: 'Code', value: `\`${result.league.code}\``, inline: true },
      { name: 'Type', value: type.charAt(0).toUpperCase() + type.slice(1), inline: true },
      { name: 'Max Players', value: `${maxPlayers}`, inline: true },
      { name: 'Invite Link', value: `Share the code \`${result.league.code}\` or use the button below.`, inline: false },
    )
    .setColor(Colors.SUCCESS);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`league_join_${result.league.code}`)
        .setLabel('Quick Join')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`league_info_${result.league.code}`)
        .setLabel('League Info')
        .setEmoji(EMOJIS.INFO)
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleJoin(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const code = interaction.options.getString('code', true).toUpperCase();
  const result = await FantasyService.joinLeague(interaction.user.id, code);

  if (!result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Join Failed', result.error || 'Could not join league.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.SUCCESS} Joined League!`,
    `You have joined **${result.league.name}**.`,
  )
    .addFields(
      { name: 'Participants', value: `${result.league.memberCount}/${result.league.maxPlayers}`, inline: true },
      { name: 'Your Rank', value: `#${result.initialRank}`, inline: true },
    )
    .setColor(Colors.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

async function handleLeave(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const result = await FantasyService.leaveLeague(interaction.user.id);

  if (!result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Error', result.error || 'Could not leave league.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.INFO} League Left`,
    `You have left **${result.leagueName}**.`,
  ).setColor(Colors.WARNING);

  await interaction.editReply({ embeds: [embed] });
}

async function handleInfo(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const code = interaction.options.getString('code');
  const league = code
    ? await FantasyService.getLeagueByCode(code)
    : await FantasyService.getUserLeague(interaction.user.id);

  if (!league) {
    await interaction.editReply({
      embeds: [createErrorEmbed(
        'Not Found',
        code ? 'Invalid league code.' : 'You are not in any league.',
      )],
    });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.TROPHY} ${league.name}`,
    league.description || 'No description set.',
  )
    .addFields(
      { name: 'Code', value: `\`${league.code}\``, inline: true },
      { name: 'Type', value: league.type.charAt(0).toUpperCase() + league.type.slice(1), inline: true },
      { name: 'Participants', value: `${league.memberCount}/${league.maxPlayers}`, inline: true },
      { name: 'Owner', value: `<@${league.ownerId}>`, inline: true },
      { name: 'Created', value: `<t:${Math.floor(league.createdAt.getTime() / 1000)}:R>`, inline: true },
    )
    .setColor(Colors.PRIMARY);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`lb_league_${league.code}`)
        .setLabel('Leaderboard')
        .setEmoji(EMOJIS.CHART)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`league_share_${league.code}`)
        .setLabel('Share')
        .setEmoji('📤')
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const leagues = await FantasyService.getUserLeagues(interaction.user.id);

  if (!leagues || leagues.length === 0) {
    await interaction.editReply({
      embeds: [createErrorEmbed('No Leagues', 'You are not in any leagues. Create one with `/league create` or join with `/league join`.')],
    });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.TROPHY} Your Leagues`,
    `You are in ${leagues.length} league(s).`,
  )
    .setColor(Colors.PRIMARY);

  const list = leagues.map((l, i) =>
    `**${i + 1}.** ${l.name} \`${l.code}\` | ${l.memberCount}/${l.maxPlayers} | Rank: #${l.userRank || '?'}`,
  );

  embed.setDescription(list.join('\n'));
  await interaction.editReply({ embeds: [embed] });
}

async function handleInvite(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const code = interaction.options.getString('code');
  const league = code
    ? await FantasyService.getLeagueByCode(code)
    : await FantasyService.getUserLeague(interaction.user.id);

  if (!league) {
    await interaction.editReply({ embeds: [createErrorEmbed('Not Found', 'League not found.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.INFO} Invite — ${league.name}`,
    'Share the code below to invite others.',
  )
    .addFields(
      { name: 'League Code', value: `\`${league.code}\``, inline: true },
      { name: 'Join Command', value: `\`/league join code:${league.code}\``, inline: false },
      { name: 'Participants', value: `${league.memberCount}/${league.maxPlayers}`, inline: true },
      { name: 'Link', value: `https://goalx.gg/join/${league.code}`, inline: true },
    )
    .setColor(Colors.INFO);

  await interaction.editReply({ embeds: [embed] });
}

async function handleDelete(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const result = await FantasyService.deleteLeague(interaction.user.id);

  if (!result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Error', result.error || 'Only the league owner can delete.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.SUCCESS} League Deleted`,
    `**${result.leagueName}** has been deleted.`,
  ).setColor(Colors.ERROR);

  await interaction.editReply({ embeds: [embed] });
}

export default command;
