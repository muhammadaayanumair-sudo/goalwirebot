const axios = require('axios');

class NewsAPI {
    constructor() {
        this.baseURL = 'https://newsapi.org/v2';
        this.apiKey = process.env.NEWS_API_KEY;
    }

    async getFootballNews() {
        const res = await axios.get(`${this.baseURL}/everything`, {
            params: {
                q: 'football OR soccer OR "Premier League" OR "Champions League"',
                language: 'en',
                sortBy: 'publishedAt',
                pageSize: 5,
                apiKey: this.apiKey
            }
        });
        return res.data.articles;
    }
}

module.exports = new NewsAPI();
