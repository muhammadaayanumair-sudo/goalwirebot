import { Schema, model, Document } from 'mongoose';

export interface IServer extends Document {
  guildId: string;
  name: string;
  prefix: string;
  language: string;
  defaultLeagueId: number;
  channels: {
    live: string;
    matches: string;
    fantasy: string;
    news: string;
    logs: string;
    welcome: string;
    announcements: string;
  };
  roles: {
    admin: string;
    partner: string;
    premium: string;
    verified: string;
  };
  notifications: {
    liveAlerts: boolean;
    fantasyReminders: boolean;
    newsUpdates: boolean;
    transferAlerts: boolean;
    matchResults: boolean;
  };
  autopost: {
    live: { channelId: string; interval: number };
    news: { channelId: string; interval: number };
    leaderboard: { channelId: string; interval: number };
    matchday: { channelId: string; interval: number };
    transfers: { channelId: string; interval: number };
  };
  disabledCommands: string[];
  disabledCategories: string[];
  disabledFeatures: string[];
  fantasySettings: {
    budget: number;
    transfersPerGW: number;
    squadSize: number;
    maxPerClub: number;
    pointsPerGoal: number;
    pointsPerAssist: number;
    pointsPerCleanSheet: number;
  };
  isPremium: boolean;
  premiumSince: Date;
  partner: boolean;
  partnerSince: Date;
  createdAt: Date;
  updatedAt: Date;
}

const serverSchema = new Schema<IServer>({
  guildId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  prefix: { type: String, default: '/' },
  language: { type: String, default: 'en' },
  defaultLeagueId: { type: Number, default: 39 },
  channels: {
    live: { type: String },
    matches: { type: String },
    fantasy: { type: String },
    news: { type: String },
    logs: { type: String },
    welcome: { type: String },
    announcements: { type: String },
  },
  roles: {
    admin: { type: String },
    partner: { type: String },
    premium: { type: String },
    verified: { type: String },
  },
  notifications: {
    liveAlerts: { type: Boolean, default: true },
    fantasyReminders: { type: Boolean, default: true },
    newsUpdates: { type: Boolean, default: false },
    transferAlerts: { type: Boolean, default: false },
    matchResults: { type: Boolean, default: true },
  },
  autopost: {
    live: { channelId: { type: String }, interval: { type: Number, default: 5 } },
    news: { channelId: { type: String }, interval: { type: Number, default: 60 } },
    leaderboard: { channelId: { type: String }, interval: { type: Number, default: 120 } },
    matchday: { channelId: { type: String }, interval: { type: Number, default: 10 } },
    transfers: { channelId: { type: String }, interval: { type: Number, default: 240 } },
  },
  disabledCommands: [{ type: String }],
  disabledCategories: [{ type: String }],
  disabledFeatures: [{ type: String }],
  fantasySettings: {
    budget: { type: Number, default: 100_000_000 },
    transfersPerGW: { type: Number, default: 2 },
    squadSize: { type: Number, default: 15 },
    maxPerClub: { type: Number, default: 3 },
    pointsPerGoal: { type: Number, default: 6 },
    pointsPerAssist: { type: Number, default: 4 },
    pointsPerCleanSheet: { type: Number, default: 4 },
  },
  isPremium: { type: Boolean, default: false },
  premiumSince: { type: Date },
  partner: { type: Boolean, default: false },
  partnerSince: { type: Date },
}, { timestamps: true });

export const Server = model<IServer>('Server', serverSchema);
