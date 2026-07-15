import { Schema, model, Document, Types } from 'mongoose';

export interface IFantasyTeam extends Document {
  userId: string;
  name: string;
  budget: number;
  totalPoints: number;
  gameweekPoints: number;
  gameweek: number;
  formation: string;
  players: Types.ObjectId[];
  startingXI: string[];
  substitutes: string[];
  captainId: string;
  viceCaptainId: string;
  transfersUsed: number;
  totalTransfers: number;
  pointsHit: number;
  chips: {
    wildcard: boolean;
    wildcardUsed: number;
    freeHit: boolean;
    benchBoost: boolean;
    tripleCaptain: boolean;
  };
  wildcardLimit: number;
  rank: number;
  leagueRank: number;
  createdAt: Date;
  updatedAt: Date;
}

const fantasyTeamSchema = new Schema<IFantasyTeam>({
  userId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 32 },
  budget: { type: Number, default: 100_000_000 },
  totalPoints: { type: Number, default: 0 },
  gameweekPoints: { type: Number, default: 0 },
  gameweek: { type: Number, default: 1 },
  formation: { type: String, default: '4-3-3' },
  players: [{ type: Schema.Types.ObjectId, ref: 'Player' }],
  startingXI: [{ type: String }],
  substitutes: [{ type: String }],
  captainId: { type: String },
  viceCaptainId: { type: String },
  transfersUsed: { type: Number, default: 0 },
  totalTransfers: { type: Number, default: 0 },
  pointsHit: { type: Number, default: 0 },
  chips: {
    wildcard: { type: Boolean, default: false },
    wildcardUsed: { type: Number, default: 0 },
    freeHit: { type: Boolean, default: false },
    benchBoost: { type: Boolean, default: false },
    tripleCaptain: { type: Boolean, default: false },
  },
  wildcardLimit: { type: Number, default: 2 },
  rank: { type: Number, default: 0 },
  leagueRank: { type: Number, default: 0 },
}, { timestamps: true });

fantasyTeamSchema.index({ totalPoints: -1 });
fantasyTeamSchema.index({ userId: 1, gameweek: -1 });

export const FantasyTeam = model<IFantasyTeam>('FantasyTeam', fantasyTeamSchema);
