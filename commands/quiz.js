const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const questions = [
    { q: 'Who won the 2022 World Cup?', a: 'Argentina' },
    { q: 'Which club has most UCL titles?', a: 'Real Madrid' },
    { q: 'Who is the PL all-time top scorer?', a: 'Alan Shearer' }
];
module.exports = {
    data: new SlashCommandBuilder().setName('quiz').setDescription('Football trivia'),
    async execute(interaction) {
        const q = questions[Math.floor(Math.random() * questions.length)];
        const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle('❓ Football Quiz').setDescription(`**${q.q}**\n\nAnswer in 15s!`).setFooter({ text: `Answer: ||${q.a}||` });
        await interaction.reply({ embeds: [embed] });
    }
};