import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  userId: string;
  username: string;
  discriminator: string;
  avatar: string;
  premium: boolean;
  premiumSince: Date;
  partner: boolean;
  partnerTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  partnerSince: Date;
  badges: string[];
  bio: string;
  favouriteTeam: number;
  favouriteLeague: number;
  followedTeams: number[];
  followedPlayers: string[];
  followedMatches: string[];
  notificationPreferences: {
    liveAlerts: boolean;
    fantasyReminders: boolean;
    newsUpdates: boolean;
    transferAlerts: boolean;
    matchResults: boolean;
  };
  stats: {
    totalCommands: number;
    fantasyTeamsCreated: number;
    transfersMade: number;
    challengesWon: number;
    challengesLost: number;
  };
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  userId: { type: String, required: true, unique: true, index: true },
  username: { type: String, required: true },
  discriminator: { type: String, default: '0000' },
  avatar: { type: String, default: '' },
  premium: { type: Boolean, default: false },
  premiumSince: { type: Date },
  partner: { type: Boolean, default: false },
  partnerTier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },
  partnerSince: { type: Date },
  badges: [{ type: String }],
  bio: { type: String, default: '', maxlength: 500 },
  favouriteTeam: { type: Number },
  favouriteLeague: { type: Number, default: 39 },
  followedTeams: [{ type: Number }],
  followedPlayers: [{ type: String }],
  followedMatches: [{ type: String }],
  notificationPreferences: {
    liveAlerts: { type: Boolean, default: true },
    fantasyReminders: { type: Boolean, default: true },
    newsUpdates: { type: Boolean, default: false },
    transferAlerts: { type: Boolean, default: false },
    matchResults: { type: Boolean, default: true },
  },
  stats: {
    totalCommands: { type: Number, default: 0 },
    fantasyTeamsCreated: { type: Number, default: 0 },
    transfersMade: { type: Number, default: 0 },
    challengesWon: { type: Number, default: 0 },
    challengesLost: { type: Number, default: 0 },
  },
  lastActive: { type: Date, default: Date.now },
}, { timestamps: true });

userSchema.index({ username: 'text' });

export const User = model<IUser>('User', userSchema);
