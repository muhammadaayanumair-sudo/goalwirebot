import { ModalSubmitInteraction } from 'discord.js';
import TransferService from '../../services/fantasy/TransferService';
import { createErrorEmbed } from '../../utils/embeds';

export default {
  customId: 'transfer_modal',
  async execute(interaction: ModalSubmitInteraction): Promise<void> {
    const playerOut = interaction.fields.getTextInputValue('player_out');
    const playerIn = interaction.fields.getTextInputValue('player_in');

    await interaction.reply({
      content: `Processing swap: ${playerOut} → ${playerIn}...`,
      ephemeral: true,
    });
  },
};
