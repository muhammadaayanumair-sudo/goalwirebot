const cron = require('node-cron');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const footballApi = require('../utils/footballApi');
const newsApi = require('../utils/newsApi');
const { getAllChannels } = require('../utils/database');

function startAutoPoster(client) {
    console.log('🚀 Auto-poster started');

    // Every 4 hours - Football News
    cron.schedule('0 */4 * * *', async () => {
        const channels = await getAllChannels();
        for (const ch of channels) {
            if (!ch.news) continue;
            const channel = await client.channels.fetch(ch.channel_id).catch(() => null);
            if (!channel) continue;

            try {
                const articles = await newsApi.getFootballNews();
                if (!articles.length) continue;

                // Post top 2 articles
                for (const article of articles.slice(0, 2)) {
                    const embed = new EmbedBuilder()
                      .setColor(0x00BFFF)
                      .setTitle('📰 Football News Update')
                      .setDescription(`**${article.title}**\n\n${article.description || ''}`)
                      .setImage(article.urlToImage)
                      .setURL(article.url)
                      .setFooter({ text: `Goalwire • ${article.source.name}` })
                      .setTimestamp(new Date(article.publishedAt));

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                          .setLabel('Read More')
                          .setStyle(ButtonStyle.Link)
                          .setURL(article.url)
                    );

                    await channel.send({ embeds: [embed], components: [row] });
                    await new Promise(r => setTimeout(r, 2000)); // 2s delay between posts
                }
            } catch (e) { console.log(`Auto news error: ${e.message}`); }
        }
    });

    // Every 6 hours - Fixtures
    cron.schedule('0 */6 * * *', async () => {
        const channels = await getAllChannels();
        for (const ch of channels) {
            if (!ch.fixtures) continue;
            const channel = await client.channels.fetch(ch.channel_id).catch(() => null);
            if (!channel) continue;
            try {
                const matches = await footballApi.getTeamFixtures(65); // Man City example - change this
                if (!matches.length) continue;
                const embed = new EmbedBuilder()
                  .setColor(0x00BFFF)
                  .setTitle(`📅 Upcoming Fixtures - ${ch.league_code}`)
                  .setDescription(matches.slice(0, 5).map(m =>
                        `**${m.homeTeam.name} vs ${m.awayTeam.name}**\n<t:${Math.floor(new Date(m.utcDate).getTime() / 1000)}:F>\n${m.competition.name}`
                    ).join('\n\n'))
                  .setFooter({ text: 'Goalwire • Auto Fixtures' })
                  .setTimestamp();
                await channel.send({ embeds: [embed] });
            } catch (e) { console.log(`Auto fixture error: ${e.message}`); }
        }
    });

    // Daily 9AM - Top Scorers
    cron.schedule('0 9 * * *', async () => {
        const channels = await getAllChannels();
        for (const ch of channels) {
            if (!ch.topscorers) continue;
            const channel = await client.channels.fetch(ch.channel_id).catch(() => null);
            if (!channel) continue;
            try {
                const scorers = await footballApi.getTopScorers(ch.league_code);
                const embed = new EmbedBuilder()
                  .setColor(0x00BFFF)
                  .setTitle(`🥇 Top Scorers - ${ch.league_code}`)
                  .setDescription(scorers.slice(0, 10).map((s, i) =>
                        `**${i + 1}. ${s.player.name}** - ${s.goals} goals | ${s.team.name}`
                    ).join('\n'))
                  .setFooter({ text: 'Goalwire • Daily 9AM Update' })
                  .setTimestamp();
                await channel.send({ embeds: [embed] });
            } catch (e) { console.log(`Auto scorer error: ${e.message}`); }
        }
    });
}

module.exports = { startAutoPoster };
