JavaScript
const { SlashCommandBuilder } = require('discord.js');
module.exports = {
data: new SlashCommandBuilder()
.setName('compare')
.setDescription('Compare stats between two players or teams')
.addString0ption(option =>
option.setName('player1')
.setDescription('First player name, e.g. Haaland') // - Missing this crashes i
.setRequired(true))
.addStringOption(option =
option.setName('player2')
.setDescription('Second player name, e.g. Mbappe') // - And this one
.setRequired(true)),
async execute(interaction) {
await interaction.deferReply();
const player1 = interaction.options.getString('player1');
const player2 = interaction.options.getString('player2');
try {
// your API comparison logic here
await interaction.editReply(`Comparing ${player1} vs ${player2}...`);
} catch (error) {
await interaction.editReply('Failed to fetch player data.');
}
}
};
