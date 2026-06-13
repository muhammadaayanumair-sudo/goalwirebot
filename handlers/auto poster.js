const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const footballApi = require('../utils/footballApi');
const { getAllChannels } = require('../utils/database');
function startAutoPoster(client) {
    cron.schedule('0 */6 * * *', async () => {
        const channels = await getAllChannels();
        for (const ch of channels) {
            if (!ch.fixtures) continue;
            const channel = await client.channels.fetch(ch.channel_id).catch(() => null);
            if (!channel) continue;
            try {
                const matches = await footballApi.getTeamFixtures(65);
                if (!matches.length) continue;
                const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle(`📅 Fixtures - ${ch.league_code}`)
                  .setDescription(matches.slice(0, 3).map(m => `**${m.homeTeam.name} vs ${m.awayTeam.name}**\n<t:${Math.floor(new Date(m.utcDate).getTime() / 1000)}:R>`).join('\n\n'));
                await channel.send({ embeds: [embed] });
            } catch (e) { console.log(e); }
        }
    });
    cron.schedule('0 9 * * *', async () => {
        const channels = await getAllChannels();
        for (const ch of channels) {
            if (!ch.topscorers) continue;
            const channel = await client.channels.fetch(ch.channel_id).catch(() => null);
            if (!channel) continue;
            try {
                const scorers = await footballApi.getTopScorers(ch.league_code);
                const embed = new EmbedBuilder().setColor(0x00BFFF).setTitle(`🥇 Top Scorers - ${ch.league_code}`)
                  .setDescription(scorers.slice(0, 5).map((s, i) => `**${i + 1}. ${s.player.name}** - ${s.goals} goals`).join('\n'));
                await channel.send({ embeds: [embed] });
            } catch (e) { console.log(e); }
        }
    });
}
module.exports = { startAutoPoster };
