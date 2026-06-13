const axios = require('axios');
class FootballAPI {
    constructor() {
        this.baseURL = 'https://api.football-data.org/v4';
        this.headers = { 'X-Auth-Token': process.env.FOOTBALL_API_KEY };
        this.teamCache = new Map();
    }
    async searchTeam(name) {
        const teams = { 'manchester united': 66, 'man united': 66, 'man city': 65, 'arsenal': 57, 'chelsea': 61, 'liverpool': 64, 'tottenham': 73, 'barcelona': 81, 'real madrid': 86, 'bayern': 5, 'psg': 524 };
        return teams[name.toLowerCase()];
    }
    async getLiveMatches() {
        const res = await axios.get(`${this.baseURL}/matches?status=LIVE`, { headers: this.headers });
        return res.data.matches;
    }
    async getTeamFixtures(teamId) {
        const res = await axios.get(`${this.baseURL}/teams/${teamId}/matches?status=SCHEDULED&limit=5`, { headers: this.headers });
        return res.data.matches;
    }
    async getTeamResults(teamId) {
        const res = await axios.get(`${this.baseURL}/teams/${teamId}/matches?status=FINISHED&limit=5`, { headers: this.headers });
        return res.data.matches;
    }
    async getTopScorers(leagueCode = 'PL') {
        const res = await axios.get(`${this.baseURL}/competitions/${leagueCode}/scorers?limit=10`, { headers: this.headers });
        return res.data.scorers;
    }
    async getStandings(leagueCode = 'PL') {
        const res = await axios.get(`${this.baseURL}/competitions/${leagueCode}/standings`, { headers: this.headers });
        return res.data.standings[0].table;
    }
    async getMatchDetails(matchId) {
        const res = await axios.get(`${this.baseURL}/matches/${matchId}`, { headers: this.headers });
        return res.data;
    }
}
module.exports = new FootballAPI();
