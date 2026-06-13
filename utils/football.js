const axios = require('axios');

class APIFootball {
    constructor() {
        this.baseURL = 'https://v3.football.api-sports.io';
        this.headers = { 'x-apisports-key': process.env.API_FOOTBALL_KEY };
    }

    async getTransfers(teamId) {
        const res = await axios.get(`${this.baseURL}/transfers`, {
            headers: this.headers,
            params: { team: teamId }
        });
        return res.data.response;
    }

    async getLineups(fixtureId) {
        const res = await axios.get(`${this.baseURL}/fixtures/lineups`, {
            headers: this.headers,
            params: { fixture: fixtureId }
        });
        return res.data.response;
    }

    async getHighlights(leagueId = 39) { // 39 = Premier League
        const res = await axios.get(`${this.baseURL}/fixtures`, {
            headers: this.headers,
            params: { league: leagueId, last: 3 }
        });
        return res.data.response;
    }

    async searchTeam(name) {
        const res = await axios.get(`${this.baseURL}/teams`, {
            headers: this.headers,
            params: { search: name }
        });
        return res.data.response[0]; // Returns team with ID
    }
}

module.exports = new APIFootball();
