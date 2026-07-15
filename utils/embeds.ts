import {
  EmbedBuilder,
  ColorResolvable,
  APIEmbedField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
  type Message,
  type InteractionReplyOptions,
  type MessagePayload,
  type ChatInputCommandInteraction,
  type InteractionResponse,
  type MessageComponentInteraction,
  type Collection,
  type Snowflake,
  type APIEmbed,
  type EmbedData,
  type BaseMessageOptions,
  type JSONEncodable,
  GuildMember,
  User,
  Role,
  Channel,
  Guild,
} from 'discord.js';
import { Colors, HexColors, GradientColors } from '../config/colors';
import { BOT_NAME, BOT_VERSION, EMOJIS, POINTS, ECONOMY, FANTASY_LIMITS, LEAGUE_IDS, COOLDOWNS } from '../config/constants';
import { logger } from './logger';

const FOOTER_TEXT = `${BOT_NAME} v${BOT_VERSION} · ⚽ The Ultimate Fantasy Football Bot`;
const FOOTER_ICON = 'https://goalx.gg/assets/logo.png';
const GOALX_BRAND_COLOR = 0x00ff87;
const MAX_FIELDS = 25;
const MAX_DESC_LENGTH = 4096;
const MAX_FIELD_VALUE = 1024;
const MAX_EMBED_TITLE = 256;
const MAX_FOOTER = 128;
const MAX_AUTHOR = 256;

type EmbedColor = ColorResolvable;
type EmbedPage = EmbedBuilderExtended | EmbedBuilder;
type PaginationButtonStyle = 'primary' | 'secondary' | 'success' | 'danger';

interface PaginationConfig {
  timeout?: number;
  ephemeral?: boolean;
  buttons?: {
    first?: { emoji?: string; style?: PaginationButtonStyle };
    prev?: { emoji?: string; style?: PaginationButtonStyle };
    next?: { emoji?: string; style?: PaginationButtonStyle };
    last?: { emoji?: string; style?: PaginationButtonStyle };
    stop?: { emoji?: string; style?: PaginationButtonStyle };
  };
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

interface ConfirmConfig {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmStyle?: ButtonStyle;
  cancelStyle?: ButtonStyle;
  timeout?: number;
  ephemeral?: boolean;
}

interface SelectMenuOption {
  label: string;
  value: string;
  description?: string;
  emoji?: string;
  default?: boolean;
}

interface ProgressBarConfig {
  size?: number;
  filled?: string;
  empty?: string;
  showLabel?: boolean;
}

interface StatBarConfig {
  size?: number;
  homeEmoji?: string;
  awayEmoji?: string;
  emptyEmoji?: string;
}

interface BuildEmbedOptions {
  title: string;
  description?: string;
  color?: ColorResolvable;
  fields?: APIEmbedField[];
  thumbnail?: string;
  image?: string;
  author?: { name: string; iconURL?: string; url?: string };
  footer?: { text: string; iconURL?: string };
  timestamp?: Date | number;
  url?: string;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  value: string;
  highlight?: boolean;
  emoji?: string;
  extra?: string;
  id?: string;
}

interface StandingsEntry {
  position: number;
  name: string;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  form?: string;
  badge?: string;
  teamId?: number;
  recentResults?: string[];
  homeRecord?: { wins: number; draws: number; losses: number };
  awayRecord?: { wins: number; draws: number; losses: number };
}

interface MatchEvent {
  type: 'goal' | 'card' | 'substitution' | 'var' | 'penalty' | 'own_goal' | 'missed_penalty';
  team: string;
  player: string;
  minute: number;
  extraMin?: number;
  assist?: string;
  cardColor?: 'yellow' | 'red';
  varDecision?: string;
}

interface FantasyBreakdown {
  appearance: number;
  goals: number;
  assists: number;
  cleanSheet: number;
  saves: number;
  penaltySave: number;
  penaltyMiss: number;
  bonus: number;
  yellowCards: number;
  redCards: number;
  ownGoals: number;
  goalsConceded: number;
  captainMultiplier: number;
  total: number;
}

interface PlayerStats {
  appearances: number;
  goals: number;
  assists: number;
  minutes: number;
  shots: number;
  shotsOnTarget: number;
  passAccuracy: number;
  keyPasses: number;
  tackles: number;
  interceptions: number;
  clearances: number;
  dribbles: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  rating: number;
}

interface SystemStats {
  uptime: number;
  guilds: number;
  users: number;
  commandsRun: number;
  commandsThisSession: number;
  memory: { heapUsed: number; heapTotal: number; rss: number; external: number };
  ping: number;
  apiStatus: 'healthy' | 'degraded' | 'down';
  lastRestart: Date;
  shardId: number;
  totalShards: number;
  databaseStatus: 'connected' | 'disconnected' | 'error';
  redisStatus: 'connected' | 'disconnected';
  apiCallsToday: number;
  activeJobs: string[];
}

function truncate(text: string, max: number): string {
  if (!text || typeof text !== 'string') return '';
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

function sanitize(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/@everyone/g, '@\u200Beveryone')
    .replace(/@here/g, '@\u200Bhere')
    .replace(/@&/g, '@\u200B&')
    .replace(/```/g, '\\`\\`\\`')
    .replace(/<@&\d+>/g, '[@\u200Brole]')
    .replace(/<@!\d+>/g, '[@\u200Buser]')
    .replace(/<@\d+>/g, '[@\u200Buser]')
    .replace(/<#\d+>/g, '[#\u200Bchannel]');
}

function escapeMarkdown(text: string): string {
  if (!text) return '';
  return text.replace(/[_*~`|\\<>\[\]]/g, '\\$&');
}

function formatNumber(num: number): string {
  if (num === null || num === undefined || !Number.isFinite(num)) return '0';
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString('en-US');
}

function formatPrice(price: number): string {
  if (!Number.isFinite(price)) return '$0';
  return `$${formatNumber(price)}`;
}

function formatOrdinal(n: number): string {
  if (!Number.isInteger(n)) return `${n}`;
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return '0m';
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = Math.floor(minutes % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length === 0) parts.push(`${m}m`);
  return parts.join(' ');
}

function formatPercentage(num: number, decimals: number = 1): string {
  if (!Number.isFinite(num)) return '0%';
  return `${(num * 100).toFixed(decimals)}%`;
}

function formatDate(date: Date | string | number, style: 'short' | 'long' | 'relative' | 'time' = 'short'): string {
  const ts = Math.floor((date instanceof Date ? date.getTime() : new Date(date).getTime()) / 1000);
  if (!Number.isFinite(ts)) return 'Invalid date';
  const formatMap = { short: 'd', long: 'F', relative: 'R', time: 't' };
  return `<t:${ts}:${formatMap[style]}>`;
}

function createProgressBar(
  value: number,
  max: number = 100,
  config: ProgressBarConfig = {},
): string {
  const { size = 15, filled = '🟢', empty = '⚪', showLabel = false } = config;
  const ratio = Math.min(Math.max(value / max, 0), 1);
  const filledCount = Math.round(ratio * size);
  const bar = filled.repeat(filledCount) + empty.repeat(Math.max(0, size - filledCount));
  return showLabel ? `${bar} ${(ratio * 100).toFixed(1)}%` : bar;
}

function createStatBar(home: number, away: number, config: StatBarConfig = {}): string {
  const { size = 15, homeEmoji = '🟢', awayEmoji = '🔴', emptyEmoji = '⚪' } = config;
  const total = home + away || 1;
  const homeBars = Math.round((home / total) * size);
  const awayBars = Math.round((away / total) * size);
  const remaining = size - homeBars - awayBars;
  return `${homeEmoji.repeat(homeBars)}${awayEmoji.repeat(awayBars)}${emptyEmoji.repeat(Math.max(0, remaining))}`;
}

function createFormBar(form: string, length: number = 5): string {
  if (!form) return '';
  return form
    .slice(-length)
    .split('')
    .map(c => {
      if (c === 'W' || c === '✅') return '✅';
      if (c === 'D' || c === '➖' || c === 'd') return '➖';
      if (c === 'L' || c === '❌') return '❌';
      return '❓';
    })
    .join('');
}

function createRatingStars(rating: number, max: number = 5): string {
  if (!Number.isFinite(rating)) return '';
  const filled = Math.round((rating / 10) * max);
  return '⭐'.repeat(filled) + '☆'.repeat(Math.max(0, max - filled));
}

function createDifficultyDots(difficulty: number): string {
  const clamped = Math.max(1, Math.min(5, Math.round(difficulty)));
  const green = Math.max(0, 3 - clamped);
  const red = Math.max(0, clamped - 2);
  const yellow = 5 - green - red;
  return '🟢'.repeat(green) + '🟡'.repeat(yellow) + '🔴'.repeat(red);
}

function createConfidenceDots(confidence: number): string {
  const size = 10;
  const filled = Math.round(Math.min(Math.max(confidence, 0), 1) * size);
  return '🟢'.repeat(filled) + '⚪'.repeat(size - filled);
}

function createHealthBar(value: number, max: number = 100): string {
  const ratio = value / max;
  if (ratio >= 0.7) return `${'🟢'.repeat(5)}${'⚪'.repeat(5)}`;
  if (ratio >= 0.4) return `${'🟡'.repeat(3)}${'⚪'.repeat(7)}`;
  return `${'🔴'.repeat(2)}${'⚪'.repeat(8)}`;
}

const colorCache = new Map<string, number>();
const LEAGUE_COLORS: Record<number, number> = {
  1: 0xffd700, 2: 0x00d4ff, 3: 0xf97316, 4: 0x3b82f6,
  9: 0x22c55e, 39: 0x7c3aed, 45: 0xef4444, 48: 0x00d4ff,
  61: 0x00d4ff, 62: 0x7c3aed, 71: 0x22c55e, 72: 0xf97316,
  73: 0x3b82f6, 78: 0xef4444, 79: 0x00d4ff, 81: 0x22c55e,
  82: 0x7c3aed, 83: 0xf97316, 84: 0x3b82f6, 85: 0xef4444,
  86: 0x00d4ff, 88: 0x22c55e, 89: 0x7c3aed, 90: 0xf97316,
  94: 0x3b82f6, 98: 0xef4444, 106: 0x00d4ff, 113: 0x22c55e,
  119: 0x7c3aed, 128: 0xf97316, 130: 0x3b82f6, 131: 0xef4444,
  132: 0x00d4ff, 134: 0x22c55e, 135: 0x3b82f6, 136: 0xef4444,
  137: 0x00d4ff, 138: 0x22c55e, 139: 0x7c3aed, 140: 0xef4444,
  141: 0xf97316, 142: 0x00d4ff, 143: 0x22c55e, 144: 0x3b82f6,
  169: 0xef4444, 179: 0x00d4ff, 180: 0x7c3aed, 182: 0xf97316,
  183: 0x22c55e, 184: 0x3b82f6, 185: 0xef4444, 186: 0x00d4ff,
  187: 0x22c55e, 188: 0x7c3aed, 189: 0xf97316, 190: 0x3b82f6,
  191: 0xef4444, 192: 0x00d4ff, 193: 0x22c55e, 194: 0x7c3aed,
  195: 0xf97316, 196: 0x3b82f6, 197: 0xef4444, 198: 0x00d4ff,
  199: 0x22c55e, 200: 0x7c3aed, 201: 0xf97316, 202: 0x3b82f6,
  203: 0xef4444, 204: 0x00d4ff, 205: 0x22c55e, 206: 0x7c3aed,
  207: 0xf97316, 208: 0x3b82f6, 209: 0xef4444, 210: 0x00d4ff,
  211: 0x22c55e, 212: 0x7c3aed, 213: 0xf97316, 214: 0x3b82f6,
  215: 0xef4444, 216: 0x00d4ff, 217: 0x22c55e, 218: 0x7c3aed,
  219: 0xf97316, 220: 0x3b82f6, 221: 0xef4444, 222: 0x00d4ff,
  223: 0x22c55e, 224: 0x7c3aed, 225: 0xf97316, 226: 0x3b82f6,
  227: 0xef4444, 228: 0x00d4ff, 229: 0x22c55e, 230: 0x7c3aed,
  231: 0xf97316, 232: 0x3b82f6, 233: 0xef4444, 234: 0x00d4ff,
  235: 0x22c55e, 236: 0x7c3aed, 237: 0xf97316, 238: 0x3b82f6,
  239: 0xef4444, 240: 0x00d4ff, 241: 0x22c55e, 242: 0x7c3aed,
  243: 0xf97316, 244: 0x3b82f6, 245: 0xef4444, 246: 0x00d4ff,
  247: 0x22c55e, 248: 0x7c3aed, 249: 0xf97316, 250: 0x3b82f6,
  251: 0xef4444, 252: 0x00d4ff, 253: 0x22c55e, 254: 0x7c3aed,
  255: 0xf97316, 256: 0x3b82f6, 257: 0xef4444, 258: 0x00d4ff,
  259: 0x22c55e, 260: 0x7c3aed, 261: 0xf97316, 262: 0x3b82f6,
  263: 0xef4444, 264: 0x00d4ff, 265: 0x22c55e, 266: 0x7c3aed,
  267: 0xf97316, 268: 0x3b82f6, 269: 0xef4444, 270: 0x00d4ff,
  271: 0x22c55e, 272: 0x7c3aed, 273: 0xf97316, 274: 0x3b82f6,
  275: 0xef4444, 276: 0x00d4ff, 277: 0x22c55e, 278: 0x7c3aed,
  279: 0xf97316, 280: 0x3b82f6, 281: 0xef4444, 282: 0x00d4ff,
  283: 0x22c55e, 284: 0x7c3aed, 285: 0xf97316, 286: 0x3b82f6,
  287: 0xef4444, 288: 0x00d4ff, 289: 0x22c55e, 290: 0x7c3aed,
  291: 0xf97316, 292: 0x3b82f6, 293: 0xef4444, 294: 0x00d4ff,
  295: 0x22c55e, 296: 0x7c3aed, 297: 0xf97316, 298: 0x3b82f6,
  299: 0xef4444, 300: 0x00d4ff, 301: 0x22c55e, 302: 0x7c3aed,
  303: 0xf97316, 304: 0x3b82f6, 305: 0xef4444, 306: 0x00d4ff,
  307: 0x22c55e, 308: 0x7c3aed, 309: 0xf97316, 310: 0x3b82f6,
  311: 0xef4444, 312: 0x00d4ff, 313: 0x22c55e, 314: 0x7c3aed,
  315: 0xf97316, 316: 0x3b82f6, 317: 0xef4444, 318: 0x00d4ff,
  319: 0x22c55e, 320: 0x7c3aed, 321: 0xf97316, 322: 0x3b82f6,
  323: 0xef4444, 324: 0x00d4ff, 325: 0x22c55e, 326: 0x7c3aed,
  327: 0xf97316, 328: 0x3b82f6, 329: 0xef4444, 330: 0x00d4ff,
  331: 0x22c55e, 332: 0x7c3aed, 333: 0xf97316, 334: 0x3b82f6,
  335: 0xef4444, 336: 0x00d4ff, 337: 0x22c55e, 338: 0x7c3aed,
  339: 0xf97316, 340: 0x3b82f6, 341: 0xef4444, 342: 0x00d4ff,
  343: 0x22c55e, 344: 0x7c3aed, 345: 0xf97316, 346: 0x3b82f6,
  347: 0xef4444, 348: 0x00d4ff, 349: 0x22c55e, 350: 0x7c3aed,
  351: 0xf97316, 352: 0x3b82f6, 353: 0xef4444, 354: 0x00d4ff,
  355: 0x22c55e, 356: 0x7c3aed, 357: 0xf97316, 358: 0x3b82f6,
  359: 0xef4444, 360: 0x00d4ff, 361: 0x22c55e, 362: 0x7c3aed,
  363: 0xf97316, 364: 0x3b82f6, 365: 0xef4444, 366: 0x00d4ff,
  367: 0x22c55e, 368: 0x7c3aed, 369: 0xf97316, 370: 0x3b82f6,
  371: 0xef4444, 372: 0x00d4ff, 373: 0x22c55e, 374: 0x7c3aed,
  375: 0xf97316, 376: 0x3b82f6, 377: 0xef4444, 378: 0x00d4ff,
  379: 0x22c55e, 380: 0x7c3aed, 381: 0xf97316, 382: 0x3b82f6,
  383: 0xef4444, 384: 0x00d4ff, 385: 0x22c55e, 386: 0x7c3aed,
  387: 0xf97316, 388: 0x3b82f6, 389: 0xef4444, 390: 0x00d4ff,
  391: 0x22c55e, 392: 0x7c3aed, 393: 0xf97316, 394: 0x3b82f6,
  395: 0xef4444, 396: 0x00d4ff, 397: 0x22c55e, 398: 0x7c3aed,
  399: 0xf97316, 400: 0x3b82f6,
};

const POSITION_COLORS: Record<string, number> = {
  goalkeeper: 0x6366f1, gk: 0x6366f1,
  defender: 0x22c55e, def: 0x22c55e,
  midfielder: 0x00d4ff, mid: 0x00d4ff,
  forward: 0x00ff87, fwd: 0x00ff87, attacker: 0x00ff87, striker: 0xffd700,
};

function getLeagueColor(leagueId: number): number {
  const key = `league_${leagueId}`;
  if (colorCache.has(key)) return colorCache.get(key)!;
  const color = LEAGUE_COLORS[leagueId] || Colors.PRIMARY;
  colorCache.set(key, color);
  return color;
}

function getPositionColor(position: string): number {
  return POSITION_COLORS[position.toLowerCase()] || Colors.PRIMARY;
}

function getRatingColor(rating: number): ColorResolvable {
  if (!Number.isFinite(rating)) return Colors.TEXT_SECONDARY;
  if (rating >= 9.0) return 0xffd700;
  if (rating >= 8.0) return 0x22c55e;
  if (rating >= 7.0) return 0x3b82f6;
  if (rating >= 6.0) return 0xf59e0b;
  return 0xef4444;
}

function getPointsColor(points: number): ColorResolvable {
  if (!Number.isFinite(points)) return Colors.TEXT_SECONDARY;
  if (points >= 80) return 0xffd700;
  if (points >= 60) return 0x22c55e;
  if (points >= 40) return 0x3b82f6;
  if (points >= 20) return 0xf59e0b;
  return 0xef4444;
}

function getPriceColor(price: number): ColorResolvable {
  if (!Number.isFinite(price)) return Colors.TEXT_SECONDARY;
  if (price >= 80_000_000) return 0xffd700;
  if (price >= 50_000_000) return 0xf59e0b;
  if (price >= 30_000_000) return 0x22c55e;
  if (price >= 15_000_000) return 0x3b82f6;
  return 0x94a3b8;
}

function getFormColor(form: string): ColorResolvable {
  const wins = (form.match(/W/g) || []).length;
  const losses = (form.match(/L/g) || []).length;
  const ratio = wins / (wins + losses || 1);
  if (ratio >= 0.7) return 0x22c55e;
  if (ratio >= 0.4) return 0xf59e0b;
  return 0xef4444;
}

function getStatusColor(status: string): ColorResolvable {
  const live = ['LIVE', '1H', '2H', 'HT', 'ET', 'PEN_LIVE'];
  const finished = ['FT', 'AET', 'PEN', 'FF', 'WO'];
  const postponed = ['PST', 'CANC', 'ABD', 'INT', 'SUSP'];
  const scheduled = ['NS', 'TBD', 'SCH'];
  if (live.includes(status)) return 0xef4444;
  if (finished.includes(status)) return 0x22c55e;
  if (postponed.includes(status)) return 0xf59e0b;
  if (scheduled.includes(status)) return 0x3b82f6;
  return Colors.PRIMARY;
}

export class EmbedBuilderExtended extends EmbedBuilder {
  private _fieldsCount: number = 0;
  private _hasTimestamp: boolean = false;
  private _hasFooter: boolean = false;
  private _branding: boolean = true;
  private _version: string = BOT_VERSION;

  constructor(branding: boolean = true) {
    super();
    this._branding = branding;
    if (branding) {
      this.setTimestamp();
      this.setFooter({ text: `${FOOTER_TEXT}`, iconURL: FOOTER_ICON });
      this._hasTimestamp = true;
      this._hasFooter = true;
    }
  }

  setColor(color: ColorResolvable): this {
    super.setColor(color);
    return this;
  }

  setTitle(title: string): this {
    super.setTitle(truncate(sanitize(title), MAX_EMBED_TITLE));
    return this;
  }

  setDescription(description: string): this {
    super.setDescription(truncate(sanitize(description), MAX_DESC_LENGTH));
    return this;
  }

  appendDescription(text: string): this {
    const current = this.data.description || '';
    const separator = current.length > 0 ? '\n' : '';
    return this.setDescription(current + separator + sanitize(text));
  }

  prependDescription(text: string): this {
    const current = this.data.description || '';
    const separator = current.length > 0 ? '\n' : '';
    return this.setDescription(sanitize(text) + separator + current);
  }

  addFields(...fields: APIEmbedField[]): this {
    const available = MAX_FIELDS - this._fieldsCount;
    if (available <= 0) {
      if (this._fieldsCount >= MAX_FIELDS) {
        // Append to last field if over limit
        const lastField = this.data.fields?.[this.data.fields.length - 1];
        if (lastField && fields.length > 0) {
          const extra = fields.map(f => `${f.name}: ${f.value}`).join('\n');
          lastField.value = truncate(lastField.value + '\n' + sanitize(extra), MAX_FIELD_VALUE);
        }
      }
      return this;
    }

    const safe = fields.slice(0, available).map(f => ({
      name: truncate(sanitize(f.name), 256),
      value: truncate(sanitize(f.value), MAX_FIELD_VALUE),
      inline: f.inline ?? false,
    }));

    super.addFields(...safe);
    this._fieldsCount += safe.length;
    return this;
  }

  addBlankField(inline: boolean = false): this {
    return this.addFields({ name: '\u200B', value: '\u200B', inline });
  }

  addDivider(): this {
    return this.addFields({ name: '\u200B', value: '—' . repeat(28) + '—', inline: false });
  }

  addStatRow(label: string, left: string | number, right: string | number, options?: StatBarConfig): this {
    const l = typeof left === 'number' ? left.toString() : left;
    const r = typeof right === 'number' ? right.toString() : right;
    const lNum = parseInt(l) || 0;
    const rNum = parseInt(r) || 0;
    return this.addFields({
      name: label,
      value: `\`${l.padStart(6)}\` ${createStatBar(lNum, rNum, { size: 15, ...options })} \`${r.padStart(6)}\``,
      inline: false,
    });
  }

  addList(name: string, items: string[], inline: boolean = false, numbered: boolean = true): this {
    if (!items || items.length === 0) return this;
    const value = items
      .slice(0, numbered ? 25 : 50)
      .map((item, i) => numbered ? `${i + 1}. ${item}` : `• ${item}`)
      .join('\n')
      .slice(0, MAX_FIELD_VALUE);
    return this.addFields({ name, value, inline });
  }

  addKeyValue(key: string, value: string, inline: boolean = false): this {
    return this.addFields({ name: key, value, inline });
  }

  addProgress(label: string, value: number, max: number = 100, config?: ProgressBarConfig): this {
    return this.addFields({ name: label, value: createProgressBar(value, max, config), inline: false });
  }

  addMultiColumns(columns: string[][], labels?: string[], inline: boolean = true): this {
    if (labels) {
      columns.forEach((col, i) => this.addFields({ name: labels[i] || `Column ${i + 1}`, value: col.join('\n').slice(0, MAX_FIELD_VALUE), inline }));
    } else {
      columns.forEach(col => this.addFields({ name: '\u200B', value: col.join('\n').slice(0, MAX_FIELD_VALUE), inline }));
    }
    return this;
  }

  addFieldPair(leftName: string, leftValue: string, rightName: string, rightValue: string): this {
    return this.addFields(
      { name: leftName, value: leftValue, inline: true },
      { name: rightName, value: rightValue, inline: true },
    );
  }

  addFieldTriplet(aName: string, aValue: string, bName: string, bValue: string, cName: string, cValue: string): this {
    return this.addFields(
      { name: aName, value: aValue, inline: true },
      { name: bName, value: bValue, inline: true },
      { name: cName, value: cValue, inline: true },
    );
  }

  addBulletList(name: string, items: string[], inline: boolean = false): this {
    if (!items || items.length === 0) return this;
    const value = items.map(item => `• ${item}`).join('\n').slice(0, MAX_FIELD_VALUE);
    return this.addFields({ name, value, inline });
  }

  addTagList(name: string, items: string[], inline: boolean = false): this {
    if (!items || items.length === 0) return this;
    const value = items.map(item => `\`${item}\``).join(' ').slice(0, MAX_FIELD_VALUE);
    return this.addFields({ name, value, inline });
  }

  addCodeBlock(name: string, code: string, language: string = '', inline: boolean = false): this {
    const sanitized = sanitize(code).slice(0, MAX_FIELD_VALUE - 10);
    return this.addFields({ name, value: `\`\`\`${language}\n${sanitized}\n\`\`\``, inline });
  }

  addSeasonStats(stats: PlayerStats): this {
    return this.addFields(
      { name: '📊 Season Stats', value: [
        `Apps: **${stats.appearances}** | Goals: **${stats.goals}** | Assists: **${stats.assists}**`,
        `Shots: ${stats.shots} | SOT: ${stats.shotsOnTarget} | Pass%: ${stats.passAccuracy}%`,
        `Tackles: ${stats.tackles} | Int: ${stats.interceptions} | Clr: ${stats.clearances}`,
        `Dribbles: ${stats.dribbles} | Fouls: ${stats.fouls} | 🟨${stats.yellowCards} 🟥${stats.redCards}`,
        `Rating: **${stats.rating.toFixed(1)}**/10`,
      ].join('\n'), inline: false },
    );
  }

  addManagerInfo(name: string, team: string, position: number, points: number, form: string): this {
    return this.addFields({
      name: `👤 ${name}`,
      value: `Team: **${team}** | Rank: **#${position}** | Points: **${points}** | Form: ${createFormBar(form)}`,
      inline: false,
    });
  }

  setFooter(text: string, iconURL?: string): this {
    super.setFooter({
      text: truncate(sanitize(text), MAX_FOOTER),
      iconURL: iconURL || FOOTER_ICON,
    });
    this._hasFooter = true;
    return this;
  }

  removeFooter(): this {
    this.data.footer = undefined;
    this._hasFooter = false;
    return this;
  }

  setTimestamp(timestamp?: Date | number): this {
    super.setTimestamp(timestamp ?? Date.now());
    this._hasTimestamp = true;
    return this;
  }

  removeTimestamp(): this {
    this.data.timestamp = undefined;
    this._hasTimestamp = false;
    return this;
  }

  setAuthor(name: string, iconURL?: string, url?: string): this {
    super.setAuthor({
      name: truncate(sanitize(name), MAX_AUTHOR),
      iconURL,
      url: url && (url.startsWith('http://') || url.startsWith('https://')) ? url : undefined,
    });
    return this;
  }

  setImage(url: string): this {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      super.setImage(url);
    }
    return this;
  }

  setThumbnail(url: string): this {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      super.setThumbnail(url);
    }
    return this;
  }

  setURL(url: string): this {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      super.setURL(url);
    }
    return this;
  }

  setVersion(version: string): this {
    this._version = version;
    if (this._hasFooter && this._branding) {
      this.setFooter(`${BOT_NAME} v${version} · ${FOOTER_TEXT.split('·').slice(1).join('·').trim()}`, FOOTER_ICON);
    }
    return this;
  }

  toJSON(): any {
    const data = super.toJSON();
    return data;
  }

  getFieldCount(): number {
    return this._fieldsCount;
  }

  hasContent(): boolean {
    return !!(this.data.title || this.data.description || (this.data.fields && this.data.fields.length > 0) || this.data.image || this.data.thumbnail);
  }

  isEmpty(): boolean {
    return !this.hasContent();
  }

  clone(): EmbedBuilderExtended {
    const cloned = new EmbedBuilderExtended(this._branding);
    cloned.data = JSON.parse(JSON.stringify(this.data));
    cloned._fieldsCount = this._fieldsCount;
    cloned._hasTimestamp = this._hasTimestamp;
    cloned._hasFooter = this._hasFooter;
    return cloned;
  }

  static from(data: APIEmbed | EmbedData, branding: boolean = true): EmbedBuilderExtended {
    const embed = new EmbedBuilderExtended(branding);
    embed.data = { ...data };
    if (data.fields) embed._fieldsCount = data.fields.length;
    return embed;
  }

  static merge(embeds: EmbedBuilderExtended[]): EmbedBuilderExtended {
    if (embeds.length === 0) return new EmbedBuilderExtended();
    const base = embeds[0].clone();
    for (let i = 1; i < embeds.length; i++) {
      const other = embeds[i];
      if (other.data.fields) base.addFields(...other.data.fields);
      if (other.data.description && !base.data.description) {
        base.setDescription(other.data.description);
      } else if (other.data.description) {
        base.appendDescription(other.data.description);
      }
    }
    return base;
  }
}

function baseEmbed(): EmbedBuilderExtended {
  return new EmbedBuilderExtended();
}

function buildEmbed(options: BuildEmbedOptions): EmbedBuilderExtended {
  const embed = baseEmbed()
    .setColor(options.color || Colors.PRIMARY)
    .setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.fields) embed.addFields(...options.fields);
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);
  if (options.author) embed.setAuthor(options.author.name, options.author.iconURL, options.author.url);
  if (options.footer) embed.setFooter(options.footer.text, options.footer.iconURL);
  if (options.timestamp) embed.setTimestamp(options.timestamp);
  if (options.url) embed.setURL(options.url);
  return embed;
}

export function createEmbed(title: string, description?: string): EmbedBuilderExtended {
  return baseEmbed()
    .setColor(Colors.PRIMARY)
    .setTitle(title)
    .setDescription(description || '');
}

export function createErrorEmbed(title: string, description: string): EmbedBuilderExtended {
  return baseEmbed()
    .setColor(Colors.ERROR)
    .setTitle(`${EMOJIS.ERROR} ${title}`)
    .setDescription(description);
}

export function createSuccessEmbed(title: string, description: string): EmbedBuilderExtended {
  return baseEmbed()
    .setColor(Colors.SUCCESS)
    .setTitle(`${EMOJIS.SUCCESS} ${title}`)
    .setDescription(description);
}

export function createWarningEmbed(title: string, description: string): EmbedBuilderExtended {
  return baseEmbed()
    .setColor(Colors.WARNING)
    .setTitle(`${EMOJIS.WARNING} ${title}`)
    .setDescription(description);
}

export function createInfoEmbed(title: string, description: string): EmbedBuilderExtended {
  return baseEmbed()
    .setColor(Colors.INFO)
    .setTitle(`${EMOJIS.INFO} ${title}`)
    .setDescription(description);
}

export function createBrandEmbed(title: string, description?: string): EmbedBuilderExtended {
  return baseEmbed()
    .setColor(GOALX_BRAND_COLOR)
    .setTitle(`⚽ ${title}`)
    .setDescription(description || '');
}

export function createLoadingEmbed(description: string): EmbedBuilderExtended {
  return baseEmbed()
    .setColor(Colors.PRIMARY)
    .setTitle(`${EMOJIS.LOADING} Loading...`)
    .setDescription(description)
    .setFooter('GoalX AI is processing your request...', FOOTER_ICON);
}

export function createMatchEmbed(
  homeTeam: string,
  awayTeam: string,
  homeScore?: number,
  awayScore?: number,
  status?: string,
  elapsed?: number | string,
  league?: string,
): EmbedBuilderExtended {
  const isLive = status === 'LIVE' || status === '1H' || status === '2H' || status === 'HT' || status === 'ET' || status === 'PEN_LIVE';
  const isFinished = status === 'FT' || status === 'AET' || status === 'PEN' || status === 'FF' || status === 'WO';
  const isPostponed = status === 'PST' || status === 'CANC' || status === 'ABD' || status === 'SUSP';
  const isHalftime = status === 'HT';
  const isExtraTime = status === 'ET';

  const score = homeScore !== undefined && awayScore !== undefined
    ? `**${homeScore} — ${awayScore}**`
    : '**vs**';

  let statusEmoji = '⏳';
  let statusText = 'Upcoming';
  let color = Colors.PRIMARY;

  if (isLive) { statusEmoji = '🔴'; statusText = typeof elapsed === 'number' ? `${elapsed}'` : (elapsed || 'Live'); color = Colors.ERROR; }
  else if (isHalftime) { statusEmoji = '🟡'; statusText = 'Half Time'; color = Colors.WARNING; }
  else if (isExtraTime) { statusEmoji = '🟠'; statusText = 'Extra Time'; color = Colors.PREMIUM; }
  else if (isFinished) { statusEmoji = '✅'; statusText = 'Full Time'; color = Colors.SUCCESS; }
  else if (isPostponed) { statusEmoji = '🔴'; statusText = 'Postponed'; color = Colors.WARNING; }

  const embed = baseEmbed()
    .setColor(color)
    .setTitle(`${statusEmoji} ${homeTeam} ${score} ${awayTeam}`);

  const descParts = [statusText];
  if (league) descParts.push(`📋 ${league}`);
  embed.setDescription(descParts.join(' · '));

  if (isLive) {
    embed.setFooter(`${FOOTER_TEXT} · 🔴 Live — auto-refreshes every 30s`, FOOTER_ICON);
  }

  return embed;
}

export function createPlayerEmbed(
  name: string,
  team: string,
  position: string,
  rating: number,
  photo?: string,
  nationality?: string,
  age?: number,
  marketValue?: number,
  number?: number | string,
  foot?: string,
  height?: string,
  stats?: PlayerStats,
): EmbedBuilderExtended {
  const stars = createRatingStars(rating);
  const price = marketValue ? `${EMOJIS.MONEY} ${formatPrice(marketValue)}` : '';
  const numStr = number ? `#${number}` : '';
  const ageStr = age ? `${age}yo` : '';
  const descParts = [team, position, nationality, numStr, ageStr, foot, height, `${rating.toFixed(1)}/10`, stars, price].filter(Boolean);

  const embed = baseEmbed()
    .setColor(getRatingColor(rating))
    .setTitle(`${EMOJIS.GOAL} ${name}`)
    .setDescription(descParts.join(' · '));

  if (stats) embed.addSeasonStats(stats);
  if (photo) embed.setThumbnail(photo);

  embed.addFields(
    { name: '⭐ Rating', value: `${'⭐'.repeat(Math.round(rating / 2))}`, inline: true },
    { name: '📊 Value Score', value: `${(rating / 10 * 100).toFixed(0)}%`, inline: true },
  );

  return embed;
}

export function createTeamEmbed(
  name: string,
  badge?: string,
  country?: string,
  league?: string,
  manager?: string,
  venue?: string,
  founded?: number,
  capacity?: number,
): EmbedBuilderExtended {
  const parts = [
    country,
    league,
    manager ? `Coach: **${manager}**` : '',
    founded ? `Est. ${founded}` : '',
    venue ? `🏟️ ${venue}` : '',
    capacity ? `👥 ${capacity.toLocaleString()}` : '',
  ].filter(Boolean);

  const embed = baseEmbed()
    .setColor(Colors.PRIMARY)
    .setTitle(`📋 ${name}`)
    .setDescription(parts.join(' · '));
  if (badge && (badge.startsWith('http://') || badge.startsWith('https://'))) embed.setThumbnail(badge);
  return embed;
}

export function createStandingsEmbed(
  leagueName: string,
  season: string,
  entries: StandingsEntry[],
): EmbedBuilderExtended {
  const embed = baseEmbed()
    .setColor(Colors.PRIMARY)
    .setTitle(`${EMOJIS.CROWN} ${leagueName}`)
    .setDescription(`Season: ${season} · ${entries.length} teams`);

  const lines = entries.slice(0, 24).map(e => {
    const badge = e.position === 1 ? '🥇' : e.position === 2 ? '🥈' : e.position === 3 ? '🥉' :
                 e.position <= 4 ? '⚪' : e.position >= entries.length - 2 ? '🔴' : `\`${e.position.toString().padStart(2, ' ')}\``;
    const form = e.form ? createFormBar(e.form) : '';
    const gd = e.goalDiff > 0 ? `+${e.goalDiff}` : `${e.goalDiff}`;
    const record = `${e.wins}W ${e.draws}D ${e.losses}L`;
    const gl = `${e.goalsFor}GF/${e.goalsAgainst}GA`;
    return `${badge} **${e.name}** — **${e.points}P**\n\`${e.played}GP | ${record} | ${gd} | ${gl}\`${form ? ' ' + form : ''}`;
  });

  embed.setDescription(`${`Season: ${season} · ${entries.length} teams`}\n\n${lines.join('\n')}`);

  embed.addFields({
    name: '📖 Legend',
    value: '⚪ = UCL · ⚪ = UEL · 🔴 = Relegation · ' + createFormBar('WWWDL') + ' = Form (W/D/L)',
    inline: false,
  });

  return embed;
}

export function createFantasyTeamEmbed(
  teamName: string,
  manager: string,
  totalPoints: number,
  gameweekPoints: number,
  rank: number,
  budget: number,
  formation: string,
  avatarURL?: string,
  captainName?: string,
  viceCaptainName?: string,
  squadSize?: number,
  teamValue?: number,
  gameweek?: number,
): EmbedBuilderExtended {
  const embed = baseEmbed()
    .setColor(Colors.PRIMARY)
    .setTitle(`${EMOJIS.TROPHY} ${teamName}`)
    .setDescription(`Managed by **${manager}** · GW${gameweek || '?'}`);

  embed.addFields(
    { name: `${EMOJIS.STAR} Total Points`, value: `**${totalPoints.toLocaleString()}**`, inline: true },
    { name: `${EMOJIS.FIRE} GW Points`, value: `**${gameweekPoints}**`, inline: true },
    { name: `${EMOJIS.CROWN} Global Rank`, value: `**#${rank.toLocaleString()}**`, inline: true },
    { name: `${EMOJIS.MONEY} Budget`, value: `**${formatPrice(budget)}**`, inline: true },
    { name: '📋 Formation', value: `**${formation}**`, inline: true },
    { name: '📊 Squad', value: `**${squadSize || '?'}/${FANTASY_LIMITS.SQUAD_SIZE}**`, inline: true },
  );

  if (teamValue !== undefined) embed.addFields({ name: '💰 Team Value', value: `**${formatPrice(teamValue)}**`, inline: true });
  if (captainName) embed.addFields({ name: `${EMOJIS.CAPTAIN} Captain`, value: `**${captainName}**`, inline: true });
  if (viceCaptainName) embed.addFields({ name: `${EMOJIS.VICE_CAPTAIN} Vice-Captain`, value: `**${viceCaptainName}**`, inline: true });

  if (avatarURL) embed.setThumbnail(avatarURL);
  return embed;
}

export function createPredictionEmbed(
  homeTeam: string,
  awayTeam: string,
  homeWin: number,
  draw: number,
  awayWin: number,
  predictedScore?: string,
  confidence?: number,
  reasoning?: string,
): EmbedBuilderExtended {
  const bar = (prob: number, emoji: string) => createProgressBar(prob * 100, 100, { size: 20, filled: emoji, showLabel: true });

  const embed = baseEmbed()
    .setColor(Colors.ACCENT)
    .setTitle(`${EMOJIS.AI} ${homeTeam} vs ${awayTeam}`);

  if (predictedScore) {
    embed.setDescription(`**Predicted Score: ${predictedScore}**`);
  } else {
    embed.setDescription('Match Outcome Prediction');
  }

  if (confidence !== undefined) {
    embed.setFooter(`Confidence: ${createConfidenceDots(confidence)} ${(confidence * 100).toFixed(0)}% · AI Powered`, FOOTER_ICON);
  }

  embed.addFields(
    { name: `🏠 ${homeTeam} Win`, value: bar(homeWin, '🟢'), inline: false },
    { name: '➖ Draw', value: bar(draw, '🟡'), inline: false },
    { name: `✈️ ${awayTeam} Win`, value: bar(awayWin, '🔴'), inline: false },
  );

  if (reasoning) {
    embed.addFields({ name: '📊 Analysis', value: truncate(reasoning, MAX_FIELD_VALUE), inline: false });
  }

  // Add probability distribution
  const distribution = createStatBar(homeWin * 100, awayWin * 100, { size: 20 });
  embed.addFields({ name: '📈 Probability Distribution', value: `🏠${'🟢'.repeat(Math.round(homeWin * 20))}${'🔴'.repeat(Math.round(awayWin * 20))}✈️\nH: ${(homeWin * 100).toFixed(1)}% · D: ${(draw * 100).toFixed(1)}% · A: ${(awayWin * 100).toFixed(1)}%`, inline: false });

  return embed;
}

export function createComparisonEmbed(
  title: string,
  leftLabel: string,
  leftStats: { label: string; value: string; won?: boolean; emoji?: string }[],
  rightLabel: string,
  rightStats: { label: string; value: string; won?: boolean; emoji?: string }[],
): EmbedBuilderExtended {
  if (!leftStats || leftStats.length === 0) leftStats = [{ label: 'No data', value: '—' }];
  if (!rightStats || rightStats.length === 0) rightStats = [{ label: 'No data', value: '—' }];

  const leftText = leftStats.map(s =>
    `${s.emoji || ''} ${s.won ? '**[ ' : ''}${s.label}: ${s.value}${s.won ? ' ✅ ]**' : ''}`,
  ).join('\n');

  const rightText = rightStats.map(s =>
    `${s.emoji || ''} ${s.won ? '**[ ' : ''}${s.label}: ${s.value}${s.won ? ' ✅ ]**' : ''}`,
  ).join('\n');

  const leftWins = leftStats.filter(s => s.won).length;
  const rightWins = rightStats.filter(s => s.won).length;
  const winnerLabel = leftWins > rightWins ? leftLabel : rightWins > leftWins ? rightLabel : 'Tie';

  const embed = baseEmbed()
    .setColor(Colors.ACCENT)
    .setTitle(`⚔️ ${title}`)
    .addFields(
      { name: `🏠 ${leftLabel}`, value: leftText || 'No data', inline: true },
      { name: `✈️ ${rightLabel}`, value: rightText || 'No data', inline: true },
    )
    .addFields({ name: '🏆 Advantage', value: `**${winnerLabel}**`, inline: false });

  // Add comparison bar
  const total = leftWins + rightWins || 1;
  const bar = createProgressBar(leftWins / total * 100, 100, { size: 20, filled: '🟢', empty: '🔴', showLabel: true });
  embed.addFields({ name: '📊 Comparison Score', value: `${leftLabel}: ${bar}  ${rightLabel}`, inline: false });

  return embed;
}

export function createLeaderboardEmbed(
  title: string,
  description: string,
  entries: LeaderboardEntry[],
): EmbedBuilderExtended {
  const lines = entries.slice(0, 25).map(e => {
    const medal = e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : `\`#${e.rank.toString().padStart(3, ' ')}\``;
    const prefix = e.highlight ? '**[ ' : '';
    const suffix = e.highlight ? ' ]** ⬅️ **YOU**' : '';
    const emoji = e.emoji || '';
    const extra = e.extra ? ` *(${e.extra})*` : '';
    return `${medal} ${emoji}${prefix}${e.name}${suffix} — **${e.value}**${extra}`;
  });

  return baseEmbed()
    .setColor(Colors.GOLD)
    .setTitle(`${EMOJIS.TROPHY} ${title}`)
    .setDescription(`${description || ''}\n\n${lines.join('\n')}`)
    .addFields({ name: '📊 Total Participants', value: `${entries.length}`, inline: true });
}

export function createNewsEmbed(
  title: string,
  articles: { title: string; url: string; source: string; date: string; description?: string; image?: string }[],
  maxArticles: number = 10,
): EmbedBuilderExtended {
  const embed = baseEmbed()
    .setColor(Colors.PRIMARY)
    .setTitle(`${EMOJIS.NEWS} ${title}`);

  if (!articles || articles.length === 0) {
    embed.setDescription('No articles available.');
    return embed;
  }

  const lines = articles.slice(0, maxArticles).map((a, i) => {
    const desc = a.description ? `\n${truncate(a.description, 120)}` : '';
    return `**${i + 1}.** [${a.title}](${a.url})\n📰 ${a.source} · 🕐 ${a.date}${desc}`;
  });

  embed.setDescription(`${articles.length} articles\n\n${lines.join('\n\n')}`);

  if (articles[0]?.image) embed.setThumbnail(articles[0].image);
  return embed;
}

export function createFixtureDifficultyEmbed(
  team: string,
  fixtures: { opponent: string; difficulty: number; date: string; competition?: string; venue?: 'H' | 'A' }[],
): EmbedBuilderExtended {
  if (!fixtures || fixtures.length === 0) {
    return baseEmbed()
      .setColor(Colors.INFO)
      .setTitle(`${EMOJIS.CALENDAR} ${team}`)
      .setDescription('No upcoming fixtures.');
  }

  const lines = fixtures.slice(0, 15).map(f => {
    const dots = createDifficultyDots(f.difficulty);
    const venue = f.venue === 'H' ? '🏠' : f.venue === 'A' ? '✈️' : '⚪';
    const comp = f.competition ? ` *(${f.competition})*` : '';
    return `${venue} ${dots} **${f.opponent}**${comp}\n╰ ${f.date}`;
  });

  const avgDifficulty = fixtures.reduce((s, f) => s + f.difficulty, 0) / fixtures.length;
  const difficultyLabel = avgDifficulty <= 2.5 ? '🟢 Favorable' : avgDifficulty <= 3.5 ? '🟡 Mixed' : '🔴 Difficult';

  return baseEmbed()
    .setColor(Colors.INFO)
    .setTitle(`${EMOJIS.CALENDAR} ${team} — Next ${Math.min(fixtures.length, 15)} Fixtures`)
    .setDescription(lines.join('\n'))
    .addFields(
      { name: '📊 Average Difficulty', value: `${difficultyLabel} (${avgDifficulty.toFixed(1)}/5)`, inline: true },
      { name: '📖 Key', value: '🟢🟢🟢🟢🟢 Easy → 🔴🔴🔴🔴🔴 Tough', inline: true },
    );
}

export function createTransferEmbed(
  player: string,
  from: string,
  to: string,
  fee?: number,
  status?: 'done' | 'rumour' | 'negotiating',
  position?: string,
  date?: string,
): EmbedBuilderExtended {
  const statusConfig = {
    done: { emoji: '✅', text: 'Confirmed Deal', color: Colors.SUCCESS },
    rumour: { emoji: '❓', text: 'Rumour', color: Colors.WARNING },
    negotiating: { emoji: '📝', text: 'Negotiating', color: Colors.INFO },
  };

  const cfg = status ? statusConfig[status] : statusConfig.rumour;
  const feeText = fee ? formatPrice(fee) : 'Fee TBD';
  const posText = position ? ` · ${position}` : '';
  const dateText = date ? ` · ${date}` : '';

  return baseEmbed()
    .setColor(cfg.color)
    .setTitle(`${EMOJIS.TRANSFER} ${cfg.emoji} ${player}`)
    .setDescription(`${from} → **${to}**${posText}${dateText}`)
    .addFields(
      { name: '💰 Fee', value: feeText, inline: true },
      { name: '📊 Status', value: cfg.text, inline: true },
      { name: '📅 Date', value: date || 'Recent', inline: true },
    );
}

export function createBattleEmbed(
  challenger: string,
  opponent: string,
  challengerScore: number,
  opponentScore: number,
  gameweek: number,
  status: 'scheduled' | 'live' | 'completed',
): EmbedBuilderExtended {
  const statusConfig = {
    scheduled: { emoji: '⏳', text: 'Scheduled', color: Colors.INFO },
    live: { emoji: '🔴', text: 'Live Now', color: Colors.ERROR },
    completed: { emoji: '✅', text: 'Completed', color: Colors.SUCCESS },
  };

  const cfg = statusConfig[status];
  const isLive = status === 'live';
  const isDone = status === 'completed';
  const isDraw = challengerScore === opponentScore;

  const embed = baseEmbed()
    .setColor(cfg.color)
    .setTitle(`${EMOJIS.CROWN} Battle — GW${gameweek}`)
    .setDescription(`${cfg.emoji} ${cfg.text}`);

  if (isDone && !isDraw) {
    const winner = challengerScore > opponentScore ? challenger : opponent;
    embed.addFields(
      { name: `🏠 ${challenger}`, value: `**${challengerScore}** pts`, inline: true },
      { name: 'vs', value: '—', inline: true },
      { name: `✈️ ${opponent}`, value: `**${opponentScore}** pts`, inline: true },
      { name: `🏆 Winner`, value: `**${winner}** 🎉`, inline: false },
    );
  } else if (isDone && isDraw) {
    embed.addFields(
      { name: `🏠 ${challenger}`, value: `**${challengerScore}** pts`, inline: true },
      { name: 'vs', value: '—', inline: true },
      { name: `✈️ ${opponent}`, value: `**${opponentScore}** pts`, inline: true },
      { name: '➖ Result', value: '**Match Drawn**', inline: false },
    );
  } else if (isLive) {
    const leading = challengerScore > opponentScore ? challenger : opponent;
    embed.addFields(
      { name: `🏠 ${challenger}`, value: `**${challengerScore}** pts`, inline: true },
      { name: '🔴 LIVE', value: `${leading} leading`, inline: true },
      { name: `✈️ ${opponent}`, value: `**${opponentScore}** pts`, inline: true },
    );
  } else {
    embed.addFields(
      { name: `🏠 ${challenger}`, value: `**${challengerScore}** pts`, inline: true },
      { name: 'vs', value: '⏳', inline: true },
      { name: `✈️ ${opponent}`, value: `**${opponentScore}** pts`, inline: true },
    );
  }

  return embed;
}

export function createChipEmbed(
  chipName: string,
  status: 'available' | 'used' | 'active',
  description: string,
  gameweek?: number,
): EmbedBuilderExtended {
  const statusConfig = {
    available: { emoji: '✅', text: 'Available', color: Colors.SUCCESS },
    used: { emoji: '❌', text: 'Used', color: Colors.TEXT_MUTED },
    active: { emoji: '🔥', text: 'Active', color: Colors.WARNING },
  };

  const cfg = statusConfig[status];
  const gwText = gameweek ? ` (GW${gameweek})` : '';

  return baseEmbed()
    .setColor(cfg.color)
    .setTitle(`${cfg.emoji} ${chipName}${gwText}`)
    .setDescription(description)
    .addFields({ name: '📊 Status', value: cfg.text, inline: true })
    .addFields({ name: '💡 Tip', value: getChipTip(chipName), inline: false });
}

function getChipTip(chipName: string): string {
  const tips: Record<string, string> = {
    'Wildcard': 'Best used during double gameweeks or when fixing multiple team issues.',
    'Free Hit': 'Save for blank gameweeks or when many players have tough fixtures.',
    'Bench Boost': 'Use when all 15 players have good fixtures, ideally in a DGW.',
    'Triple Captain': 'Use on a premium player with a double gameweek and easy fixtures.',
    'Wildcard (2nd)': 'Second wildcard activates after Gameweek 20. Use strategically.',
  };
  return tips[chipName] || 'Use this chip strategically for maximum points gain.';
}

export function createSeasonReviewEmbed(
  season: string,
  champion: string,
  topScorer: string,
  mostAssists: string,
  bestDefense: string,
  stats: { label: string; value: string }[],
): EmbedBuilderExtended {
  const embed = baseEmbed()
    .setColor(Colors.GOLD)
    .setTitle(`${EMOJIS.TROPHY} ${season} Season Review`);

  embed.setDescription(`**Champion: ${champion}** 🏆`);

  embed.addFields(
    { name: '⚽ Top Scorer', value: topScorer || 'N/A', inline: true },
    { name: '🎯 Most Assists', value: mostAssists || 'N/A', inline: true },
    { name: '🛡️ Best Defense', value: bestDefense || 'N/A', inline: true },
  );

  for (const s of (stats || [])) {
    embed.addFields({ name: s.label, value: s.value, inline: true });
  }

  return embed;
}

export function createInjuryEmbed(
  player: string,
  team: string,
  injury: string,
  status: 'out' | 'doubtful' | 'unknown',
  returnDate?: string,
  position?: string,
): EmbedBuilderExtended {
  const statusConfig = {
    out: { emoji: '❌', text: 'Out', color: Colors.ERROR },
    doubtful: { emoji: '⚠️', text: 'Doubtful', color: Colors.WARNING },
    unknown: { emoji: '❓', text: 'Unknown', color: Colors.INFO },
  };

  const cfg = statusConfig[status] || statusConfig.unknown;

  return baseEmbed()
    .setColor(cfg.color)
    .setTitle(`${cfg.emoji} ${player}`)
    .setDescription(`${team}${position ? ` · ${position}` : ''}`)
    .addFields(
      { name: '🩹 Injury', value: injury || 'Unknown', inline: true },
      { name: '📊 Status', value: cfg.text, inline: true },
      { name: '📅 Expected Return', value: returnDate || 'Unknown', inline: true },
    );
}

export function createPointsBreakdownEmbed(
  playerName: string,
  breakdown: FantasyBreakdown,
  isCaptain: boolean = false,
  isViceCaptain: boolean = false,
): EmbedBuilderExtended {
  const items: { label: string; value: string; show: boolean }[] = [
    { label: 'Appearance', value: `+${breakdown.appearance}P`, show: breakdown.appearance > 0 },
    { label: 'Goals', value: `+${breakdown.goals}P`, show: breakdown.goals > 0 },
    { label: 'Assists', value: `+${breakdown.assists}P`, show: breakdown.assists > 0 },
    { label: 'Clean Sheet', value: `+${breakdown.cleanSheet}P`, show: breakdown.cleanSheet > 0 },
    { label: 'Saves', value: `+${breakdown.saves}P`, show: breakdown.saves > 0 },
    { label: 'Penalty Save', value: `+${breakdown.penaltySave}P`, show: breakdown.penaltySave > 0 },
    { label: 'Bonus', value: `+${breakdown.bonus}P`, show: breakdown.bonus > 0 },
    { label: 'Penalty Miss', value: `${breakdown.penaltyMiss}P`, show: breakdown.penaltyMiss < 0 },
    { label: 'Yellow Card', value: `${breakdown.yellowCards}P`, show: breakdown.yellowCards < 0 },
    { label: 'Red Card', value: `${breakdown.redCards}P`, show: breakdown.redCards < 0 },
    { label: 'Own Goal', value: `${breakdown.ownGoals}P`, show: breakdown.ownGoals < 0 },
    { label: 'Goals Conceded', value: `${breakdown.goalsConceded}P`, show: breakdown.goalsConceded < 0 },
  ];

  const lines = items.filter(i => i.show).map(i => `• **${i.label}:** ${i.value.startsWith('-') ? i.value : `**${i.value}**`}`);
  const captainLine = breakdown.captainMultiplier > 1 ? `\n• **Captain Multiplier:** x${breakdown.captainMultiplier}` : '';
  const role = isCaptain ? ' 👑 Captain' : isViceCaptain ? ' 💎 Vice-Captain' : '';
  const totalLine = `\n**Total: ${breakdown.total}P${role ? role : ''}**`;

  const embed = baseEmbed()
    .setColor(getPointsColor(breakdown.total))
    .setTitle(`📊 ${playerName}`)
    .setDescription(lines.join('\n') + captainLine + totalLine);

  if (breakdown.captainMultiplier > 1) {
    embed.addFields({ name: '🧮 Calculation', value: `Base: **${breakdown.total / breakdown.captainMultiplier}** × ${breakdown.captainMultiplier} = **${breakdown.total}**`, inline: false });
  }

  // Add mini progress bar
  const maxPossible = 60;
  embed.addFields({ name: '📈 Performance', value: createProgressBar(breakdown.total, maxPossible, { size: 15, filled: '🟢', empty: '⚪', showLabel: true }), inline: false });

  return embed;
}

export function createSystemStatusEmbed(stats: SystemStats): EmbedBuilderExtended {
  const apiEmoji = stats.apiStatus === 'healthy' ? '✅' : stats.apiStatus === 'degraded' ? '⚠️' : '❌';
  const dbEmoji = stats.databaseStatus === 'connected' ? '✅' : stats.databaseStatus === 'error' ? '❌' : '⚠️';
  const redisEmoji = stats.redisStatus === 'connected' ? '✅' : '⚠️';

  return baseEmbed()
    .setTitle(`${EMOJIS.INFO} System Status`)
    .setColor(stats.apiStatus === 'healthy' ? Colors.SUCCESS : Colors.WARNING)
    .addFields(
      { name: '⏱ Uptime', value: formatMinutes(stats.uptime), inline: true },
      { name: '🏠 Guilds', value: stats.guilds.toLocaleString(), inline: true },
      { name: '👥 Users', value: stats.users.toLocaleString(), inline: true },
      { name: '⚡ Commands', value: `${stats.commandsRun.toLocaleString()} (${stats.commandsThisSession} this session)`, inline: false },
      { name: '💾 Memory', value: [
        `Heap: ${(stats.memory.heapUsed / 1024 / 1024).toFixed(1)}MB / ${(stats.memory.heapTotal / 1024 / 1024).toFixed(1)}MB`,
        `RSS: ${(stats.memory.rss / 1024 / 1024).toFixed(1)}MB`,
        `External: ${(stats.memory.external / 1024 / 1024).toFixed(1)}MB`,
      ].join('\n'), inline: true },
      { name: '📶 Ping', value: `${stats.ping}ms`, inline: true },
      { name: `🌐 API ${apiEmoji}`, value: stats.apiStatus.charAt(0).toUpperCase() + stats.apiStatus.slice(1), inline: true },
      { name: `🗄️ Database ${dbEmoji}`, value: stats.databaseStatus.charAt(0).toUpperCase() + stats.databaseStatus.slice(1), inline: true },
      { name: `📦 Redis ${redisEmoji}`, value: stats.redisStatus.charAt(0).toUpperCase() + stats.redisStatus.slice(1), inline: true },
      { name: '🔗 Shard', value: `#${stats.shardId}/${stats.totalShards}`, inline: true },
      { name: '📞 API Calls Today', value: stats.apiCallsToday.toLocaleString(), inline: true },
      { name: '⚙️ Active Jobs', value: stats.activeJobs.length > 0 ? stats.activeJobs.map(j => `• ${j}`).join('\n') : 'None', inline: false },
      { name: '🔄 Last Restart', value: formatDate(stats.lastRestart, 'relative'), inline: true },
    );
}

export function createWelcomeEmbed(
  guildName: string,
  ownerTag: string,
  memberCount: number,
  features: string[] = ['Fantasy Football', 'Live Scores', 'AI Assistant', 'Football News'],
): EmbedBuilderExtended {
  const featureList = features.map(f => `• ${EMOJIS.GOAL} ${f}`).join('\n');

  return baseEmbed()
    .setColor(Colors.PRIMARY)
    .setTitle(`⚽ Thanks for adding ${BOT_NAME}!`)
    .setDescription(
      `Hey **${guildName}**! I'm your ultimate fantasy football companion.\n\n` +
      `**Quick Start Guide:**\n` +
      `1️⃣ Use \`/setup\` to configure channels and roles\n` +
      `2️⃣ Use \`/create\` to start your first fantasy team\n` +
      `3️⃣ Use \`/help\` to explore all commands\n\n` +
      `**Key Features:**\n${featureList}\n\n` +
      `Need help? Join our [Support Server](https://discord.gg/goalx) or visit [goalx.gg](https://goalx.gg)`,
    )
    .addFields(
      { name: '👑 Server Owner', value: ownerTag, inline: true },
      { name: '👥 Members', value: memberCount.toLocaleString(), inline: true },
      { name: '📊 Commands', value: '80+ slash commands', inline: true },
    )
    .setFooter(`${BOT_NAME} v${BOT_VERSION} · Let's play! ⚽`, FOOTER_ICON);
}

export function createMilestoneEmbed(
  type: 'goals' | 'appearances' | 'assists' | 'cleanSheets' | 'wins' | 'hattricks' | 'penalties' | 'saves',
  player: string,
  team: string,
  milestone: number,
  description: string,
  club?: string,
): EmbedBuilderExtended {
  const emojis: Record<string, string> = {
    goals: '⚽', appearances: '📋', assists: '🎯',
    cleanSheets: '🧤', wins: '🏆', hattricks: '🎩',
    penalties: '⬜', saves: '🧤',
  };

  const titles: Record<string, string> = {
    goals: 'Goals Milestone', appearances: 'Appearance Milestone',
    assists: 'Assists Milestone', cleanSheets: 'Clean Sheet Milestone',
    wins: 'Wins Milestone', hattricks: 'Hat-trick!',
    penalties: 'Penalty Milestone', saves: 'Saves Milestone',
  };

  return baseEmbed()
    .setColor(Colors.GOLD)
    .setTitle(`${emojis[type] || '🏅'} ${titles[type] || 'Milestone'}`)
    .setDescription(`**${player}**${club ? ` (${club})` : ''} · ${team}`)
    .addFields(
      { name: '📊 Milestone', value: `${milestone} ${type}`, inline: true },
      { name: '📖 Details', value: description.slice(0, MAX_FIELD_VALUE), inline: false },
    )
    .setFooter(`${BOT_NAME} v${BOT_VERSION} · Milestone Tracker`, FOOTER_ICON);
}

export function createTransferWindowEmbed(
  windowName: string,
  summary: string,
  biggestDeal?: string,
  biggestSpenders?: string,
  totalSpent?: number,
  keyDeals?: { player: string; from: string; to: string; fee: number }[],
): EmbedBuilderExtended {
  const embed = baseEmbed()
    .setColor(Colors.PRIMARY)
    .setTitle(`${EMOJIS.TRANSFER} ${windowName} Transfer Window`)
    .setDescription(summary.slice(0, MAX_DESC_LENGTH));

  if (biggestDeal) embed.addFields({ name: '💰 Biggest Deal', value: biggestDeal, inline: true });
  if (biggestSpenders) embed.addFields({ name: '💸 Biggest Spenders', value: biggestSpenders, inline: true });
  if (totalSpent) embed.addFields({ name: '📊 Total Spent', value: formatPrice(totalSpent), inline: true });

  if (keyDeals && keyDeals.length > 0) {
    const deals = keyDeals.slice(0, 10).map((d, i) =>
      `**${i + 1}.** ${d.player} — ${d.from} → ${d.to} | ${formatPrice(d.fee)}`,
    );
    embed.addFields({ name: '📋 Key Deals', value: deals.join('\n'), inline: false });
  }

  return embed;
}

export function createFormGuideEmbed(
  team: string,
  results: { opponent: string; score: string; result: 'W' | 'D' | 'L'; date: string; competition: string }[],
): EmbedBuilderExtended {
  const form = results.map(r => r.result).join('');
  const formBar = createFormBar(form, results.length);

  const embed = baseEmbed()
    .setColor(getFormColor(form))
    .setTitle(`📊 ${team} — Form Guide`)
    .setDescription(`Last ${results.length} matches\n${formBar}`);

  const lines = results.slice(-10).reverse().map(r => {
    const emoji = r.result === 'W' ? '✅' : r.result === 'D' ? '➖' : '❌';
    return `${emoji} **${r.opponent}** ${r.score} — ${r.competition} (${r.date})`;
  });

  embed.addFields({ name: '📋 Results', value: lines.join('\n'), inline: false });

  const wins = results.filter(r => r.result === 'W').length;
  const draws = results.filter(r => r.result === 'D').length;
  const losses = results.filter(r => r.result === 'L').length;

  embed.addFields(
    { name: '✅ Wins', value: `${wins}`, inline: true },
    { name: '➖ Draws', value: `${draws}`, inline: true },
    { name: '❌ Losses', value: `${losses}`, inline: true },
  );

  return embed;
}

export function createHeadToHeadEmbed(
  team1: string,
  team2: string,
  meetings: { date: string; home: string; away: string; homeScore: number; awayScore: number; competition: string }[],
): EmbedBuilderExtended {
  const team1Wins = meetings.filter(m =>
    (m.home === team1 && m.homeScore > m.awayScore) ||
    (m.away === team1 && m.awayScore > m.homeScore),
  ).length;
  const team2Wins = meetings.filter(m =>
    (m.home === team2 && m.homeScore > m.awayScore) ||
    (m.away === team2 && m.awayScore > m.homeScore),
  ).length;
  const draws = meetings.length - team1Wins - team2Wins;

  const embed = baseEmbed()
    .setColor(Colors.ACCENT)
    .setTitle(`⚔️ Head-to-Head: ${team1} vs ${team2}`)
    .setDescription(`${meetings.length} meetings`);

  embed.addFields(
    { name: `🏠 ${team1} Wins`, value: `${team1Wins}`, inline: true },
    { name: '➖ Draws', value: `${draws}`, inline: true },
    { name: `✈️ ${team2} Wins`, value: `${team2Wins}`, inline: true },
  );

  const lastMeetings = meetings.slice(-10).reverse().map(m =>
    `${m.date}: ${m.home} **${m.homeScore}—${m.awayScore}** ${m.away} (${m.competition})`,
  );

  embed.addFields({ name: '📋 Last Meetings', value: lastMeetings.join('\n'), inline: false });

  return embed;
}

export function createLeagueSelectorEmbed(
  title: string,
  leagues: { id: number; name: string; country: string; logo?: string }[],
): EmbedBuilderExtended {
  const embed = baseEmbed()
    .setColor(Colors.PRIMARY)
    .setTitle(`${EMOJIS.TROPHY} ${title}`)
    .setDescription('Select a league from the menu below.');

  const lines = leagues.slice(0, 25).map(l =>
    `${l.logo || '⚽'} **${l.name}** — ${l.country}`,
  );

  embed.setDescription(lines.join('\n'));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('league_selector')
    .setPlaceholder('Select a league...')
    .addOptions(
      leagues.slice(0, 25).map(l => new StringSelectMenuOptionBuilder()
        .setLabel(l.name)
        .setValue(l.id.toString())
        .setDescription(l.country)
        .setEmoji(l.logo || '⚽'),
      ),
    );

  return embed;
}

export function createPlayerComparisonRadar(
  player1: { name: string; stats: Record<string, number> },
  player2: { name: string; stats: Record<string, number> },
): EmbedBuilderExtended {
  const categories = Object.keys(player1.stats);
  const embed = baseEmbed()
    .setColor(Colors.ACCENT)
    .setTitle(`📊 Radar: ${player1.name} vs ${player2.name}`);

  for (const cat of categories) {
    const v1 = player1.stats[cat] || 0;
    const v2 = player2.stats[cat] || 0;
    const bar = createStatBar(v1, v2, { size: 15 });
    const winner = v1 > v2 ? '🟢' : v2 > v1 ? '🔴' : '🟡';
    embed.addFields({
      name: cat,
      value: `${winner} \`${v1.toString().padStart(3)}\` ${bar} \`${v2.toString().padStart(3)}\``,
      inline: false,
    });
  }

  return embed;
}

export async function withConfirmation(
  interaction: ChatInputCommandInteraction | MessageComponentInteraction,
  config: ConfirmConfig,
  onConfirm: () => Promise<void>,
  onCancel?: () => Promise<void>,
): Promise<void> {
  const {
    title, description,
    confirmLabel = 'Confirm', cancelLabel = 'Cancel',
    confirmStyle = ButtonStyle.Danger, cancelStyle = ButtonStyle.Secondary,
    timeout = 30_000, ephemeral = true,
  } = config;

  const embed = createWarningEmbed(title, description);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_yes')
        .setLabel(confirmLabel)
        .setStyle(confirmStyle)
        .setEmoji('✅'),
      new ButtonBuilder()
        .setCustomId('confirm_no')
        .setLabel(cancelLabel)
        .setStyle(cancelStyle)
        .setEmoji('❌'),
    );

  const response = await interaction.reply({ embeds: [embed], components: [row], ephemeral, fetchReply: true });

  let confirmed = false;

  try {
    const collector = response.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      time: timeout,
      max: 1,
    });

    collector.on('collect', async (i) => {
      if (i.customId === 'confirm_yes') {
        confirmed = true;
        await i.deferUpdate();
        await onConfirm();
      } else {
        await i.update({ embeds: [createInfoEmbed('Cancelled', 'Action cancelled.')], components: [] });
        if (onCancel) await onCancel();
      }
    });

    collector.on('end', () => {
      if (!confirmed) {
        interaction.editReply({ embeds: [createInfoEmbed('Timed Out', 'Confirmation timed out.')], components: [] }).catch(() => {});
      }
    });
  } catch (error) {
    logger.error('[Embeds] Confirmation error', error);
    if (!confirmed) {
      await interaction.editReply({ embeds: [createErrorEmbed('Error', 'Confirmation failed.')], components: [] }).catch(() => {});
    }
  }
}

export class PaginationManager {
  private pages: EmbedPage[];
  private currentPage: number = 0;
  private interaction: ChatInputCommandInteraction;
  private config: PaginationConfig;
  private userId: string;
  private message: Message | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private isActive: boolean = true;
  private collector: any = null;

  constructor(
    interaction: ChatInputCommandInteraction,
    pages: EmbedPage[],
    userId: string,
    config: PaginationConfig = {},
  ) {
    this.interaction = interaction;
    this.pages = pages;
    this.userId = userId;
    this.config = {
      timeout: 120_000,
      ephemeral: false,
      buttons: {
        first: { emoji: '⏮️', style: 'secondary' },
        prev: { emoji: '◀️', style: 'primary' },
        next: { emoji: '▶️', style: 'primary' },
        last: { emoji: '⏭️', style: 'secondary' },
        stop: { emoji: '⏹️', style: 'danger' },
      },
      ...config,
    };
  }

  async start(): Promise<void> {
    if (this.pages.length === 0) {
      await this.interaction.editReply({ embeds: [createErrorEmbed('No Content', 'No pages to display.')] });
      return;
    }

    this.currentPage = 0;
    const embed = this.wrapPage(this.pages[0]);
    const components = this.buildComponents();
    this.message = await this.interaction.editReply({ embeds: [embed], components });
    this.setupCollector();
  }

  private wrapPage(page: EmbedPage): EmbedBuilderExtended {
    const embed = page instanceof EmbedBuilderExtended ? page : EmbedBuilderExtended.from(page.toJSON());
    if (this.pages.length > 1) {
      embed.setFooter({
        text: `Page ${this.currentPage + 1}/${this.pages.length} · ${FOOTER_TEXT}`,
        iconURL: FOOTER_ICON,
      });
    }
    return embed;
  }

  private buildComponents(): ActionRowBuilder<ButtonBuilder>[] {
    if (this.pages.length <= 1) return [];

    const btn = this.config.buttons!;
    const firstStyle = btn.first?.style === 'primary' ? ButtonStyle.Primary : ButtonStyle.Secondary;
    const prevStyle = btn.prev?.style === 'success' ? ButtonStyle.Success : ButtonStyle.Primary;
    const nextStyle = btn.next?.style === 'success' ? ButtonStyle.Success : ButtonStyle.Primary;
    const lastStyle = btn.last?.style === 'primary' ? ButtonStyle.Primary : ButtonStyle.Secondary;
    const stopStyle = btn.stop?.style === 'danger' ? ButtonStyle.Danger : ButtonStyle.Secondary;

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('pg_first')
        .setEmoji(btn.first?.emoji || '⏮️')
        .setStyle(firstStyle)
        .setDisabled(this.currentPage === 0),
      new ButtonBuilder()
        .setCustomId('pg_prev')
        .setEmoji(btn.prev?.emoji || '◀️')
        .setStyle(prevStyle)
        .setDisabled(this.currentPage === 0),
      new ButtonBuilder()
        .setCustomId('pg_info')
        .setLabel(`${this.currentPage + 1}/${this.pages.length}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('pg_next')
        .setEmoji(btn.next?.emoji || '▶️')
        .setStyle(nextStyle)
        .setDisabled(this.currentPage >= this.pages.length - 1),
      new ButtonBuilder()
        .setCustomId('pg_last')
        .setEmoji(btn.last?.emoji || '⏭️')
        .setStyle(lastStyle)
        .setDisabled(this.currentPage >= this.pages.length - 1),
      new ButtonBuilder()
        .setCustomId('pg_stop')
        .setEmoji(btn.stop?.emoji || '⏹️')
        .setStyle(stopStyle),
    );

    return [row];
  }

  private setupCollector(): void {
    if (!this.message) return;

    this.collector = this.message.createMessageComponentCollector({
      filter: i => i.user.id === this.userId,
      time: this.config.timeout,
    });

    this.collector.on('collect', async (i) => {
      if (!this.isActive) return;

      await this.handleInteraction(i);
    });

    this.collector.on('end', () => {
      this.disableAllButtons();
    });
  }

  private async handleInteraction(componentInteraction: MessageComponentInteraction): Promise<void> {
    const customId = componentInteraction.customId;
    if (!customId.startsWith('pg_')) return;

    switch (customId) {
      case 'pg_first': this.currentPage = 0; break;
      case 'pg_prev': this.currentPage = Math.max(0, this.currentPage - 1); break;
      case 'pg_next': this.currentPage = Math.min(this.pages.length - 1, this.currentPage + 1); break;
      case 'pg_last': this.currentPage = this.pages.length - 1; break;
      case 'pg_stop': {
        this.isActive = false;
        this.collector?.stop();
        await componentInteraction.update({ components: [] });
        if (this.config.onEnd) this.config.onEnd();
        return;
      }
      default: return;
    }

    const embed = this.wrapPage(this.pages[this.currentPage]);
    await componentInteraction.update({ embeds: [embed], components: this.buildComponents() });
  }

  private async disableAllButtons(): Promise<void> {
    if (!this.isActive) return;
    this.isActive = false;

    const disabledRow = new ActionRowBuilder<ButtonBuilder>();
    const row = this.buildComponents()[0];
    if (row) {
      for (const component of row.components) {
        if (component instanceof ButtonBuilder) {
          component.setDisabled(true);
        }
      }
      disabledRow.addComponents(row.components as any);
    }

    try {
      if (this.message) {
        await this.message.edit({ components: disabledRow.components.length > 0 ? [disabledRow] : [] });
      }
      if (this.config.onEnd) this.config.onEnd();
    } catch {
      // Message may have been deleted
    }
  }

  async updatePages(newPages: EmbedPage[]): Promise<void> {
    this.pages = newPages;
    this.currentPage = 0;
    if (this.isActive && this.message) {
      const embed = this.wrapPage(this.pages[0]);
      await this.message.edit({ embeds: [embed], components: this.buildComponents() });
    }
  }

  destroy(): void {
    this.isActive = false;
    this.collector?.stop();
    if (this.timeoutId) clearTimeout(this.timeoutId);
  }
}

export async function replyOrUpdate(
  interaction: ChatInputCommandInteraction | MessageComponentInteraction,
  options: string | MessagePayload | InteractionReplyOptions,
): Promise<InteractionResponse | Message> {
  try {
    if (interaction instanceof MessageComponentInteraction) {
      if (interaction.deferred || interaction.replied) {
        return await interaction.editReply(options);
      }
      return await interaction.update(options);
    }
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(options);
    }
    return await interaction.reply(options);
  } catch (error) {
    logger.error('[Embeds] replyOrUpdate error', error);
    throw error;
  }
}

export function buildActionRow(components: (ButtonBuilder | StringSelectMenuBuilder)[]): ActionRowBuilder<any> {
  const row = new ActionRowBuilder<any>();
  for (const component of components) {
    row.addComponents(component);
  }
  return row;
}

export function createDisabledActionRow(buttons: { label?: string; emoji?: string }[]): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();
  for (const btn of buttons) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId('disabled')
        .setLabel(btn.label || '\u200B')
        .setEmoji(btn.emoji || '⚪')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
    );
  }
  return row;
}

export {
  truncate,
  sanitize,
  escapeMarkdown,
  formatNumber,
  formatPrice,
  formatOrdinal,
  formatMinutes,
  formatPercentage,
  formatDate,
  createProgressBar,
  createStatBar,
  createFormBar,
  createRatingStars,
  createDifficultyDots,
  createConfidenceDots,
  createHealthBar,
  createTimestamp,
  formatDate as createTimestampFull,
  getLeagueColor,
  getPositionColor,
  getRatingColor,
  getPointsColor,
  getPriceColor,
  getFormColor,
  getStatusColor,
  type PaginationConfig,
  type ConfirmConfig,
  type BuildEmbedOptions,
  type LeaderboardEntry,
  type StandingsEntry,
  type MatchEvent,
  type FantasyBreakdown,
  type PlayerStats,
  type SystemStats,
};
