import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import FantasyService from '../../services/fantasy/FantasyService';
import TransferService from '../../services/fantasy/TransferService';
import { Colors } from '../../config/colors';
import { EMOJIS, FANTASY_LIMITS, COOLDOWNS } from '../../config/constants';
import { createEmbed, createErrorEmbed, createLoadingEmbed } from '../../utils/embeds';
import { formatPrice, formatPosition } from '../../utils/formatter';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('transfer')
    .setDescription('Manage player transfers')
    .addSubcommand(sub =>
      sub.setName('in')
        .setDescription('Sign a player to your team')
        .addStringOption(opt =>
          opt.setName('player')
            .setDescription('Player name to sign')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('out')
        .setDescription('Sell a player from your team')
        .addStringOption(opt =>
          opt.setName('player')
            .setDescription('Player to sell')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('swap')
        .setDescription('Swap one player for another')
        .addStringOption(opt =>
          opt.setName('out')
            .setDescription('Player to sell')
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption(opt =>
          opt.setName('in')
            .setDescription('Player to sign')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Check your transfer status'),
    )
    .addSubcommand(sub =>
      sub.setName('history')
        .setDescription('View your transfer history'),
    )
    .setDMPermission(false),

  cooldown: COOLDOWNS.TRANSFER,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'in': return handleTransferIn(interaction);
      case 'out': return handleTransferOut(interaction);
      case 'swap': return handleSwap(interaction);
      case 'status': return handleStatus(interaction);
      case 'history': return handleHistory(interaction);
    }
  },

  async autocomplete(interaction): Promise<void> {
    const focused = interaction.options.getFocused(true);
    const query = focused.value as string;

    if (focused.name === 'player' || focused.name === 'in') {
      const players = await FantasyService.searchAvailablePlayers(query, interaction.user.id);
      await interaction.respond(
        players.slice(0, 25).map(p => ({
          name: `${p.name} — ${formatPosition(p.position)} — ${formatPrice(p.currentPrice)}`,
          value: p.id,
        })),
      );
    } else if (focused.name === 'out') {
      const players = await FantasyService.searchSquadPlayers(query, interaction.user.id);
      await interaction.respond(
        players.slice(0, 25).map(p => ({
          name: `${p.name} — ${formatPosition(p.position)} — ${formatPrice(p.currentPrice)}`,
          value: p.id,
        })),
      );
    }
  },
};

async function handleTransferIn(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const playerId = interaction.options.getString('player', true);
  const result = await TransferService.buyPlayer(interaction.user.id, playerId);

  if (!result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Transfer Failed', result.error || 'Could not sign player.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.SUCCESS} Player Signed!`,
    `**${result.player.name}** has joined your squad.`,
  )
    .addFields(
      { name: 'Position', value: formatPosition(result.player.position), inline: true },
      { name: 'Fee', value: formatPrice(result.fee), inline: true },
      { name: 'Budget Remaining', value: formatPrice(result.remainingBudget), inline: true },
      { name: 'Transfers Used', value: `${result.transfersUsed}/${FANTASY_LIMITS.TRANSFERS_PER_GAMEWEEK}`, inline: true },
    )
    .setColor(Colors.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

async function handleTransferOut(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const playerId = interaction.options.getString('player', true);
  const result = await TransferService.sellPlayer(interaction.user.id, playerId);

  if (!result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Sale Failed', result.error || 'Could not sell player.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.MONEY} Player Sold!`,
    `**${result.player.name}** has been sold.`,
  )
    .addFields(
      { name: 'Fee Received', value: formatPrice(result.fee), inline: true },
      { name: 'Budget Now', value: formatPrice(result.budget), inline: true },
      { name: 'Transfers Used', value: `${result.transfersUsed}/${FANTASY_LIMITS.TRANSFERS_PER_GAMEWEEK}`, inline: true },
    )
    .setColor(Colors.WARNING);

  await interaction.editReply({ embeds: [embed] });
}

async function handleSwap(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const outId = interaction.options.getString('out', true);
  const inId = interaction.options.getString('in', true);
  const result = await TransferService.swapPlayer(interaction.user.id, outId, inId);

  if (!result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Swap Failed', result.error || 'Could not complete swap.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.TRANSFER} Swap Completed!`,
    `**${result.out.name}** → **${result.in.name}**`,
  )
    .addFields(
      { name: 'Net Cost', value: formatPrice(result.netCost), inline: true },
      { name: 'Budget Remaining', value: formatPrice(result.remainingBudget), inline: true },
      { name: 'Transfers Used', value: `${result.transfersUsed}/${FANTASY_LIMITS.TRANSFERS_PER_GAMEWEEK}`, inline: true },
    )
    .setColor(Colors.PRIMARY);

  await interaction.editReply({ embeds: [embed] });
}

async function handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const status = await TransferService.getTransferStatus(interaction.user.id);

  if (!status) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Team', 'Create a team first with `/create`.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.TRANSFER} Transfer Status`,
    `Your current transfer window overview.`,
  )
    .addFields(
      { name: 'Transfers Used', value: `${status.used}/${FANTASY_LIMITS.TRANSFERS_PER_GAMEWEEK}`, inline: true },
      { name: 'Transfers Remaining', value: `${FANTASY_LIMITS.TRANSFERS_PER_GAMEWEEK - status.used}`, inline: true },
      { name: 'Budget', value: formatPrice(status.budget), inline: true },
      { name: 'Squad Size', value: `${status.squadSize}/${FANTASY_LIMITS.SQUAD_SIZE}`, inline: true },
      { name: 'Free Transfers', value: `${status.freeTransfers}`, inline: true },
      { name: 'Points Hit', value: `-${status.pointsHit} pts`, inline: true },
    )
    .setColor(Colors.INFO);

  if (status.wildcardActive) {
    embed.addFields({ name: `${EMOJIS.FIRE} Wildcard Active`, value: 'Unlimited transfers this gameweek!', inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleHistory(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const history = await TransferService.getTransferHistory(interaction.user.id);

  if (!history || history.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No History', 'No transfers made yet.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.TRANSFER} Transfer History`,
    `Your last ${Math.min(history.length, 20)} transfers.`,
  )
    .setColor(Colors.PRIMARY);

  const entries = history.slice(0, 20).map((t, i) =>
    `**${i + 1}.** ${EMOJIS.TRANSFER} ${t.playerOut} → ${t.playerIn} | ${formatPrice(t.netCost)} | GW${t.gameweek}`,
  );

  embed.setDescription(entries.join('\n'));

  await interaction.editReply({ embeds: [embed] });
}

export default command;
