const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('predict').setDescription('Predict match score')
   .addStringOption(opt => opt.setName('match').setDescription('Arsenal vs Chelsea').setRequired(true))
   .addStringOption(opt => opt.setName('score').setDescription('2-1').setRequired(true)),
    async execute(interaction) {
        const match = interaction.options.getString('match');
        const score = interaction.options.getString('score');
        await interaction.reply(`✅ Prediction saved: **${match}** ${score}\nYou'll get points if correct after the match! [Points system not implemented yet]`);
    }
};