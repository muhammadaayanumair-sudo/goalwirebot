const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const players = [
    { name: 'Erling Haaland', hints: ['Norwegian striker', 'Man City', '91 OVR', 'Born 2000'] },
    { name: 'Kylian Mbappe', hints: ['French forward', 'Real Madrid', '91 OVR', 'World Cup winner'] }
];
module.exports = {
    data: new SlashCommandBuilder().setName('guessplayer').setDescription('Guess the mystery player'),
    async execute(interaction) {
        const player = players[Math.floor(Math.random() * players.length)];
        const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle('🎯 Guess the Player!')
       .setDescription(`**Hint 1:** ${player.hints[0]}\n**Hint 2:** ${player.hints[1]}\n\nReply with your guess in 30s!`)
       .setFooter({ text: `Answer: ||${player.name}||` });
        await interaction.reply({ embeds: [embed] });
    }
};