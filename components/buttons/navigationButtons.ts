import { ButtonInteraction } from 'discord.js';

export default {
  customId: ['nav_', 'back_', 'next_', 'prev_', 'refresh_'],
  async execute(interaction: ButtonInteraction): Promise<void> {
    const parts = interaction.customId.split('_');
    const action = parts[0];

    switch (action) {
      case 'nav':
      case 'back':
        await interaction.update({});
        break;
      case 'next':
      case 'prev':
        await interaction.update({});
        break;
      case 'refresh':
        await interaction.deferUpdate();
        break;
    }
  },
};
