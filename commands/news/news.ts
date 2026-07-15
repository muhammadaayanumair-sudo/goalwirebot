import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import NewsService from '../../services/news/NewsService';
import { Colors } from '../../config/colors';
import { EMOJIS, COOLDOWNS } from '../../config/constants';
import { createEmbed, createErrorEmbed, createLoadingEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('news')
    .setDescription('Latest football news')
    .addSubcommand(sub =>
      sub.setName('latest')
        .setDescription('Latest football headlines'),
    )
    .addSubcommand(sub =>
      sub.setName('search')
        .setDescription('Search football news')
        .addStringOption(opt =>
          opt.setName('query')
            .setDescription('Search term')
            .setRequired(true)
            .setMinLength(2),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('team')
        .setDescription('News about a specific team')
        .addStringOption(opt =>
          opt.setName('team')
            .setDescription('Team name')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('league')
        .setDescription('News for a specific league')
        .addIntegerOption(opt =>
          opt.setName('league_id')
            .setDescription('League ID')
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('player')
        .setDescription('News about a specific player')
        .addStringOption(opt =>
          opt.setName('player')
            .setDescription('Player name')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    ),

  cooldown: COOLDOWNS.NEWS_REFRESH,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'latest': return handleLatest(interaction);
      case 'search': return handleSearch(interaction);
      case 'team': return handleTeam(interaction);
      case 'league': return handleLeague(interaction);
      case 'player': return handlePlayer(interaction);
    }
  },

  async autocomplete(interaction): Promise<void> {
    const focused = interaction.options.getFocused(true);
    const results = await NewsService.autocomplete(focused.value as string);
    await interaction.respond(results.slice(0, 25));
  },
};

async function handleLatest(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  await interaction.editReply({ embeds: [createLoadingEmbed('Fetching latest football news...')] });

  const result = await NewsService.getLatestNews();

  if (!result || result.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No News', 'No news articles available right now.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.NEWS} Latest Football News`,
    `Top headlines from across the football world.`,
  ).setColor(Colors.PRIMARY);

  const entries = result.slice(0, 15).map((article, i) =>
    `**${i + 1}.** [${article.title}](${article.url})\n${article.source} • ${article.date}\n${article.description ? article.description.slice(0, 120) : ''}`,
  );

  embed.setDescription(entries.join('\n\n'));

  embed.setFooter({ text: `Powered by GNews • ${result.length} articles` });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('news_select')
    .setPlaceholder('Read article summary')
    .addOptions(
      result.slice(0, 25).map((a, i) => new StringSelectMenuOptionBuilder()
        .setLabel(`${(i + 1)}. ${a.title.slice(0, 50)}...`)
        .setValue(a.url)
        .setDescription(a.source),
      ),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  const buttonRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('news_refresh')
        .setLabel('Refresh')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('news_breaking')
        .setLabel('Breaking News')
        .setEmoji('🔴')
        .setStyle(ButtonStyle.Danger),
    );

  await interaction.editReply({ embeds: [embed], components: [row, buttonRow] });
}

async function handleSearch(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const query = interaction.options.getString('query', true);
  await interaction.editReply({ embeds: [createLoadingEmbed(`Searching news for "${query}"...`)] });

  const result = await NewsService.searchNews(query);

  if (!result || result.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Results', `No news found for "${query}".`) }] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.NEWS} News: "${query}"`,
    `${result.length} article(s) found.`,
  ).setColor(Colors.PRIMARY);

  const entries = result.slice(0, 15).map((article, i) =>
    `**${i + 1}.** [${article.title}](${article.url})\n${article.source} • ${article.date}`,
  );

  embed.setDescription(entries.join('\n\n'));

  await interaction.editReply({ embeds: [embed] });
}

async function handleTeam(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const teamName = interaction.options.getString('team', true);
  await interaction.editReply({ embeds: [createLoadingEmbed(`Fetching ${teamName} news...`)] });

  const result = await NewsService.getTeamNews(teamName);

  if (!result || result.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No News', `No recent news about ${teamName}.`) }] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.NEWS} ${teamName} News`,
    `Latest stories about ${teamName}.`,
  ).setColor(Colors.PRIMARY);

  const entries = result.slice(0, 15).map((article, i) =>
    `**${i + 1}.** [${article.title}](${article.url})\n${article.source} • ${article.date}`,
  );

  embed.setDescription(entries.join('\n\n'));

  await interaction.editReply({ embeds: [embed] });
}

async function handleLeague(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const leagueId = interaction.options.getInteger('league_id') || 39;
  const leagueName = getLeagueName(leagueId);
  await interaction.editReply({ embeds: [createLoadingEmbed(`Fetching ${leagueName} news...`)] });

  const result = await NewsService.getLeagueNews(leagueId);

  if (!result || result.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No News', `No recent news about ${leagueName}.`) }] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.NEWS} ${leagueName} News`,
    `Latest stories from ${leagueName}.`,
  ).setColor(Colors.PRIMARY);

  const entries = result.slice(0, 15).map((article, i) =>
    `**${i + 1}.** [${article.title}](${article.url})\n${article.source} • ${article.date}`,
  );

  embed.setDescription(entries.join('\n\n'));

  await interaction.editReply({ embeds: [embed] });
}

async function handlePlayer(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const playerName = interaction.options.getString('player', true);
  await interaction.editReply({ embeds: [createLoadingEmbed(`Fetching ${playerName} news...`)] });

  const result = await NewsService.getPlayerNews(playerName);

  if (!result || result.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No News', `No recent news about ${playerName}.`) }] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.NEWS} ${playerName} News`,
    `Latest stories about ${playerName}.`,
  ).setColor(Colors.PRIMARY);

  const entries = result.slice(0, 10).map((article, i) =>
    `**${i + 1}.** [${article.title}](${article.url})\n${article.source} • ${article.date}`,
  );

  embed.setDescription(entries.join('\n\n'));

  await interaction.editReply({ embeds: [embed] });
}

function getLeagueName(id: number): string {
  const names: Record<number, string> = {
    39: 'Premier League',
    140: 'La Liga',
    78: 'Bundesliga',
    135: 'Serie A',
    61: 'Ligue 1',
    2: 'Champions League',
  };
  return names[id] || `League ${id}`;
}

export default command;
