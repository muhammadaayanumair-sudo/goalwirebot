import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../client/CommandHandler';
import FantasyService from '../../services/fantasy/FantasyService';
import { Colors } from '../../config/colors';
import { EMOJIS, FANTASY_LIMITS, ECONOMY, BOT_NAME } from '../../config/constants';
import { createEmbed, createErrorEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('create')
    .setDescription('Create your fantasy football team')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Your fantasy team name')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(32),
    )
    .addStringOption(option =>
      option.setName('league')
        .setDescription('Fantasy league to join (optional)')
        .setRequired(false)
        .setAutocomplete(true),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const teamName = interaction.options.getString('name', true);
    const leagueCode = interaction.options.getString('league');

    const result = await FantasyService.createTeam(interaction.user.id, teamName, leagueCode || undefined);

    if (!result.success) {
      await interaction.editReply({
        embeds: [createErrorEmbed('Creation Failed', result.error || 'Could not create team.')],
      });
      return;
    }

    const embed = createEmbed(
      `${EMOJIS.TROPHY} Team Created!`,
      `Your fantasy team **${teamName}** has been created successfully.`,
    )
      .addFields(
        { name: 'Budget', value: `${EMOJIS.MONEY} $${(ECONOMY.STARTING_BUDGET / 1_000_000).toFixed(0)}M`, inline: true },
        { name: 'Squad Size', value: `${EMOJIS.STAR} 0/${FANTASY_LIMITS.SQUAD_SIZE}`, inline: true },
        { name: 'Transfers', value: `${EMOJIS.TRANSFER} ${FANTASY_LIMITS.TRANSFERS_PER_GAMEWEEK} remaining`, inline: true },
      )
      .setColor(Colors.SUCCESS);

    if (result.league) {
      embed.addFields({ name: 'League', value: `${EMOJIS.CROWN} ${result.league.name}`, inline: true });
    }

    embed.addFields(
      { name: '\u200B', value: `Use \`/scout\` to browse players and \`/transfer\` to build your squad.` },
    );

    await interaction.editReply({ embeds: [embed] });
  },

  async autocomplete(interaction): Promise<void> {
    const focused = interaction.options.getFocused();
    const leagues = await FantasyService.searchLeagues(focused);
    await interaction.respond(
      leagues.map(l => ({ name: l.name, value: l.code })),
    );
  },
};

export default command;
