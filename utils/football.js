const axios = require('axios');

class FootballAPI {
    constructor() {
        this.fdo = { 
            baseURL: 'https://api.football-data.org/v4', 
            headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY } 
        };
        this.af = { 
            baseURL: 'https://v3.football.api-sports.io', 
            headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY } 
        };
        this.teams = { 
            'manchester united': 66, 'man united': 66, 'man utd': 66,
            'man city': 65, 'manchester city': 65, 'arsenal': 57, 
            'chelsea': 61, 'liverpool': 64, 'tottenham': 73,
            'barcelona': 81, 'real madrid': 86, 'bayern': 5, 'psg': 524 
        };
    }

    async searchTeam(name) { return this.teams[name.toLowerCase()]; }

    // football-data.org - Free tier
    async getLiveMatches() {
        const res = await axios.get(`${this.fdo.baseURL}/matches?status=LIVE`, { headers: this.fdo.headers });
        return res.data.matches;
    }

    async getTeamFixtures(teamId) {
        const res = await axios.get(`${this.fdo.baseURL}/teams/${teamId}/matches?status=SCHEDULED&limit=5`, { headers: this.fdo.headers });
        return res.data.matches;
    }

    async getTeamResults(teamId) {
        const res = await axios.get(`${this.fdo.baseURL}/teams/${teamId}/matches?status=FINISHED&limit=5`, { headers: this.fdo.headers });
        return res.data.matches;
    }

    async getTopScorers(leagueCode = 'PL') {
        const res = await axios.get(`${this.fdo.baseURL}/competitions/${leagueCode}/scorers?limit=10`, { headers: this.fdo.headers });
        return res.data.scorers;
    }

    async getStandings(leagueCode = 'PL') {
        const res = await axios.get(`${this.fdo.baseURL}/competitions/${leagueCode}/standings`, { headers: this.fdo.headers });
        return res.data.standings[0].table;
    }

    async getMatchDetails(matchId) {
        const res = await axios.get(`${this.fdo.baseURL}/matches/${matchId}`, { headers: this.fdo.headers });
        return res.data;
    }

    // API-Football - Premium data
    async getLineups(fixtureId) {
        const res = await axios.get(`${this.af.baseURL}/fixtures/lineups?fixture=${fixtureId}`, { headers: this.af.headers });
        return res.data.response;
    }

    async getFixtureStats(fixtureId) {
        const res = await axios.get(`${this.af.baseURL}/fixtures/statistics?fixture=${fixtureId}`, { headers: this.af.headers });
        return res.data.response;
    }

    async searchPlayer(name) {
        const res = await axios.get(`${this.af.baseURL}/players?search=${name}&season=2023`, { headers: this.af.headers });
        return res.data.response[0];
    }

    async getInjuries(leagueId = 39) {
        const res = await axios.get(`${this.af.baseURL}/injuries?league=${leagueId}&season=2023`, { headers: this.af.headers });
        return res.data.response;
    }

    async getTransfers(teamId) {
        const res = await axios.get(`${this.af.baseURL}/transfers?team=${teamId}`, { headers: this.af.headers });
        return res.data.response.slice(0, 5);
    }
}

module.exports = new FootballAPI();