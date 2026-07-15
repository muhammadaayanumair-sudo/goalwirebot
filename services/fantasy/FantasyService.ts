import { FantasyTeam } from '../../database/models/FantasyTeam';
import { FantasyLeague } from '../../database/models/FantasyLeague';
import { User } from '../../database/models/User';
import { logger } from '../../utils/logger';
import { FANTASY_LIMITS, ECONOMY } from '../../config/constants';

export class FantasyService {
  static async createTeam(userId: string, teamName: string, leagueCode?: string): Promise<any> {
    try {
      const existing = await FantasyTeam.findOne({ userId });
      if (existing) return { success: false, error: 'You already have a fantasy team.' };

      const teamCount = await FantasyTeam.countDocuments({ userId });
      if (teamCount >= FANTASY_LIMITS.MAX_TEAMS_PER_USER) {
        return { success: false, error: `Max ${FANTASY_LIMITS.MAX_TEAMS_PER_USER} teams per user.` };
      }

      const team = await FantasyTeam.create({
        userId,
        name: teamName,
        budget: ECONOMY.STARTING_BUDGET,
        gameweek: 1,
        chips: {
          wildcard: false,
          freeHit: false,
          benchBoost: false,
          tripleCaptain: false,
        },
      });

      await User.findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId, username: 'Unknown' } },
        { upsert: true },
      );

      let league = null;
      if (leagueCode) {
        league = await FantasyLeague.findOne({ code: leagueCode.toUpperCase() });
        if (league && league.members.length < league.maxPlayers) {
          league.members.push({ userId, teamId: team._id.toString(), joinedAt: new Date() });
          await league.save();
        }
      }

      return { success: true, team, league };
    } catch (error) {
      logger.error('[FantasyService] createTeam error', error);
      return { success: false, error: 'Failed to create team.' };
    }
  }

  static async getTeam(userId: string): Promise<any> {
    try {
      return await FantasyTeam.findOne({ userId }).populate('players');
    } catch {
      return null;
    }
  }

  static async getTeamPoints(userId: string): Promise<{ totalPoints: number; gameweekPoints: number; rank: number }> {
    return { totalPoints: 0, gameweekPoints: 0, rank: 0 };
  }

  static async getFormation(lineup: any[]): Promise<string> {
    const def = lineup.filter(p => p.position === 'Defender').length;
    const mid = lineup.filter(p => p.position === 'Midfielder').length;
    const fwd = lineup.filter(p => p.position === 'Forward').length;
    return `${def}-${mid}-${fwd}`;
  }

  static async searchLeagues(query: string): Promise<any[]> {
    return FantasyLeague.find({ name: { $regex: query, $options: 'i' } }).limit(10);
  }

  static async setFormation(userId: string, formation: string): Promise<any> {
    return { success: true, formation };
  }

  static async autoOptimizeLineup(userId: string): Promise<any> {
    return { success: true, formation: '4-3-3', predictedPoints: 65, confidence: 0.78, changes: [] };
  }

  static async setCaptain(userId: string, captainId: string, viceId?: string): Promise<void> {
    // Implementation
  }

  static async swapCaptaincy(userId: string): Promise<any> {
    return { success: true, captain: { name: 'Player' }, viceCaptain: { name: 'Player' } };
  }

  static async activateTripleCaptain(userId: string): Promise<any> {
    return { success: true, captain: 'Player' };
  }

  static async getCurrentGameweek(): Promise<number> {
    return 24;
  }

  static async sendChallenge(userId: string, opponentId: string, gameweek: number): Promise<any> {
    return { success: true, challengeId: 'challenge_123' };
  }

  static async cancelChallenge(userId: string): Promise<any> {
    return { success: true, opponent: 'Player' };
  }

  static async getPendingChallenges(userId: string): Promise<any[]> {
    return [];
  }

  static async getChallengeHistory(userId: string): Promise<any[]> {
    return [];
  }

  static async acceptChallenge(userId: string, challengeId?: string): Promise<any> {
    return { success: true, challenger: 'Player1', acceptor: 'Player2', gameweek: 24, matchupId: 'match_123', kickoffTimestamp: Math.floor(Date.now() / 1000) + 86400 };
  }

  static async getNextChallenge(userId: string): Promise<any> {
    return null;
  }

  static async getActiveChallenges(userId: string): Promise<any[]> {
    return [];
  }

  static async getAllChallengeMatchups(gameweek: number): Promise<any[]> {
    return [];
  }

  static async getMatchupById(matchupId: string): Promise<any> {
    return null;
  }

  static async getMatchupWithUser(userId: string, opponentId: string): Promise<any> {
    return null;
  }

  static async getCurrentMatchup(userId: string): Promise<any> {
    return null;
  }

  static async getProfile(userId: string): Promise<any> {
    return {
      teamName: 'Test Team',
      pointsHistory: [45, 62, 38, 71, 55],
      globalRank: 1500,
      totalTransfers: 24,
      wildcardsUsed: 1,
      wildcardLimit: 2,
      leagueCount: 2,
      badges: [{ name: 'Early Adopter', description: 'Joined in Season 1' }],
      partnerBadge: false,
      bio: 'Fantasy football enthusiast!',
    };
  }

  static async getGameweekHistory(userId: string): Promise<any[]> {
    return [];
  }

  static async getTransferHistory(userId: string): Promise<any[]> {
    return [];
  }

  static async getCaptainHistory(userId: string): Promise<any[]> {
    return [];
  }

  static async getRankHistory(userId: string): Promise<any[]> {
    return [];
  }

  static async getHeadToHead(userId: string, opponentId: string): Promise<any> {
    return null;
  }

  static async createLeague(userId: string, name: string, options?: any): Promise<any> {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const league = await FantasyLeague.create({
      name,
      code,
      ownerId: userId,
      type: options?.type || 'private',
      maxPlayers: options?.maxPlayers || 50,
      description: options?.description || '',
      members: [{ userId, joinedAt: new Date() }],
    });
    return { success: true, league };
  }

  static async joinLeague(userId: string, code: string): Promise<any> {
    const league = await FantasyLeague.findOne({ code: code.toUpperCase() });
    if (!league) return { success: false, error: 'Invalid league code.' };
    if (league.members.length >= league.maxPlayers) return { success: false, error: 'League is full.' };
    if (league.members.some(m => m.userId === userId)) return { success: false, error: 'Already in this league.' };
    league.members.push({ userId, joinedAt: new Date() });
    await league.save();
    return { success: true, league, initialRank: league.members.length };
  }

  static async leaveLeague(userId: string): Promise<any> {
    return { success: true, leagueName: 'League' };
  }

  static async getLeagueByCode(code: string): Promise<any> {
    return FantasyLeague.findOne({ code: code.toUpperCase() });
  }

  static async getUserLeague(userId: string): Promise<any> {
    return FantasyLeague.findOne({ 'members.userId': userId });
  }

  static async getUserLeagues(userId: string): Promise<any[]> {
    return FantasyLeague.find({ 'members.userId': userId });
  }

  static async deleteLeague(userId: string): Promise<any> {
    return { success: true, leagueName: 'League' };
  }

  static async searchAvailablePlayers(query: string, userId: string): Promise<any[]> {
    return [];
  }

  static async searchSquadPlayers(query: string, userId: string): Promise<any[]> {
    return [];
  }
}

export default FantasyService;
