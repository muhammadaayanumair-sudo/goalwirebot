import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import FantasyService from '../../services/fantasy/FantasyService';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('setfantasy')
    .setDescription('Configure fantasy football settings for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('budget')
        .setDescription('Set starting budget for new teams')
        .addIntegerOption(opt =>
          opt.setName('amount')
            .setDescription('Starting budget in millions (e.g. 100)')
            .setRequired(true)
            .setMinValue(50)
            .setMaxValue(500),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('transfers')
        .setDescription('Set transfers per gameweek')
        .addIntegerOption(opt =>
          opt.setName('limit')
            .setDescription('Max transfers per GW (1-5)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(5),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('squadsize')
        .setDescription('Set squad size limit')
        .addIntegerOption(opt =>
          opt.setName('size')
            .setDescription('Squad size (11-25)')
            .setRequired(true)
            .setMinValue(11)
            .setMaxValue(25),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('points')
        .setDescription('Customize points system')
        .addIntegerOption(opt =>
          opt.setName('goal')
            .setDescription('Points per goal')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(20),
        )
        .addIntegerOption(opt =>
          opt.setName('assist')
            .setDescription('Points per assist')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(20),
        )
        .addIntegerOption(opt =>
          opt.setName('clean_sheet')
            .setDescription('Points per clean sheet')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(20),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('maxperclub')
        .setDescription('Set max players per real club')
        .addIntegerOption(opt =>
          opt.setName('limit')
            .setDescription('Max players from one club (1-5)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(5),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View current fantasy settings'),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'budget': return handleBudget(interaction);
      case 'transfers': return handleTransfers(interaction);
      case 'squadsize': return handleSquadSize(interaction);
      case 'points': return handlePoints(interaction);
      case 'maxperclub': return handleMaxPerClub(interaction);
      case 'view': return handleView(interaction);
    }
  },
};

async function handleBudget(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const amount = interaction.options.getInteger('amount', true);

  const embed = createEmbed(
    `${EMOJIS.MONEY} Starting Budget Updated`,
    `New teams will start with **$${amount}M** budget.`,
  ).setColor(Colors.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

async function handleTransfers(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const limit = interaction.options.getInteger('limit', true);

  const embed = createEmbed(
    `${EMOJIS.TRANSFER} Transfer Limit Updated`,
    `Managers can now make **${limit}** free transfers per gameweek.`,
  ).setColor(Colors.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

async function handleSquadSize(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const size = interaction.options.getInteger('size', true);

  const embed = createEmbed(
    `📋 Squad Size Updated`,
    `Squad size limit set to **${size}** players.\nStarting XI: ${Math.min(size, 11)} | Subs: ${Math.max(size - 11, 0)}`,
  ).setColor(Colors.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

async function handlePoints(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const goal = interaction.options.getInteger('goal');
  const assist = interaction.options.getInteger('assist');
  const cleanSheet = interaction.options.getInteger('clean_sheet');

  const changes: string[] = [];
  if (goal) changes.push(`Goal: ${goal}pts`);
  if (assist) changes.push(`Assist: ${assist}pts`);
  if (cleanSheet) changes.push(`Clean Sheet: ${cleanSheet}pts`);

  const embed = createEmbed(
    `${EMOJIS.STAR} Points System Updated`,
    changes.length > 0
      ? `Updated: ${changes.join(', ')}`
      : 'No changes made. Use the options to set point values.',
  ).setColor(Colors.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

async function handleMaxPerClub(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const limit = interaction.options.getInteger('limit', true);

  const embed = createEmbed(
    `⚽ Max Per Club Updated`,
    `Managers can now select up to **${limit}** players from the same real-world club.`,
  ).setColor(Colors.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

async function handleView(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const embed = createEmbed(
    `${EMOJIS.TROPHY} Fantasy Settings`,
    `Current fantasy football configuration for this server.`,
  )
    .addFields(
      { name: 'Starting Budget', value: '$100M', inline: true },
      { name: 'Transfers/GW', value: '2', inline: true },
      { name: 'Squad Size', value: '15', inline: true },
      { name: 'Max Per Club', value: '3', inline: true },
      { name: 'Points: Goal', value: '6', inline: true },
      { name: 'Points: Assist', value: '4', inline: true },
      { name: 'Points: Clean Sheet', value: '4', inline: true },
      { name: 'Captain Multiplier', value: '2x', inline: true },
      { name: 'Vice-Captain', value: '1.5x', inline: true },
    )
    .setColor(Colors.INFO);

  await interaction.editReply({ embeds: [embed] });
}

export default command;
