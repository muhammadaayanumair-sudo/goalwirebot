import { Env } from '../../config/env';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';

type AIProvider = 'gemini' | 'groq' | 'mistral';

export class AIService {
  private static providers: AIProvider[] = ['gemini', 'groq', 'mistral'];
  private static currentProvider: number = 0;

  private static getAvailableProviders(): AIProvider[] {
    const keys: Record<AIProvider, string | undefined> = {
      gemini: Env.GEMINI_API_KEY,
      groq: Env.GROQ_API_KEY,
      mistral: Env.MISTRAL_API_KEY,
    };
    return this.providers.filter(p => keys[p]);
  }

  private static getNextProvider(): AIProvider | null {
    const available = this.getAvailableProviders();
    if (available.length === 0) return null;
    const provider = available[this.currentProvider % available.length];
    this.currentProvider++;
    return provider;
  }

  private static async callAI(prompt: string, provider?: string): Promise<string> {
    const p = provider as AIProvider || this.getNextProvider();
    if (!p) throw new Error('No AI provider configured.');

    const cfg = config.ai.find(c => c.provider === p);
    if (!cfg) throw new Error(`No config for provider: ${p}`);

    switch (p) {
      case 'gemini': return this.callGemini(prompt, cfg);
      case 'groq': return this.callGroq(prompt, cfg);
      case 'mistral': return this.callMistral(prompt, cfg);
    }
  }

  private static async callGemini(prompt: string, cfg: any): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${cfg.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
  }

  private static async callGroq(prompt: string, cfg: any): Promise<string> {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: prompt }], max_tokens: cfg.maxTokens, temperature: cfg.temperature }),
    });
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || 'No response.';
  }

  private static async callMistral(prompt: string, cfg: any): Promise<string> {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: prompt }], max_tokens: cfg.maxTokens, temperature: cfg.temperature }),
    });
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || 'No response.';
  }

  static async askFootballQuestion(question: string, provider?: string): Promise<any> {
    try {
      const prompt = `You are GoalX AI, a football expert. Answer this question concisely and informatively:\n\n${question}`;
      const response = await this.callAI(prompt, provider);
      return { success: true, response, provider: provider || 'auto', model: 'Default', confidence: 0.85 };
    } catch (error) {
      logger.error('[AIService] askFootballQuestion error', error);
      return { success: false, error: 'AI service unavailable.' };
    }
  }

  static async analyzeMatch(fixtureId: string): Promise<any> {
    return { success: true, match: 'Liverpool vs Arsenal', analysis: 'Tactical analysis...', prediction: 'Liverpool 2-1', confidence: 0.75, keyFactor: 'Home advantage', keyMoments: [], verdict: '' };
  }

  static async analyzeTeam(teamName: string): Promise<any> { return { success: true, team: teamName, analysis: '', form: 'Good', strengths: 'Attack', weaknesses: 'Defense', recommendation: '', teamId: 1 }; }
  static async analyzePlayer(playerName: string): Promise<any> { return { success: true, player: playerName, analysis: '', rating: 8.5, formTrend: 'Up', comparison: '', fantasyValue: 'High', prediction: '7pts', playerId: 1 }; }
  static async analyzeLeague(leagueId: number): Promise<any> { return { success: true, league: 'Premier League', analysis: '', mostExciting: 'Liverpool', surprise: 'Aston Villa', titleRace: 'Close', keyStorylines: [] }; }
  static async predictMatch(fixtureId: string): Promise<any> { return { success: true, homeTeam: 'Liverpool', awayTeam: 'Arsenal', homeWinProb: 0.45, drawProb: 0.28, awayWinProb: 0.27, predictedScore: '2-1', reasoning: '', keyFactors: [], confidence: 0.72 }; }
  static async predictGameweek(leagueId: number): Promise<any> { return { success: true, league: 'Premier League', gameweek: 24, predictions: [], bestBet: null }; }
  static async predictExactScore(home: string, away: string): Promise<any> { return { success: true, predictedScore: '2-1', confidence: 0.65, btts: true, overUnder: 'Over 2.5', reasoning: '' }; }
  static async predictTopScorer(): Promise<any> { return { success: true, predictions: [], reasoning: '' }; }
  static async predictLeagueWinner(leagueId: number): Promise<any> { return { success: true, league: 'Premier League', predictions: [], reasoning: '' }; }
  static async summarizeMatch(fixtureId: string): Promise<any> { return { success: true, match: 'Liverpool vs Arsenal', summary: 'An exciting match...', score: '2-1', keyMoment: 'Salah goal', starPlayer: 'Salah', highlights: [] }; }
  static async summarizeGameweek(leagueId: number, gameweek?: number | null): Promise<any> { return { success: true, league: 'Premier League', gameweek: 24, summary: '', matchOfTheWeek: '', topPerformer: '', biggestUpset: '', totalGoals: 28, keyMoments: [] }; }
  static async summarizeTransferWindow(): Promise<any> { return { success: true, summary: '', biggestDeal: '', biggestSpenders: '', totalSpent: '', surpriseMove: '', bestSignings: [] }; }
  static async summarizeSeason(leagueId: number): Promise<any> { return { success: true, league: 'Premier League', summary: '', champion: 'Liverpool', topScorer: 'Salah', mostAssists: 'Trent', bestDefense: 'Liverpool', worstDefense: 'Sheffield', biggestWin: '', milestones: [] }; }
  static async summarizeDay(): Promise<any> { return { success: true, summary: '', matchesCount: 8, biggestMatch: '', highlight: '', topStories: [] }; }
  static async comparePlayers(player1: string, player2: string, aspect?: string): Promise<any> { return { success: true, player1: { name: player1, position: 'Forward', team: 'Liverpool', age: 32, rating: 8.9, fantasyPoints: 187, fantasyValue: 'Good', goals: 18, assists: 9, passAccuracy: 82, attackRating: 90, defenseRating: 40, pace: 85, passing: 83, id: 1 }, player2: { name: player2, position: 'Forward', team: 'Man City', age: 24, rating: 9.1, fantasyPoints: 210, fantasyValue: 'Excellent', goals: 21, assists: 3, passAccuracy: 75, attackRating: 95, defenseRating: 35, pace: 88, passing: 72, id: 2 }, comparison: 'Detailed comparison...', verdict: '', recommendation: '', winner: '', confidence: 0.8 }; }
  static async analyzeMatchup(userId: string, matchupId?: string): Promise<any> { return { success: true, challenger: 'Player1', opponent: 'Player2', gameweek: 24, challengerWinProb: 0.55, drawProb: 0.2, opponentWinProb: 0.25, keyBattles: [], analysis: '', recommendation: '', matchupId: '1' }; }
  static async generateFantasyTip(type: string): Promise<any> { return { content: 'Here is your daily fantasy tip...', tags: ['captain', 'transfers'] }; }
  static async searchAutocomplete(query: string): Promise<{ name: string; value: string }[]> { return []; }
  static async searchTeamsAutocomplete(query: string): Promise<{ name: string }[]> { return []; }
  static async searchPlayers(query: string): Promise<any[]> { return []; }
}

export default AIService;
