import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import { Colors } from '../../config/colors';
import { EMOJIS } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('View GoalX partner program status and benefits')
    .addSubcommand(sub =>
      sub.setName('partner')
        .setDescription('View your partner status'),
    )
    .addSubcommand(sub =>
      sub.setname('benefits')
        .setDescription('View all partner benefits'),
    )
    .addSubcommand(sub =>
      sub.setName('tiers')
        .setDescription('View partner tiers and requirements'),
    )
    .addSubcommand(sub =>
      sub.setName('leaderboard')
        .setDescription('Top partners leaderboard'),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'partner': return handlePartner(interaction);
      case 'benefits': return handleBenefits(interaction);
      case 'tiers': return handleTiers(interaction);
      case 'leaderboard': return handleLeaderboard(interaction);
    }
  },
};

async function handlePartner(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const isPartner = false;

  if (!isPartner) {
    const embed = createEmbed(
      `${EMOJIS.CROWN} GoalX Partner Program`,
      `You are **not** currently a GoalX Partner.\n\nBecome a partner to unlock exclusive early access features, badges, and more.`,
    )
      .addFields(
        { name: 'How to Become a Partner', value: 'Apply through our [support server](${WEBSITE_URL}) or contact the development team.', inline: false },
        { name: 'Requirements', value: '• Active community member\n• Server with 100+ members\n• Active football/fantasy community', inline: false },
      )
      .setColor(Colors.PARTNER);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('partner_apply')
          .setLabel('Apply Now')
          .setEmoji(EMOJIS.CROWN)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('partner_benefits')
          .setLabel('View Benefits')
          .setEmoji(EMOJIS.STAR)
          .setStyle(ButtonStyle.Secondary),
      );

    await interaction.editReply({ embeds: [embed], components: [row] });
    return;
  }

  const embed = createEmbed(
    `${EMOJIS.CROWN} Your Partner Status`,
    `You are a **GoalX Partner**!`,
  )
    .addFields(
      { name: 'Tier', value: 'Gold', inline: true },
      { name: 'Partner Since', value: 'January 2025', inline: true },
      { name: 'Badge', value: `${EMOJIS.AI} Early Access`, inline: true },
      { name: 'Features Unlocked', value: '• Beta fantasy features\n• Advanced AI Scout\n• Exclusive commands\n• Priority support\n• Custom role', inline: false },
    )
    .setColor(Colors.GOLD);

  await interaction.editReply({ embeds: [embed] });
}

async function handleBenefits(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const embed = createEmbed(
    `${EMOJIS.STAR} Partner Benefits`,
    `Exclusive perks for GoalX Partners.`,
  )
    .addFields(
      { name: '🔬 Beta Fantasy Features', value: 'Test new fantasy features before public release.', inline: false },
      { name: '🤖 Advanced AI Scout', value: 'Unlock premium AI scouting with deeper analysis.', inline: false },
      { name: '⚡ Early Command Access', value: 'Use new commands up to 2 weeks before public release.', inline: false },
      { name: '🏅 Exclusive Badge', value: 'Show off your partner status with a unique badge on your profile.', inline: false },
      { name: '🎯 Priority Support', value: 'Get faster responses from the GoalX support team.', inline: false },
      { name: '📊 Analytics Dashboard', value: 'Access detailed server analytics and bot usage stats.', inline: false },
      { name: '🎨 Custom Embeds', value: 'Customize embed colors and branding for your server.', inline: false },
      { name: '🔔 Early Bug Reports', value: 'Report bugs early and help shape the bot\'s development.', inline: false },
    )
    .setColor(Colors.PARTNER);

  await interaction.editReply({ embeds: [embed] });
}

async function handleTiers(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const embed = createEmbed(
    `${EMOJIS.CROWN} Partner Tiers`,
    `Different levels of partnership with increasing benefits.`,
  )
    .addFields(
      {
        name: '🥉 Bronze',
        value: '• Basic partner badge\n• Early command access\n• Priority support',
        inline: false,
      },
      {
        name: '🥈 Silver',
        value: '• All Bronze benefits\n• Beta fantasy features\n• Basic AI Scout upgrades\n• Custom embed colors',
        inline: false,
      },
      {
        name: '🥇 Gold',
        value: '• All Silver benefits\n• Advanced AI Scout\n• Analytics dashboard\n• Beta testing priority\n• Custom role in support server',
        inline: false,
      },
      {
        name: '💎 Platinum',
        value: '• All Gold benefits\n• Direct dev access\n• Feature voting power\n• Lifetime partner status\n• Custom bot features',
        inline: false,
      },
    )
    .setColor(Colors.ACCENT);

  await interaction.editReply({ embeds: [embed] });
}

async function handleLeaderboard(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const embed = createEmbed(
    `${EMOJIS.CROWN} Top Partners`,
    `Leading GoalX Partners by contribution and activity.`,
  )
    .addFields(
      { name: '🥇 1. Partner_A', value: 'Gold Tier • 2,500 points', inline: false },
      { name: '🥈 2. Partner_B', value: 'Gold Tier • 2,100 points', inline: false },
      { name: '🥉 3. Partner_C', value: 'Silver Tier • 1,800 points', inline: false },
      { name: '4. Partner_D', value: 'Silver Tier • 1,500 points', inline: false },
      { name: '5. Partner_E', value: 'Bronze Tier • 1,200 points', inline: false },
    )
    .setColor(Colors.GOLD);

  await interaction.editReply({ embeds: [embed] });
}

export default command;
