import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import FantasyService from '../../services/fantasy/FantasyService';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed, createLoadingEmbed } from '../../utils/embeds';
import { formatPrice } from '../../utils/formatter';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('kickoff')
    .setDescription('View upcoming or active challenge matchups')
    .addSubcommand(sub =>
      sub.setName('next')
        .setDescription('Your next scheduled challenge'),
    )
    .addSubcommand(sub =>
      sub.setName('active')
        .setDescription('Currently active challenges this gameweek'),
    )
    .addSubcommand(sub =>
      sub.setName('all')
        .setDescription('All challenges happening this gameweek'),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'next': return handleNext(interaction);
      case 'active': return handleActive(interaction);
      case 'all': return handleAll(interaction);
    }
  },
};

async function handleNext(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const matchup = await FantasyService.getNextChallenge(interaction.user.id);

  if (!matchup) {
    await interaction.editReply({
      embeds: [createErrorEmbed('No Upcoming Challenge', 'You have no scheduled challenges. Use `/challenge send` to challenge someone!')],
    });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CROWN} Next Challenge: GW${matchup.gameweek}`,
    `**${matchup.challenger}** vs **${matchup.opponent}**`,
  )
    .addFields(
      { name: 'Kickoff', value: `<t:${matchup.kickoffTimestamp}:F>`, inline: true },
      { name: 'Time Until', value: `<t:${matchup.kickoffTimestamp}:R>`, inline: true },
      { name: 'Status', value: matchup.live ? '🔴 Live' : '⏳ Upcoming', inline: true },
    )
    .setColor(matchup.live ? Colors.WARNING : Colors.PRIMARY);

  if (matchup.challengerTeam) {
    embed.addFields({ name: `${matchup.challenger}'s Team`, value: matchup.challengerTeam || 'N/A', inline: true });
  }
  if (matchup.opponentTeam) {
    embed.addFields({ name: `${matchup.opponent}'s Team`, value: matchup.opponentTeam || 'N/A', inline: true });
  }

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`matchup_${matchup.id}`)
        .setLabel('View Matchup')
        .setEmoji(EMOJIS.CROWN)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`challenge_analyze_${matchup.id}`)
        .setLabel('AI Analyze')
        .setEmoji(EMOJIS.AI)
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleActive(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const active = await FantasyService.getActiveChallenges(interaction.user.id);

  if (!active || active.length === 0) {
    await interaction.editReply({
      embeds: [createErrorEmbed('No Active Challenges', 'You have no active challenges this gameweek.')],
    });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.FIRE} Active Challenges`,
    `You have ${active.length} active challenge(s) this gameweek.`,
  ).setColor(Colors.WARNING);

  const entries = active.map((m, i) =>
    `**${i + 1}.** ${m.challenger} vs ${m.opponent} | GW${m.gameweek} | ${m.challengerScore} — ${m.opponentScore} | ${m.live ? '🔴 Live' : '✅ Complete'}`,
  );

  embed.setDescription(entries.join('\n'));

  await interaction.editReply({ embeds: [embed] });
}

async function handleAll(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const gameweek = await FantasyService.getCurrentGameweek();
  const matchups = await FantasyService.getAllChallengeMatchups(gameweek);

  if (!matchups || matchups.length === 0) {
    await interaction.editReply({
      embeds: [createErrorEmbed('No Matchups', `No challenges scheduled for GW${gameweek}.`)],
    });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CROWN} GW${gameweek} — All Challenge Matchups`,
    `${matchups.length} matchup(s) this gameweek.`,
  ).setColor(Colors.PRIMARY);

  const entries = matchups.map((m, i) =>
    `**${i + 1}.** ${m.challenger} vs ${m.opponent} | ${m.challengerScore || 0} — ${m.opponentScore || 0} | ${m.live ? '🔴 Live' : '⏳ Upcoming'}`,
  );

  embed.setDescription(entries.join('\n'));

  await interaction.editReply({ embeds: [embed] });
}

export default command;
