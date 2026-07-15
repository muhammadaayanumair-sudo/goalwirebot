import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import PlayerService from '../../services/football/PlayerService';
import TeamService from '../../services/football/TeamService';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed, createLoadingEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('compare')
    .setDescription('Compare two teams or players')
    .addSubcommand(sub =>
      sub.setName('players')
        .setDescription('Compare two players')
        .addStringOption(opt =>
          opt.setName('player_1')
            .setDescription('First player')
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption(opt =>
          opt.setName('player_2')
            .setDescription('Second player')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('teams')
        .setDescription('Compare two teams')
        .addStringOption(opt =>
          opt.setName('team_1')
            .setDescription('First team')
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption(opt =>
          opt.setName('team_2')
            .setDescription('Second team')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('headtohead')
        .setDescription('Head-to-head between two teams')
        .addStringOption(opt =>
          opt.setName('team_1')
            .setDescription('First team')
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption(opt =>
          opt.setName('team_2')
            .setDescription('Second team')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'players': return handlePlayers(interaction);
      case 'teams': return handleTeams(interaction);
      case 'headtohead': return handleHeadToHead(interaction);
    }
  },

  async autocomplete(interaction): Promise<void> {
    const focused = interaction.options.getFocused(true);
    const name = (focused.value as string).toLowerCase();

    if (focused.name.startsWith('player')) {
      const players = await PlayerService.searchPlayers(name);
      await interaction.respond(
        players.slice(0, 25).map(p => ({
          name: `${p.name} — ${p.team} | ${p.position}`,
          value: p.name,
        })),
      );
    } else {
      const teams = await TeamService.searchTeams(name);
      await interaction.respond(
        teams.slice(0, 25).map(t => ({
          name: `${t.name} (${t.country || ''})`,
          value: t.name,
        })),
      );
    }
  },
};

async function handlePlayers(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  await interaction.editReply({ embeds: [createLoadingEmbed('Comparing players...')] });

  const name1 = interaction.options.getString('player_1', true);
  const name2 = interaction.options.getString('player_2', true);
  const comparison = await PlayerService.comparePlayers(name1, name2);

  if (!comparison) {
    await interaction.editReply({ embeds: [createErrorEmbed('Comparison Failed', 'Could not compare these players. Check the names and try again.')] });
    return;
  }

  const embed = createEmbed(
    `⚔️ Player Comparison`,
    `${comparison.player1.name} vs ${comparison.player2.name}`,
  ).setColor(Colors.PRIMARY);

  embed.addFields(
    { name: comparison.player1.name, value: [
      `Position: ${comparison.player1.position}`,
      `Team: ${comparison.player1.team}`,
      `Age: ${comparison.player1.age || 'N/A'}`,
      `Apps: ${comparison.player1.appearances || 0}`,
      `Goals: ${comparison.player1.goals || 0}`,
      `Assists: ${comparison.player1.assists || 0}`,
      `Rating: ${comparison.player1.rating || 0}/10`,
    ].join('\n'), inline: true },
    { name: comparison.player2.name, value: [
      `Position: ${comparison.player2.position}`,
      `Team: ${comparison.player2.team}`,
      `Age: ${comparison.player2.age || 'N/A'}`,
      `Apps: ${comparison.player2.appearances || 0}`,
      `Goals: ${comparison.player2.goals || 0}`,
      `Assists: ${comparison.player2.assists || 0}`,
      `Rating: ${comparison.player2.rating || 0}/10`,
    ].join('\n'), inline: true },
  );

  if (comparison.winner) {
    embed.addFields({ name: '🏆 Advantage', value: `**${comparison.winner}** ${comparison.reason || ''}`, inline: false });
  }

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`player_${comparison.player1.id}`)
        .setLabel(comparison.player1.name.split(' ').pop() || 'P1')
        .setEmoji(EMOJIS.GOAL)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`player_${comparison.player2.id}`)
        .setLabel(comparison.player2.name.split(' ').pop() || 'P2')
        .setEmoji(EMOJIS.GOAL)
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleTeams(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  await interaction.editReply({ embeds: [createLoadingEmbed('Comparing teams...')] });

  const name1 = interaction.options.getString('team_1', true);
  const name2 = interaction.options.getString('team_2', true);
  const comparison = await TeamService.compareTeams(name1, name2);

  if (!comparison) {
    await interaction.editReply({ embeds: [createErrorEmbed('Comparison Failed', 'Could not compare these teams.')] });
    return;
  }

  const embed = createEmbed(
    `⚔️ Team Comparison`,
    `${comparison.team1.name} vs ${comparison.team2.name}`,
  )
    .setThumbnail(comparison.team1.badge || '')
    .setColor(Colors.PRIMARY);

  embed.addFields(
    { name: `🏠 ${comparison.team1.name}`, value: [
      `League: ${comparison.team1.league || 'N/A'}`,
      `Position: #${comparison.team1.position || 'N/A'}`,
      `Points: ${comparison.team1.points || 0}`,
      `Form: ${(comparison.team1.form || '').slice(-5).split('').map(c => c === 'W' ? '✅' : c === 'D' ? '➖' : '❌').join('') || 'N/A'}`,
      `Goals For: ${comparison.team1.goalsFor || 0}`,
      `Goals Against: ${comparison.team1.goalsAgainst || 0}`,
      `Avg Possession: ${comparison.team1.avgPossession || 0}%`,
    ].join('\n'), inline: true },
    { name: `✈️ ${comparison.team2.name}`, value: [
      `League: ${comparison.team2.league || 'N/A'}`,
      `Position: #${comparison.team2.position || 'N/A'}`,
      `Points: ${comparison.team2.points || 0}`,
      `Form: ${(comparison.team2.form || '').slice(-5).split('').map(c => c === 'W' ? '✅' : c === 'D' ? '➖' : '❌').join('') || 'N/A'}`,
      `Goals For: ${comparison.team2.goalsFor || 0}`,
      `Goals Against: ${comparison.team2.goalsAgainst || 0}`,
      `Avg Possession: ${comparison.team2.avgPossession || 0}%`,
    ].join('\n'), inline: true },
  );

  if (comparison.h2h) {
    embed.addFields({ name: '⚔️ Head-to-Head', value: `${comparison.h2h.team1Wins}W ${comparison.h2h.draws}D ${comparison.h2h.team2Wins}L | Last: ${comparison.h2h.lastResult}`, inline: false });
  }

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`team_${comparison.team1.id}`)
        .setLabel(comparison.team1.name)
        .setEmoji(EMOJIS.INFO)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`team_${comparison.team2.id}`)
        .setLabel(comparison.team2.name)
        .setEmoji(EMOJIS.INFO)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`compare_h2h_${comparison.team1.id}_${comparison.team2.id}`)
        .setLabel('Full H2H')
        .setEmoji('⚔️')
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleHeadToHead(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const name1 = interaction.options.getString('team_1', true);
  const name2 = interaction.options.getString('team_2', true);
  const h2h = await TeamService.getHeadToHead(name1, name2);

  if (!h2h) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Data', `No head-to-head data for ${name1} vs ${name2}.`) }] });
    return;
  }

  const embed = createEmbed(
    `⚔️ Head-to-Head: ${h2h.team1} vs ${h2h.team2}`,
    `${h2h.totalMatches} meetings | ${h2h.team1Wins}W ${h2h.draws}D ${h2h.team2Wins}L`,
  ).setColor(Colors.WARNING);

  embed.addFields(
    { name: h2h.team1, value: `Wins: ${h2h.team1Wins}\nHome Wins: ${h2h.team1HomeWins}\nAway Wins: ${h2h.team1AwayWins}\nGoals: ${h2h.team1Goals}`, inline: true },
    { name: h2h.team2, value: `Wins: ${h2h.team2Wins}\nHome Wins: ${h2h.team2HomeWins}\nAway Wins: ${h2h.team2AwayWins}\nGoals: ${h2h.team2Goals}`, inline: true },
  );

  if (h2h.lastMeetings && h2h.lastMeetings.length > 0) {
    embed.addFields({
      name: '📋 Last 5 Meetings',
      value: h2h.lastMeetings.map(m => `**${m.date}:** ${m.home} ${m.homeScore}—${m.awayScore} ${m.away} ${m.competition}`).join('\n'),
      inline: false,
    });
  }

  if (h2h.biggestWin) {
    embed.addFields({ name: '📊 Biggest Win', value: h2h.biggestWin, inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}

export default command;
