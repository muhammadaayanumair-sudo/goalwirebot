import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import ScoutService from '../../services/fantasy/ScoutService';
import { Colors } from '../../config/colors';
import { EMOJIS, COOLDOWNS } from '../../config/constants';
import { createEmbed, createErrorEmbed, createLoadingEmbed } from '../../utils/embeds';
import { formatPrice, formatPosition, formatRating } from '../../utils/formatter';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('scout')
    .setDescription('Browse and search available players')
    .addSubcommand(sub =>
      sub.setName('search')
        .setDescription('Search for players')
        .addStringOption(opt =>
          opt.setName('query')
            .setDescription('Player name')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('position')
        .setDescription('Browse players by position')
        .addStringOption(opt =>
          opt.setName('position')
            .setDescription('Position filter')
            .setRequired(true)
            .addChoices(
              { name: 'Goalkeeper', value: 'Goalkeeper' },
              { name: 'Defender', value: 'Defender' },
              { name: 'Midfielder', value: 'Midfielder' },
              { name: 'Forward', value: 'Forward' },
            ),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('top')
        .setDescription('Top rated players available'),
    )
    .addSubcommand(sub =>
      sub.setName('bargains')
        .setDescription('Best value players under budget'),
    )
    .addSubcommand(sub =>
      sub.setName('league')
        .setDescription('Browse players by real league')
        .addIntegerOption(opt =>
          opt.setName('league_id')
            .setDescription('League ID (default: Premier League 39)')
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('similar')
        .setDescription('Find similar players')
        .addStringOption(opt =>
          opt.setName('player')
            .setDescription('Player name')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('form')
        .setDescription('Players in hot form'),
    ),

  cooldown: COOLDOWNS.SCOUT,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'search': return handleSearch(interaction);
      case 'position': return handlePosition(interaction);
      case 'top': return handleTop(interaction);
      case 'bargains': return handleBargains(interaction);
      case 'league': return handleLeague(interaction);
      case 'similar': return handleSimilar(interaction);
      case 'form': return handleForm(interaction);
    }
  },

  async autocomplete(interaction): Promise<void> {
    const focused = interaction.options.getFocused(true);
    const players = await ScoutService.searchPlayers(focused.value as string);
    await interaction.respond(
      players.slice(0, 25).map(p => ({
        name: `${p.name} — ${p.team} — ${formatPrice(p.price)} — ${p.form}/10`,
        value: p.id,
      })),
    );
  },
};

async function handleSearch(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const query = interaction.options.getString('query', true);
  const results = await ScoutService.searchPlayers(query);

  if (results.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Results', `No players found for "${query}".`) }]);
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.SCOUT} Scout Results`,
    `Found ${results.length} player(s) for "${query}"`,
  ).setColor(Colors.INFO);

  const entries = results.slice(0, 20).map(p =>
    `**${p.name}** | ${formatPosition(p.position)} | ${p.team} | ${formatPrice(p.price)} | Form: ${p.form}/10 | ${p.predictedPoints}P`,
  );

  embed.setDescription(entries.join('\n'));
  embed.addFields({ name: 'Total Results', value: `${results.length}`, inline: true });

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('scout_refresh')
        .setLabel('Refresh')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handlePosition(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const position = interaction.options.getString('position', true);
  const players = await ScoutService.getPlayersByPosition(position);

  if (players.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Players', `No ${position}s available.`) }]);
    return;
  }

  const positionEmoji = position === 'Goalkeeper' ? '🧤' : position === 'Defender' ? '🛡️' : position === 'Midfielder' ? '🎯' : '⚽';

  const embed = createEmbed(
    `${positionEmoji} ${position}s`,
    `Top ${position}s available in the market.`,
  ).setColor(getPositionColor(position));

  const entries = players.slice(0, 25).map((p, i) =>
    `**${i + 1}.** ${p.name} — ${p.team} — ${formatPrice(p.price)} — Form: ${p.form}/10 — ${p.predictedPoints}P ${p.inYourSquad ? '✅' : ''}`,
  );

  embed.setDescription(entries.join('\n'));
  embed.addFields({ name: 'Available', value: `${players.length}`, inline: true });

  await interaction.editReply({ embeds: [embed] });
}

async function handleTop(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const players = await ScoutService.getTopPlayers();

  if (players.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Data', 'No top players data available.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.STAR} Top Rated Players`,
    'Highest rated players available for transfer.',
  ).setColor(Colors.GOLD);

  const entries = players.slice(0, 25).map((p, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    return `${medal} **${p.name}** | ${formatPosition(p.position)} | ${p.team} | ${formatPrice(p.price)} | Rating: ${p.rating.toFixed(1)} | ${p.predictedPoints}P`;
  });

  embed.setDescription(entries.join('\n'));

  await interaction.editReply({ embeds: [embed] });
}

async function handleBargains(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const players = await ScoutService.getBargainPlayers();

  if (players.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Bargains', 'No bargain players found.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.MONEY} Best Bargains`,
    'Best value players — low price, high potential.',
  ).setColor(Colors.SUCCESS);

  const entries = players.slice(0, 25).map((p, i) =>
    `**${i + 1}.** ${p.name} | ${formatPosition(p.position)} | ${p.team} | ${formatPrice(p.price)} | Value: ${p.valueRating}/10 | ${p.predictedPoints}P`,
  );

  embed.setDescription(entries.join('\n'));

  await interaction.editReply({ embeds: [embed] });
}

async function handleLeague(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const leagueId = interaction.options.getInteger('league_id') || 39;
  const players = await ScoutService.getPlayersByLeague(leagueId);

  if (players.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Players', 'No players found for this league.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.SCOUT} League Players`,
    `Players from league ID ${leagueId}.`,
  ).setColor(Colors.PRIMARY);

  const entries = players.slice(0, 25).map((p, i) =>
    `**${i + 1}.** ${p.name} | ${formatPosition(p.position)} | ${p.team} | ${formatPrice(p.price)} | ${p.predictedPoints}P`,
  );

  embed.setDescription(entries.join('\n'));
  embed.addFields({ name: 'Total', value: `${players.length}`, inline: true });

  await interaction.editReply({ embeds: [embed] });
}

async function handleSimilar(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const playerId = interaction.options.getString('player', true);
  const players = await ScoutService.findSimilarPlayers(playerId);

  if (players.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('Not Found', 'Player not found or no similar players.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.SCOUT} Similar Players`,
    `Players similar to **${players[0].reference}**.`,
  ).setColor(Colors.INFO);

  const entries = players.slice(0, 15).map((p, i) =>
    `**${i + 1}.** ${p.name} | ${formatPosition(p.position)} | ${p.team} | ${formatPrice(p.price)} | Similarity: ${(p.similarity * 100).toFixed(0)}%`,
  );

  embed.setDescription(entries.join('\n'));

  await interaction.editReply({ embeds: [embed] });
}

async function handleForm(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const players = await ScoutService.getPlayersInForm();

  if (players.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Data', 'No form data available.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.FIRE} Players in Form`,
    'Hottest players based on recent performances.',
  ).setColor(Colors.WARNING);

  const entries = players.slice(0, 25).map((p, i) =>
    `**${i + 1}.** ${p.name} | ${formatPosition(p.position)} | ${p.team} | Form: ${p.form}/10 | Last 5: ${p.last5Form} | ${p.predictedPoints}P`,
  );

  embed.setDescription(entries.join('\n'));

  await interaction.editReply({ embeds: [embed] });
}

function getPositionColor(position: string): number {
  switch (position) {
    case 'Goalkeeper': return Colors.SAVE;
    case 'Defender': return Colors.CLEAN_SHEET;
    case 'Midfielder': return Colors.ASSIST;
    case 'Forward': return Colors.GOAL;
    default: return Colors.PRIMARY;
  }
}

export default command;
