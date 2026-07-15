
import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import ScoutService from '../../services/fantasy/ScoutService';
import AIService from '../../services/ai/AIService';
import { Colors } from '../../config/colors';
import { EMOJIS, COOLDOWNS } from '../../config/constants';
import { createEmbed, createErrorEmbed, createLoadingEmbed } from '../../utils/embeds';
import { formatPrice, formatPosition } from '../../utils/formatter';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('recommend')
    .setDescription('AI-powered player recommendations')
    .addSubcommand(sub =>
      sub.setName('transfers')
        .setDescription('Recommended transfers for your team'),
    )
    .addSubcommand(sub =>
      sub.setName('captain')
        .setDescription('Who to captain this gameweek'),
    )
    .addSubcommand(sub =>
      sub.setName('wildcard')
        .setDescription('Best wildcard draft team'),
    )
    .addSubcommand(sub =>
      sub.setName('differential')
        .setDescription('Low-owned players with high potential'),
    )
    .addSubcommand(sub =>
      sub.setName('upcoming')
        .setDescription('Players with favorable upcoming fixtures'),
    ),

  cooldown: COOLDOWNS.AI_ANALYSIS,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'transfers': return handleTransfers(interaction);
      case 'captain': return handleCaptain(interaction);
      case 'wildcard': return handleWildcard(interaction);
      case 'differential': return handleDifferential(interaction);
      case 'upcoming': return handleUpcoming(interaction);
    }
  },
};

async function handleTransfers(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  await interaction.editReply({ embeds: [createLoadingEmbed('AI is analyzing your squad and the transfer market...')] });

  const result = await ScoutService.getTransferRecommendations(interaction.user.id);

  if (!result || result.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Recommendations', 'Could not generate recommendations right now.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.AI} AI Transfer Recommendations`,
    `Based on form, fixtures, and value analysis.`,
  ).setColor(Colors.PRIMARY);

  const entries = result.slice(0, 10).map((r, i) =>
    `**${i + 1}.** ${EMOJIS.TRANSFER} ${r.out} → **${r.in}** | ${formatPrice(r.netCost)} | Projected gain: **+${r.projectedGain}pts** | Confidence: ${(r.confidence * 100).toFixed(0)}%`,
  );

  embed.setDescription(entries.join('\n'));

  if (result.length > 10) {
    embed.addFields({ name: 'Total Recommendations', value: `${result.length}`, inline: true });
  }

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('recommend_apply')
        .setLabel('Apply Best Transfer')
        .setEmoji(EMOJIS.TRANSFER)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('recommend_refresh')
        .setLabel('Refresh')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleCaptain(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  await interaction.editReply({ embeds: [createLoadingEmbed('AI is analyzing captaincy options...')] });

  const result = await ScoutService.getCaptainRecommendation(interaction.user.id);

  if (!result) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Recommendation', 'Could not analyze captaincy options.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CAPTAIN} AI Captain Pick`,
    `Recommended captain for the upcoming gameweek.`,
  ).setColor(Colors.GOLD);

  embed.addFields(
    { name: `${EMOJIS.CAPTAIN} Captain`, value: `**${result.captain.name}** — ${result.captain.team} | ${result.captain.form}/10 form | Predicted: ${result.captain.predictedPoints}pts`, inline: false },
    { name: `${EMOJIS.VICE_CAPTAIN} Vice-Captain`, value: `**${result.viceCaptain.name}** — ${result.viceCaptain.team} | ${result.viceCaptain.form}/10 form | Predicted: ${result.viceCaptain.predictedPoints}pts`, inline: false },
    { name: `📊 Analysis`, value: result.analysis.slice(0, 1024), inline: false },
    { name: 'Confidence', value: `${(result.confidence * 100).toFixed(0)}%`, inline: true },
    { name: 'Fixture Difficulty', value: `${result.captain.fixtureDifficulty}/5`, inline: true },
  );

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`captain_set_${result.captain.id}`)
        .setLabel('Set as Captain')
        .setEmoji(EMOJIS.CAPTAIN)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('recommend_captain_refresh')
        .setLabel('Re-analyze')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleWildcard(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  await interaction.editReply({ embeds: [createLoadingEmbed('AI is building the optimal wildcard squad...')] });

  const result = await ScoutService.getWildcardDraft(interaction.user.id);

  if (!result) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Draft', 'Could not generate wildcard draft.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.FIRE} AI Wildcard Draft`,
    `Optimized squad for your wildcard — ${result.formation}`,
  ).setColor(Colors.PREMIUM);

  const gk = result.squad.find(p => p.position === 'Goalkeeper');
  const def = result.squad.filter(p => p.position === 'Defender');
  const mid = result.squad.filter(p => p.position === 'Midfielder');
  const fwd = result.squad.filter(p => p.position === 'Forward');

  if (gk) embed.addFields({ name: '🧤 Goalkeepers', value: gk.map(p => `${p.name} — ${p.team} — ${formatPrice(p.price)}`).join('\n'), inline: false });
  if (def.length) embed.addFields({ name: '🛡️ Defenders', value: def.map(p => `${p.name} — ${p.team} — ${formatPrice(p.price)}`).join('\n'), inline: false });
  if (mid.length) embed.addFields({ name: '🎯 Midfielders', value: mid.map(p => `${p.name} — ${p.team} — ${formatPrice(p.price)}`).join('\n'), inline: false });
  if (fwd.length) embed.addFields({ name: '⚽ Forwards', value: fwd.map(p => `${p.name} — ${p.team} — ${formatPrice(p.price)}`).join('\n'), inline: false });

  embed.addFields(
    { name: 'Total Cost', value: formatPrice(result.totalCost), inline: true },
    { name: 'Budget Remaining', value: formatPrice(result.budgetRemaining), inline: true },
    { name: 'Predicted Points', value: `${result.predictedPoints}pts`, inline: true },
    { name: 'AI Reasoning', value: result.reasoning.slice(0, 1024), inline: false },
  );

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('wildcard_apply')
        .setLabel('Apply Squad')
        .setEmoji(EMOJIS.SUCCESS)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('wildcard_regenerate')
        .setLabel('Regenerate')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Secondary),
    );

  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleDifferential(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  await interaction.editReply({ embeds: [createLoadingEmbed('Finding differential picks...')] });

  const result = await ScoutService.getDifferentialPicks();

  if (!result || result.length === 0) {
    await interaction.editReply({ embeds: [createErrorEmbed('No Differentials', 'Could not find differential picks.')] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.STAR} Differential Picks`,
    `Low-owned players with high upside potential.`,
  ).setColor(Colors.PREMIUM);

  const entries = result.slice(0, 15).map((p, i) =>
    `**${i + 1}.** ${p.name} | ${formatPosition(p.position)} | ${p.team} | ${formatPrice(p.price)} | Owned: ${p.ownership}% | Form: ${p.form}/10 | Predicted: ${p.predictedPoints}pts`,
  );

  embed.setDescription(entries.join('\n'));
  embed.addFields({ name: 'Why Differentials?', value: 'These players are owned by less than 5% of managers but have strong potential for big points.', inline: false });

  await interaction.editReply({ embeds: [embed] });
}

async function handleUpcoming(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  await interaction.editReply({ embeds: [createLoadingEmbed('Analyzing fixture difficulty...')] });

  const result = await ScoutService.getPlayers
