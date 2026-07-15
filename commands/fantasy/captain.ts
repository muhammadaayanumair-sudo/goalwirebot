import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import FantasyService from '../../services/fantasy/FantasyService';
import { Colors } from '../../config/colors';
import { EMOJIS, POINTS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';
import { formatPosition } from '../../utils/formatter';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('captain')
    .setDescription('Set your captain and vice-captain')
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Choose your captain')
        .addStringOption(opt =>
          opt.setName('player')
            .setDescription('Select captain')
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption(opt =>
          opt.setName('vice')
            .setDescription('Select vice-captain')
            .setRequired(false)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View your current captain and vice-captain'),
    )
    .addSubcommand(sub =>
      sub.setName('swap')
        .setDescription('Swap captain and vice-captain'),
    )
    .addSubcommand(sub =>
      sub.setName('triple')
        .setDescription('Activate triple captain chip (one per season)'),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'set': return handleSet(interaction);
      case 'view': return handleView(interaction);
      case 'swap': return handleSwap(interaction);
      case 'triple': return handleTriple(interaction);
    }
  },

  async autocomplete(interaction): Promise<void> {
    const focused = interaction.options.getFocused(true);
    const players = await FantasyService.searchSquadPlayers(focused.value as string, interaction.user.id);
    await interaction.respond(
      players.slice(0, 25).map(p => ({
        name: `${p.name} — ${formatPosition(p.position)} — ${p.predictedPoints}P`,
        value: p.id,
      })),
    );
  },
};

async function handleSet(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const captainId = interaction.options.getString('player', true);
  const viceId = interaction.options.getString('vice');

  const team = await FantasyService.getTeam(interaction.user.id);
  if (!team) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Team', 'Create a team first.')] });
    return;
  }

  const captain = team.players.find(p => p.id === captainId);
  if (!captain) {
    await interaction.editReply({ embeds: [createErrorEmbed('Invalid Player', 'That player is not in your squad.')] });
    return;
  }

  let vice: typeof captain | undefined;
  if (viceId) {
    vice = team.players.find(p => p.id === viceId);
    if (!vice || vice.id === captain.id) {
      await interaction.editReply({ embeds: [createErrorEmbed('Invalid Vice-Captain', 'Player not found or same as captain.')] });
      return;
    }
  }

  await FantasyService.setCaptain(interaction.user.id, captainId, viceId || undefined);

  const embed = createEmbed(
    `${EMOJIS.CAPTAIN} Captain Selected!`,
    `Your captaincy choices for the upcoming gameweek.`,
  )
    .addFields(
      { name: `${EMOJIS.CAPTAIN} Captain`, value: `${captain.name} (${formatPosition(captain.position)}) — ${POINTS.CAPTAIN_MULTIPLIER}x points`, inline: false },
      { name: `${EMOJIS.VICE_CAPTAIN} Vice-Captain`, value: vice ? `${vice.name} (${formatPosition(vice.position)}) — ${POINTS.VICE_CAPTAIN_MULTIPLIER}x points` : 'Not set', inline: false },
      {
        name: '📋 How It Works',
        value: `• Captain earns **${POINTS.CAPTAIN_MULTIPLIER}x** points\n• Vice-Captain earns **${POINTS.VICE_CAPTAIN_MULTIPLIER}x** if captain doesn't play\n• Use \`/captain triple\` for **3x** points (once per season)`,
        inline: false,
      },
    )
    .setColor(Colors.GOLD);

  await interaction.editReply({ embeds: [embed] });
}

async function handleView(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const team = await FantasyService.getTeam(interaction.user.id);
  if (!team) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Team', 'Create a team first.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CAPTAIN} Captaincy Overview`,
    'Your current captain and vice-captain.',
  )
    .addFields(
      {
        name: `${EMOJIS.CAPTAIN} Captain`,
        value: team.captain
          ? `${team.captain.name} | ${formatPosition(team.captain.position)} | ${team.captain.predictedPoints}P`
          : 'Not set',
        inline: true,
      },
      {
        name: `${EMOJIS.VICE_CAPTAIN} Vice-Captain`,
        value: team.viceCaptain
          ? `${team.viceCaptain.name} | ${formatPosition(team.viceCaptain.position)} | ${team.viceCaptain.predictedPoints}P`
          : 'Not set',
        inline: true,
      },
      {
        name: 'Chips Available',
        value: [
          `Triple Captain: ${team.chips.tripleCaptain ? '✅ Used' : '❌ Available'}`,
          `Wildcard: ${team.chips.wildcard ? '✅ Used' : '❌ Available'}`,
          `Free Hit: ${team.chips.freeHit ? '✅ Used' : '❌ Available'}`,
          `Bench Boost: ${team.chips.benchBoost ? '✅ Used' : '❌ Available'}`,
        ].join('\n'),
        inline: false,
      },
    )
    .setColor(Colors.PRIMARY);

  await interaction.editReply({ embeds: [embed] });
}

async function handleSwap(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const result = await FantasyService.swapCaptaincy(interaction.user.id);

  if (!result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Swap Failed', result.error || 'Could not swap captaincy.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.SUCCESS} Captaincy Swapped!`,
    `${EMOJIS.CAPTAIN} ${result.captain.name} is now captain\n${EMOJIS.VICE_CAPTAIN} ${result.viceCaptain.name} is now vice-captain`,
  )
    .setColor(Colors.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

async function handleTriple(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const result = await FantasyService.activateTripleCaptain(interaction.user.id);

  if (!result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Activation Failed', result.error || 'Triple captain already used this season or no captain set.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.FIRE} Triple Captain Activated!`,
    `Your captain **${result.captain}** will earn **3x** points this gameweek!`,
  )
    .setColor(Colors.GOLD);

  await interaction.editReply({ embeds: [embed] });
}

export default command;
