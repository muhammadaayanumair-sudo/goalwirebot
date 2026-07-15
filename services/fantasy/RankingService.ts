import { FantasyTeam } from '../../database/models/FantasyTeam';
import { FantasyLeague } from '../../database/models/FantasyLeague';
import { logger } from '../../utils/logger';

export class RankingService {
  static async getGlobalLeaderboard(page: number, limit: number): Promise<{ entries: any[]; totalPages: number; total: number }> {
    try {
      const total = await FantasyTeam.countDocuments();
      const teams = await FantasyTeam.find()
        .sort({ totalPoints: -1 })
        .skip(page * limit)
        .limit(limit)
        .lean();

      return {
        entries: teams.map((t, i) => ({
          userId: t.userId,
          username: 'User',
          teamName: t.name,
          points: t.totalPoints || 0,
          gameweekRank: 0,
          gameweek: 0,
        })),
        totalPages: Math.ceil(total / limit),
        total,
      };
    } catch (error) {
      logger.error('[RankingService] getGlobalLeaderboard error', error);
      return { entries: [], totalPages: 0, total: 0 };
    }
  }

  static async getUserGlobalRank(userId: string): Promise<{ rank: number; points: number; teamName: string } | null> {
    try {
      const team = await FantasyTeam.findOne({ userId });
      if (!team) return null;
      const higher = await FantasyTeam.countDocuments({ totalPoints: { $gt: team.totalPoints || 0 } });
      return { rank: higher + 1, points: team.totalPoints || 0, teamName: team.name };
    } catch {
      return null;
    }
  }

  static async getLeagueStandings(leagueId: string): Promise<any[]> {
    return [];
  }

  static async getGameweekTop(limit: number): Promise<any[]> {
    return [];
  }

  static async getFriendLeaderboard(userId: string): Promise<any[]> {
    return [];
  }

  static async getGameweekWinners(limit: number): Promise<any[]> {
    return [];
  }
}

export default RankingService;
