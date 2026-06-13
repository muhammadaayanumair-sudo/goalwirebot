const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./goalwire.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS channels (
        guild_id TEXT PRIMARY KEY, 
        channel_id TEXT, 
        fixtures INTEGER DEFAULT 0, 
        transfers INTEGER DEFAULT 0, 
        news INTEGER DEFAULT 0, 
        topscorers INTEGER DEFAULT 0, 
        highlights INTEGER DEFAULT 0, 
        lineups INTEGER DEFAULT 0, 
        league_code TEXT DEFAULT 'PL'
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT, 
        player_name TEXT, 
        rating INTEGER, 
        claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

function setChannel(guildId, channelId, settings) {
    const { fixtures, transfers, news, topscorers, highlights, lineups, league } = settings;
    db.run(`INSERT OR REPLACE INTO channels VALUES (?,?,?,?,?,?,?,?)`, 
        [guildId, channelId, fixtures, transfers, news, topscorers, highlights, lineups, league]);
}

function getAllChannels() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM channels`, [], (err, rows) => err? reject(err) : resolve(rows));
    });
}

module.exports = { setChannel, getAllChannels, db };