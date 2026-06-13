const cron = require('node-cron');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const footballData = require('../utils/footballApi');
const apiFootball = require('../utils/apiFootball');
const newsApi = require('../utils/newsApi');
const { getAllChannels } = require('../utils/database');

function startAutoPoster(client) {

    // Every 30 min - Fixtures + Lineups for today's matches
    cron.schedule('*/30 * * * *', async () => {
        const channels = await getAllChannels();
        for (const ch of channels) {
            if (!ch.fixtures &&!ch.lineups) continue;
            const channel = await client.channels.fetch(ch.channel_id).catch(() => null);
            if (!channel) continue;

            try {
                const live = await footballData.getLiveMatches();
                const todayMatches = live.filter(m => m.competition.code === ch.league_code);

                for (const match of todayMatches.slice(0, 3)) {
                    if (ch.fixtures) {
                        const embed = new EmbedBuilder()
                           .setColor(0x00BFFF)
                           .setTitle('🔴 LIVE NOW')
                           .setDescription(`**${match.homeTeam.name} ${match.score.fullTime.home?? 0} - ${match.score.fullTime.away?? 0} ${match.awayTeam.name}**`)
                           .addFields({ name: 'Time', value: `${match.status} ${match.minute}'`, inline: true })
                           .setFooter({ text: 'Goalwire • Auto Live Updates' })
                           .setTimestamp();

                        await channel.send({ embeds: [embed] });
                    }

                    // Lineups - need API-Football fixture ID, so we search by teams
                    if (ch.lineups && match.status === 'IN_PLAY') {
                        // You'd need to map football-data match to API-Football fixture ID
                        // For now posting placeholder
                    }
                }
            } catch (e) { console.log(`Live error: ${e.message}`); }
        }
    });

    // Every 6 hours - Transfer News
    cron.schedule('0 */6 * * *', async () => {
        const channels = await getAllChannels();
        for (const ch of channels) {
            if (!ch.transfers) continue;
            const channel = await client.channels.fetch(ch.channel_id).catch(() => null);
            if (!channel) continue;

            try {
                // Example: Man City = 50 in API-Football
                const transfers = await apiFootball.getTransfers(50);
                if (!transfers.length) continue;

                const latest = transfers[0];
                const embed = new EmbedBuilder()
                   .setColor(0x00BFFF)
                   .setTitle('🔄 Transfer Update')
                   .setDescription(`**${latest.player.name}** → ${latest.transfers[0].teams.in.name}`)
                   .addFields(
                        { name: 'From', value: latest.transfers[0].teams.out.name, inline: true },
                        { name: 'Type', value: latest.transfers[0].type, inline: true }
                    )
                   .setThumbnail(latest.player.photo)
                   .setFooter({ text: 'Goalwire • Auto Transfers' })
                   .setTimestamp();

                await channel.send({ embeds: [embed] });
            } catch (e) { console.log(`Transfer error: ${e.message}`); }
        }
    });

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

                const article = articles[0];
                const embed = new EmbedBuilder()
                   .setColor(0x00BFFF)
                   .setTitle('📰 Football News')
                   .setDescription(`**${article.title}**\n\n${article.description}`)
                   .setURL(article.url)
                   .setImage(article.urlToImage)
                   .setFooter({ text: `Goalwire • ${article.source.name}` })
                   .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                       .setLabel('Read Full Article')
                       .setStyle(ButtonStyle.Link)
                       .setURL(article.url)
                );

                await channel.send({ embeds: [embed], components: [row] });
            } catch (e) { console.log(`News error: ${e.message}`); }
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
                const scorers = await footballData.getTopScorers(ch.league_code);
                const embed = new EmbedBuilder()
                   .setColor(0x00BFFF)
                   .setTitle(`🥇 Top Scorers - ${ch.league_code}`)
                   .setDescription(scorers.slice(0, 10).map((s, i) =>
                        `**${i + 1}. ${s.player.name}** - ${s.goals} goals | ${s.team.name}`
                    ).join('\n'))
                   .setFooter({ text: 'Goalwire • Updates daily 9AM' })
                   .setTimestamp();

                await channel.send({ embeds: [embed] });
            } catch (e) { console.log(`Scorer error: ${e.message}`); }
        }
    });

    // Every 2 hours - Match Highlights for finished games
    cron.schedule('0 */2 * * *', async () => {
        const channels = await getAllChannels();
        for (const ch of channels) {
            if (!ch.highlights) continue;
            const channel = await client.channels.fetch(ch.channel_id).catch(() => null);
            if (!channel) continue;

            try {
                const leagueMap = { 'PL': 39, 'CL': 2, 'BL1': 78, 'SA': 135, 'PD': 140 };
                const highlights = await apiFootball.getHighlights(leagueMap[ch.league_code] || 39);

                for (const match of highlights.slice(0, 2)) {
                    if (match.fixture.status.short!== 'FT') continue;

                    const embed = new EmbedBuilder()
                       .setColor(0x00BFFF)
                       .setTitle('🎬 Match Finished')
                       .setDescription(`**${match.teams.home.name} ${match.goals.home} - ${match.goals.away} ${match.teams.away.name}**`)
                       .addFields({ name: 'Venue', value: match.fixture.venue.name || 'TBD', inline: true })
                       .setFooter({ text: 'Goalwire • Match Highlights' })
                       .setTimestamp();

                    // API-Football doesn't provide video links on free tier
                    // You'd need to scrape YouTube or use a highlights API
                    await channel.send({ embeds: [embed] });
                }
            } catch (e) { console.log(`Highlights error: ${e.message}`); }
        }
    });
}

module.exports = { startAutoPoster };
