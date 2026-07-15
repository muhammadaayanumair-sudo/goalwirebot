import { Schema, model, Document } from 'mongoose';

export interface IFantasyLeague extends Document {
  name: string;
  code: string;
  description: string;
  ownerId: string;
  type: 'public' | 'private';
  maxPlayers: number;
  members: {
    userId: string;
    teamId: string;
    joinedAt: Date;
  }[];
  settings: {
    budget: number;
    transfersPerGW: number;
    squadSize: number;
    maxPerClub: number;
    pointsPerGoal: number;
    pointsPerAssist: number;
    pointsPerCleanSheet: number;
  };
  season: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const fantasyLeagueSchema = new Schema<IFantasyLeague>({
  name: { type: String, required: true, trim: true, maxlength: 50 },
  code: { type: String, required: true, unique: true, uppercase: true },
  description: { type: String, default: '', maxlength: 200 },
  ownerId: { type: String, required: true },
  type: { type: String, enum: ['public', 'private'], default: 'private' },
  maxPlayers: { type: Number, default: 50, min: 2, max: 100 },
  members: [{
    userId: { type: String, required: true },
    teamId: { type: String },
    joinedAt: { type: Date, default: Date.now },
  }],
  settings: {
    budget: { type: Number, default: 100_000_000 },
    transfersPerGW: { type: Number, default: 2 },
    squadSize: { type: Number, default: 15 },
    maxPerClub: { type: Number, default: 3 },
    pointsPerGoal: { type: Number, default: 6 },
    pointsPerAssist: { type: Number, default: 4 },
    pointsPerCleanSheet: { type: Number, default: 4 },
  },
  season: { type: Number, default: new Date().getFullYear() },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

fantasyLeagueSchema.index({ code: 1 });
fantasyLeagueSchema.index({ 'members.userId': 1 });

export const FantasyLeague = model<IFantasyLeague>('FantasyLeague', fantasyLeagueSchema);
