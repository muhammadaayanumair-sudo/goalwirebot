import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import FantasyService from '../../services/fantasy/FantasyService';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('challenge')
    .setDescription('Challenge another manager to a head-to-head match')
    .addSubcommand(sub =>
      sub.setName('send')
        .setDescription('Challenge a user')
        .addUserOption(opt =>
          opt.setName('opponent')
            .setDescription('The user to challenge')
            .setRequired(true),
        )
        .addIntegerOption(opt =>
          opt.setName('gameweek')
            .setDescription('Gameweek to challenge (default: next)')
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('cancel')
        .setDescription('Cancel your pending challenge'),
    )
    .addSubcommand(sub =>
      sub.setName('pending')
        .setDescription('View your pending challenges'),
    )
    .addSubcommand(sub =>
      sub.setName('history')
        .setDescription('View your challenge history'),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'send': return handleSend(interaction);
      case 'cancel': return handleCancel(interaction);
      case 'pending': return handlePending(interaction);
      case 'history': return handleHistory(interaction);
    }
  },
};

async function handleSend(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const opponent = interaction.options.getUser('opponent', true);
  const gameweek = interaction.options.getInteger('gameweek') || (await FantasyService.getCurrentGameweek()) + 1;

  if (opponent.id === interaction.user.id) {
    await interaction.editReply({ embeds: [createErrorEmbed('Invalid', 'You cannot challenge yourself.')] });
    return;
  }

  const team = await FantasyService.getTeam(interaction.user.id);
  if (!team) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Team', 'Create a team first with `/create`.')] });
    return;
  }

  const oppTeam = await FantasyService.getTeam(opponent.id);
  if (!oppTeam) {
    await interaction.editReply({ embeds: [createErrorEmbed('Invalid Opponent', `${opponent.username} doesn't have a fantasy team.`) }]);
    return;
  }

  const result = await FantasyService.sendChallenge(interaction.user.id, opponent.id, gameweek);

  if (!result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Challenge Failed', result.error || 'Could not send challenge.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CROWN} Challenge Sent!`,
    `<@${interaction.user.id}> has challenged <@${opponent.id}> to a GW${gameweek} showdown!`,
  )
    .addFields(
      { name: 'Opponent', value: opponent.username, inline: true },
      { name: 'Gameweek', value: `GW${gameweek}`, inline: true },
      { name: 'Status', value: '⏳ Pending acceptance', inline: true },
      { name: 'Expires', value: `<t:${Math.floor((Date.now() + 86400000) / 1000)}:R>`, inline: true },
    )
    .setColor(Colors.PRIMARY);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`challenge_accept_${result.challengeId}`)
        .setLabel('Accept Challenge')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`challenge_decline_${result.challengeId}`)
        .setLabel('Decline')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleCancel(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const result = await FantasyService.cancelChallenge(interaction.user.id);

  if (!result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Pending Challenge', 'You have no pending challenges to cancel.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.INFO} Challenge Cancelled`,
    `Your challenge against **${result.opponent}** has been cancelled.`,
  ).setColor(Colors.WARNING);

  await interaction.editReply({ embeds: [embed] });
}

async function handlePending(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const pending = await FantasyService.getPendingChallenges(interaction.user.id);

  if (!pending || pending.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Pending', 'You have no pending challenges.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CROWN} Pending Challenges`,
    `You have ${pending.length} pending challenge(s).`,
  ).setColor(Colors.INFO);

  const entries = pending.map((c, i) =>
    `**${i + 1}.** ${c.type === 'sent' ? 'You →' : ''} ${c.opponent} | GW${c.gameweek} | ${c.status} | ${c.timeRemaining}`,
  );

  embed.setDescription(entries.join('\n'));

  await interaction.editReply({ embeds: [embed] });
}

async function handleHistory(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const history = await FantasyService.getChallengeHistory(interaction.user.id);

  if (!history || history.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No History', 'No challenge history yet.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.TROPHY} Challenge History`,
    'Your past head-to-head challenges.',
  ).setColor(Colors.PRIMARY);

  const stats = {
    wins: history.filter(h => h.result === 'win').length,
    losses: history.filter(h => h.result === 'loss').length,
    draws: history.filter(h => h.result === 'draw').length,
  };

  const entries = history.slice(-15).reverse().map(h =>
    `**GW${h.gameweek}:** vs ${h.opponent} | ${h.userScore} — ${h.opponentScore} | ${h.result === 'win' ? '✅ Win' : h.result === 'loss' ? '❌ Loss' : '➖ Draw'}`,
  );

  embed.setDescription(entries.join('\n'));
  embed.addFields(
    { name: 'Wins', value: `${stats.wins}`, inline: true },
    { name: 'Losses', value: `${stats.losses}`, inline: true },
    { name: 'Draws', value: `${stats.draws}`, inline: true },
  );

  await interaction.editReply({ embeds: [embed] });
}

export default command;
