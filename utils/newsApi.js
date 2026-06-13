const axios = require('axios');
class NewsAPI {
    constructor() {
        this.baseURL = 'https://newsapi.org/v2';
        this.apiKey = process.env.NEWS_API_KEY;
    }
    async getFootballNews(query = 'football OR "Premier League"') {
        try {
            const res = await axios.get(`${this.baseURL}/everything`, {
                params: { q: query, language: 'en', sortBy: 'publishedAt', pageSize: 5, apiKey: this.apiKey }
            });
            return res.data.articles.filter(a => a.urlToImage);
        } catch (e) { return []; }
    }
    async getTransferNews() {
        return this.getFootballNews('football transfer OR "transfer window"');
    }
}
module.exports = new NewsAPI();