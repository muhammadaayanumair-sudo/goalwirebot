import { Env } from '../../config/env';
import { logger } from '../../utils/logger';

export class NewsService {
  static async getLatestNews(): Promise<any[]> {
    try {
      if (!Env.GNEWS_API_KEY) return [];
      const res = await fetch(`https://gnews.io/api/v4/top-headlines?category=sports&lang=en&max=10&apikey=${Env.GNEWS_API_KEY}`);
      const data = await res.json();
      return (data.articles || []).map((a: any) => ({
        title: a.title, url: a.url, source: a.source?.name || 'GNews',
        date: a.publishedAt, description: a.description, image: a.image,
      }));
    } catch (error) {
      logger.error('[NewsService] getLatestNews error', error);
      return [];
    }
  }

  static async searchNews(query: string): Promise<any[]> { return []; }
  static async getTeamNews(teamName: string): Promise<any[]> { return []; }
  static async getLeagueNews(leagueId: number): Promise<any[]> { return []; }
  static async getPlayerNews(playerName: string): Promise<any[]> { return []; }
  static async getBreakingNews(): Promise<any[]> { return []; }
  static async getBreakingTransferNews(): Promise<any[]> { return []; }
  static async getInjuryNews(): Promise<any[]> { return []; }
  static async subscribeToBreaking(userId: string, teamName: string): Promise<any> { return { success: true }; }
  static async unsubscribeFromBreaking(userId: string): Promise<any> { return { success: true }; }
  static async getTransferNews(): Promise<any[]> { return []; }
  static async getDoneDeals(): Promise<any[]> { return []; }
  static async getTransferRumours(): Promise<any[]> { return []; }
  static async getTeamTransferNews(teamName: string): Promise<any[]> { return []; }
  static async getBiggestTransferStories(): Promise<any[]> { return []; }
  static async autocomplete(query: string): Promise<{ name: string; value: string }[]> { return []; }
}

export default NewsService;
