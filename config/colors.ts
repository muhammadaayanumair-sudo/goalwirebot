export const Colors = {
  PRIMARY: 0x00ff87,
  SECONDARY: 0x00d4ff,
  ACCENT: 0x7c3aed,
  SUCCESS: 0x22c55e,
  WARNING: 0xf59e0b,
  ERROR: 0xef4444,
  INFO: 0x3b82f6,
  DARK: 0x0a0a0f,
  DARKER: 0x050508,
  CARD: 0x111118,
  CARD_HOVER: 0x1a1a24,
  TEXT_PRIMARY: 0xffffff,
  TEXT_SECONDARY: 0x94a3b8,
  TEXT_MUTED: 0x64748b,
  BORDER: 0x1e1e2e,
  BORDER_HOVER: 0x2e2e3e,
  GOAL: 0x00ff87,
  ASSIST: 0x00d4ff,
  YELLOW_CARD: 0xf5e50a,
  RED_CARD: 0xef4444,
  CLEAN_SHEET: 0x22c55e,
  SAVE: 0x6366f1,
  PENALTY: 0xf97316,
  OWN_GOAL: 0xdc2626,
  SUBSTITUTION: 0x8b5cf6,
  GOLD: 0xffd700,
  SILVER: 0xc0c0c0,
  BRONZE: 0xcd7f32,
  PREMIUM: 0xf59e0b,
  PARTNER: 0x7c3aed,
  TIER_1: 0x00ff87,
  TIER_2: 0x00d4ff,
  TIER_3: 0x7c3aed,
  TIER_4: 0xf59e0b,
  TIER_5: 0xef4444,
  LEAGUE_CHAMPIONS: 0x00d4ff,
  LEAGUE_EUROPA: 0xf97316,
  LEAGUE_CONFERENCE: 0x22c55e,
  LEAGUE_PREMIER: 0x7c3aed,
  LEAGUE_LALIGA: 0xef4444,
  LEAGUE_BUNDESLIGA: 0xef4444,
  LEAGUE_SERIE_A: 0x3b82f6,
  LEAGUE_LIGUE1: 0x00d4ff,
} as const;

export const GradientColors = {
  PRIMARY: [0x00ff87, 0x00d4ff] as const,
  SECONDARY: [0x7c3aed, 0x00d4ff] as const,
  SUCCESS: [0x22c55e, 0x16a34a] as const,
  WARNING: [0xf59e0b, 0xd97706] as const,
  ERROR: [0xef4444, 0xdc2626] as const,
  GOLD: [0xffd700, 0xf59e0b] as const,
  PREMIUM: [0xf59e0b, 0x7c3aed] as const,
  DARK: [0x0a0a0f, 0x111118] as const,
} as const;

export const HexColors = {
  PRIMARY: '#00ff87',
  SECONDARY: '#00d4ff',
  ACCENT: '#7c3aed',
  SUCCESS: '#22c55e',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  INFO: '#3b82f6',
  DARK: '#0a0a0f',
  DARKER: '#050508',
  CARD: '#111118',
  TEXT_SECONDARY: '#94a3b8',
  TEXT_MUTED: '#64748b',
  BORDER: '#1e1e2e',
  GOAL: '#00ff87',
} as const;

export function getLeagueColor(leagueId: number): number {
  const leagueColors: Record<number, number> = {
    2: Colors.LEAGUE_CHAMPIONS,
    3: Colors.LEAGUE_EUROPA,
    39: Colors.LEAGUE_PREMIER,
    61: Colors.LEAGUE_LIGUE1,
    78: Colors.LEAGUE_BUNDESLIGA,
    135: Colors.LEAGUE_SERIE_A,
    140: Colors.LEAGUE_LALIGA,
  };
  return leagueColors[leagueId] || Colors.PRIMARY;
}

export function getRatingColor(rating: number): number {
  if (rating >= 9.0) return Colors.GOLD;
  if (rating >= 8.0) return Colors.SUCCESS;
  if (rating >= 7.0) return Colors.INFO;
  if (rating >= 6.0) return Colors.WARNING;
  return Colors.ERROR;
}

export function getPriceColor(price: number): number {
  if (price >= 80_000_000) return Colors.GOLD;
  if (price >= 50_000_000) return Colors.PREMIUM;
  if (price >= 30_000_000) return Colors.SUCCESS;
  if (price >= 15_000_000) return Colors.INFO;
  return Colors.TEXT_SECONDARY;
}
