import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import FantasyService from '../../services/fantasy/FantasyService';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('resetfantasy')
    .setDescription('Reset fantasy football data')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('server')
        .setDescription('Reset all fantasy data for this server'),
    )
    .addSubcommand(sub =>
      sub.setName('user')
        .setDescription('Reset a specific user\'s fantasy team')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('User to reset')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('league')
        .setDescription('Reset a fantasy league')
        .addStringOption(opt =>
          opt.setName('code')
            .setDescription('League code to reset')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('gameweek')
        .setDescription('Reset points for a specific gameweek')
        .addIntegerOption(opt =>
          opt.setName('week')
            .setDescription('Gameweek number')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('all')
        .setDescription('⚠️ COMPLETELY RESET ALL FANTASY DATA'),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'server': return handleServer(interaction);
      case 'user': return handleUser(interaction);
      case 'league': return handleLeague(interaction);
      case 'gameweek': return handleGameweek(interaction);
      case 'all': return handleAll(interaction);
    }
  },
};

async function handleServer(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const embed = createEmbed(
    `${EMOJIS.WARNING} Reset Server Fantasy Data?`,
    `This will reset all fantasy teams, points, and leagues for **${interaction.guild?.name}**.\n\nThis action **cannot be undone**. Proceed?`,
  ).setColor(Colors.WARNING);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('resetfantasy_server_confirm')
        .setLabel('✅ Yes, Reset Server')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('resetfantasy_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleUser(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const targetUser = interaction.options.getUser('user', true);

  const embed = createEmbed(
    `${EMOJIS.WARNING} Reset ${targetUser.username}'s Team?`,
    `This will delete **${targetUser.username}**'s fantasy team and all associated data.\n\nThis action **cannot be undone**. Proceed?`,
  ).setColor(Colors.WARNING);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`resetfantasy_user_confirm_${targetUser.id}`)
        .setLabel('✅ Yes, Reset User')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('resetfantasy_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleLeague(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const code = interaction.options.getString('code', true);

  const embed = createEmbed(
    `${EMOJIS.WARNING} Reset League ${code}?`,
    `This will reset all data for league **${code}**, including standings and member teams.\n\nThis action **cannot be undone**. Proceed?`,
  ).setColor(Colors.WARNING);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`resetfantasy_league_confirm_${code}`)
        .setLabel('✅ Yes, Reset League')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('resetfantasy_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleGameweek(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const week = interaction.options.getInteger('week', true);

  const embed = createEmbed(
    `${EMOJIS.WARNING} Reset GW${week} Points?`,
    `This will reset all fantasy points for **Gameweek ${week}** across all users.\n\nThis action **cannot be undone**. Proceed?`,
  ).setColor(Colors.WARNING);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`resetfantasy_gameweek_confirm_${week}`)
        .setLabel('✅ Yes, Reset GW')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('resetfantasy_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleAll(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const embed = createEmbed(
    `${EMOJIS.ERROR} ⚠️ COMPLETE FANTASY RESET ⚠️`,
    `**WARNING:** This will **permanently delete ALL** fantasy football data including:\n\n` +
    `• All user teams and points\n` +
    `• All leagues and standings\n` +
    `• All transfer history\n` +
    `• All captain history\n` +
    `• All challenge data\n\n` +
    `This affects **every server** the bot is in. **This cannot be undone.**\n\n` +
    `Type \`I UNDERSTAND\` to confirm.`,
  ).setColor(Colors.ERROR);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('resetfantasy_all_confirm')
        .setLabel('⚠️ I UNDERSTAND — RESET ALL')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('resetfantasy_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

export default command;
