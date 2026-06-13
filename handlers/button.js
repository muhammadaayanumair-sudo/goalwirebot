const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const newsApi = require('../utils/newsApi');
const api = require('../utils/footballApi');

module.exports = async (interaction) => {
    if (!interaction.isButton()) return;

    // News pagination
    if (interaction.customId.startsWith('news_next_')) {
        await interaction.deferUpdate();
        const index = parseInt(interaction.customId.split('_')[2]);
        try {
            const articles = await newsApi.getFootballNews();
            if (index >= articles.length) {
                return interaction.editReply({ content: 'No more articles', components: [] });
            }
            const article = articles[index];
            const embed = new EmbedBuilder()
              .setColor(0x00BFFF)
              .setTitle('📰 Football News')
              .setDescription(`**${article.title}**\n\n${article.description || ''}`)
              .setImage(article.urlToImage)
              .setFooter({ text: `Goalwire • ${article.source.name}` });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('Read Full Article').setStyle(ButtonStyle.Link).setURL(article.url),
                new ButtonBuilder().setCustomId(`news_next_${index + 1}`).setLabel('Next').setStyle(ButtonStyle.Secondary).setEmoji('➡️')
            );
            await interaction.editReply({ embeds: [embed], components: [row] });
        } catch (e) {
            await interaction.editReply({ content: 'Error loading next article', components: [] });
        }
    }

    // Existing stats/lineup buttons...
    if (interaction.customId.startsWith('stats_')) {
        const matchId = interaction.customId.split('_')[1];
        try {
            const match = await api.getMatchDetails(matchId);
            const embed = new EmbedBuilder()
              .setColor(0x00BFFF)
              .setTitle('📊 Match Stats')
              .setDescription(`${match.homeTeam.name} vs ${match.awayTeam.name}`)
              .addFields({ name: 'Score', value: `${match.score.fullTime.home}-${match.score.fullTime.away}` });
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (e) {
            await interaction.reply({ content: 'Could not fetch stats', ephemeral: true });
        }
    }
};
