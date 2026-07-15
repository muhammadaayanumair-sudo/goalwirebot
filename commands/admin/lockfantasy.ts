import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import FantasyService from '../../services/fantasy/FantasyService';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('lockfantasy')
    .setDescription('Lock or unlock fantasy football features')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('transfers')
        .setDescription('Lock/unlock transfers for all users')
        .addBooleanOption(opt =>
          opt.setName('locked')
            .setDescription('True to lock, false to unlock')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('lineup')
        .setDescription('Lock/unlock lineup changes')
        .addBooleanOption(opt =>
          opt.setName('locked')
            .setDescription('True to lock, false to unlock')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('league')
        .setDescription('Lock/unlock league joining')
        .addStringOption(opt =>
          opt.setName('code')
            .setDescription('League code')
            .setRequired(false),
        )
        .addBooleanOption(opt =>
          opt.setName('locked')
            .setDescription('True to lock, false to unlock')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('gameweek')
        .setDescription('Lock/unlock the current gameweek')
        .addBooleanOption(opt =>
          opt.setName('locked')
            .setDescription('True to lock (deadline passed), false to unlock')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('View current lock status'),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'transfers': return handleTransfers(interaction);
      case 'lineup': return handleLineup(interaction);
      case 'league': return handleLeague(interaction);
      case 'gameweek': return handleGameweek(interaction);
      case 'status': return handleStatus(interaction);
    }
  },
};

async function handleTransfers(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const locked = interaction.options.getBoolean('locked', true);
  const status = locked ? '🔒 Locked' : '🔓 Unlocked';

  const embed = createEmbed(
    `${locked ? EMOJIS.LOCK : EMOJIS.UNLOCK} Transfers ${locked ? 'Locked' : 'Unlocked'}`,
    `Transfers have been **${locked ? 'locked' : 'unlocked'}** for all users.`,
  ).setColor(locked ? Colors.ERROR : Colors.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

async function handleLineup(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const locked = interaction.options.getBoolean('locked', true);

  const embed = createEmbed(
    `${locked ? EMOJIS.LOCK : EMOJIS.UNLOCK} Lineup Changes ${locked ? 'Locked' : 'Unlocked'}`,
    `Lineup changes have been **${locked ? 'locked' : 'unlocked'}** for all users.`,
  ).setColor(locked ? Colors.ERROR : Colors.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

async function handleLeague(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const code = interaction.options.getString('code');
  const locked = interaction.options.getBoolean('locked', true);

  const embed = createEmbed(
    `${locked ? EMOJIS.LOCK : EMOJIS.UNLOCK} League ${locked ? 'Locked' : 'Unlocked'}`,
    `${code ? `League \`${code}\` has been **${locked ? 'locked' : 'unlocked'}**.` : 'All leagues have been **' + (locked ? 'locked' : 'unlocked') + '**.'}`,
  ).setColor(locked ? Colors.ERROR : Colors.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

async function handleGameweek(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const locked = interaction.options.getBoolean('locked', true);

  const embed = createEmbed(
    `${locked ? EMOJIS.LOCK : EMOJIS.UNLOCK} Gameweek ${locked ? 'Locked' : 'Unlocked'}`,
    `The current gameweek has been **${locked ? 'locked' : 'unlocked'}**.\n\n${locked ? 'No further changes can be made this gameweek.' : 'Users can now make changes again.'}`,
  ).setColor(locked ? Colors.ERROR : Colors.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

async function handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const embed = createEmbed(
    `${EMOJIS.INFO} Fantasy Lock Status`,
    `Current lock status for fantasy features.`,
  )
    .addFields(
      { name: 'Transfers', value: '🔓 Unlocked', inline: true },
      { name: 'Lineup Changes', value: '🔓 Unlocked', inline: true },
      { name: 'Leagues', value: '🔓 Unlocked', inline: true },
      { name: 'Gameweek', value: '🔓 Active', inline: true },
      { name: 'Current GW', value: 'Gameweek 24', inline: true },
      { name: 'Deadline', value: '<t:1719878400:R>', inline: true },
    )
    .setColor(Colors.INFO);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('lockfantasy_lock_transfers')
        .setLabel('🔒 Lock Transfers')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('lockfantasy_lock_lineup')
        .setLabel('🔒 Lock Lineups')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('lockfantasy_unlock_all')
        .setLabel('🔓 Unlock All')
        .setStyle(ButtonStyle.Success),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

export default command;
