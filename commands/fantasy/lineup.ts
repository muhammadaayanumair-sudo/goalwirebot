import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import FantasyService from '../../services/fantasy/FantasyService';
import { Colors } from '../../config/colors';
import { EMOJIS, FANTASY_LIMITS } from '../../config/constants';
import { createEmbed, createErrorEmbed, createLoadingEmbed } from '../../utils/embeds';
import { formatPosition } from '../../utils/formatter';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('lineup')
    .setDescription('Manage your fantasy team lineup')
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View your current lineup'),
    )
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set your starting XI and formation')
        .addStringOption(opt =>
          opt.setName('formation')
            .setDescription('Choose formation (e.g. 4-3-3, 4-4-2, 3-4-3)')
            .setRequired(true)
            .addChoices(
              { name: '4-3-3', value: '4-3-3' },
              { name: '4-4-2', value: '4-4-2' },
              { name: '3-4-3', value: '3-4-3' },
              { name: '3-5-2', value: '3-5-2' },
              { name: '4-2-3-1', value: '4-2-3-1' },
              { name: '4-5-1', value: '4-5-1' },
              { name: '5-3-2', value: '5-3-2' },
              { name: '5-4-1', value: '5-4-1' },
            ),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('auto')
        .setDescription('Auto-optimize your lineup based on predicted points'),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'view':
        return handleView(interaction);
      case 'set':
        return handleSet(interaction);
      case 'auto':
        return handleAuto(interaction);
    }
  },
};

async function handleView(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const team = await FantasyService.getTeam(interaction.user.id);
  if (!team) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Team Found', 'Create a team first with `/create`.')] });
    return;
  }

  const formation = FantasyService.getFormation(team.lineup);
  const startingXI = team.players.filter(p => p.inStartingXI);
  const subs = team.players.filter(p => !p.inStartingXI);

  const embed = createEmbed(
    `${EMOJIS.GOAL} Your Lineup — ${formation}`,
    `Drag players between starting XI and subs using the menu below.`,
  )
    .setColor(Colors.PRIMARY);

  const gk = startingXI.find(p => p.position === 'Goalkeeper');
  const def = startingXI.filter(p => p.position === 'Defender');
  const mid = startingXI.filter(p => p.position === 'Midfielder');
  const fwd = startingXI.filter(p => p.position === 'Forward');

  if (gk) embed.addFields({ name: '🧤 Goalkeeper', value: `${gk.name} ${EMOJIS.CAPTAIN}${team.captainId === gk.id ? ' C' : ''}`, inline: false });
  if (def.length) embed.addFields({ name: '🛡️ Defenders', value: def.map(p => `${p.name}${team.viceCaptainId === p.id ? ' VC' : ''}`).join('\n'), inline: false });
  if (mid.length) embed.addFields({ name: '🎯 Midfielders', value: mid.map(p => p.name).join('\n'), inline: false });
  if (fwd.length) embed.addFields({ name: '⚽ Forwards', value: fwd.map(p => p.name).join('\n'), inline: false });
  if (subs.length) embed.addFields({ name: '🔄 Substitutes', value: subs.map(p => `${p.name} — ${formatPosition(p.position)}`).join('\n'), inline: false });

  const players = team.players.map(p => ({
    label: `${p.name} — ${formatPosition(p.position)}`,
    value: p.id,
    description: p.inStartingXI ? 'In Starting XI' : 'On Bench',
    emoji: p.inStartingXI ? '✅' : '📋',
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`lineup_toggle_${interaction.user.id}`)
    .setPlaceholder('Toggle player between XI and bench')
    .setMinValues(1)
    .setMaxValues(players.length)
    .addOptions(
      players.map(p => new StringSelectMenuOptionBuilder()
        .setLabel(p.label)
        .setValue(p.value)
        .setDescription(p.description)
        .setEmoji(p.emoji),
      ),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  const buttonRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`lineup_auto_${interaction.user.id}`)
        .setLabel('Auto-Optimize')
        .setEmoji(EMOJIS.AI)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`lineup_save_${interaction.user.id}`)
        .setLabel('Save Lineup')
        .setEmoji('💾')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`team_${interaction.user.id}`)
        .setLabel('Back to Team')
        .setEmoji(EMOJIS.BACK)
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row, buttonRow] });
}

async function handleSet(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const formation = interaction.options.getString('formation', true);

  const team = await FantasyService.getTeam(interaction.user.id);
  if (!team) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Team Found', 'Create a team first.')] });
    return;
  }

  const result = await FantasyService.setFormation(interaction.user.id, formation);

  if (!result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Invalid Formation', result.error || 'Could not set formation.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.SUCCESS} Formation Set to ${formation}`,
    `Your lineup has been rearranged to fit a **${formation}** formation.`,
  )
    .addFields({ name: 'Tip', value: 'Use `/lineup view` to fine-tune your starting XI and bench.' })
    .setColor(Colors.SUCCESS);

  await interaction.editReply({ embeds: [embed] });
}

async function handleAuto(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  await interaction.editReply({ embeds: [createLoadingEmbed('AI is analyzing your squad and optimizing your lineup...')] });

  const result = await FantasyService.autoOptimizeLineup(interaction.user.id);

  if (!result.success) {
    await interaction.editReply({ embeds: [createErrorEmbed('Optimization Failed', result.error)] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.AI} Lineup Optimized!`,
    `AI has selected the best **${result.formation}** lineup based on predicted points.`,
  )
    .addFields(
      { name: 'Predicted Points', value: `${EMOJIS.FIRE} ${result.predictedPoints}`, inline: true },
      { name: 'Confidence', value: `${EMOJIS.STAR} ${(result.confidence * 100).toFixed(0)}%`, inline: true },
    )
    .setColor(Colors.SUCCESS);

  if (result.changes) {
    embed.addFields({ name: 'Changes Made', value: result.changes.slice(0, 1024) });
  }

  await interaction.editReply({ embeds: [embed] });
}

export default command;
