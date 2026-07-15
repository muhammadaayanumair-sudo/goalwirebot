import { ModalSubmitInteraction } from 'discord.js';
import { createErrorEmbed } from '../../utils/embeds';

export default {
  customId: 'search_modal',
  async execute(interaction: ModalSubmitInteraction): Promise<void> {
    const query = interaction.fields.getTextInputValue('search_query');
    const filter = interaction.fields.getTextInputValue('search_filter') || 'all';

    await interaction.reply({
      content: `Searching for "${query}" in category "${filter}"...`,
      ephemeral: true,
    });
  },
};
