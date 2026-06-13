const axios = require('axios');

class NewsAPI {
    constructor() {
        this.baseURL = 'https://newsapi.org/v2';
        this.apiKey = process.env.NEWS_API_KEY;
    }

    async getFootballNews(query = 'football OR "Premier League" OR "Champions League"') {
        try {
            const res = await axios.get(`${this.baseURL}/everything`, {
                params: {
                    q: query,
                    language: 'en',
                    sortBy: 'publishedAt',
                    pageSize: 5,
                    apiKey: this.apiKey
                }
            });
            return res.data.articles.filter(a => a.urlToImage); // Only articles with images
        } catch (e) {
            console.log('NewsAPI error:', e.message);
            return [];
        }
    }

    async getTransferNews() {
        return this.getFootballNews('football transfer OR "transfer window" OR "signing"');
    }

    async getTeamNews(teamName) {
        return this.getFootballNews(`"${teamName}" football`);
    }
}

module.exports = new NewsAPI();