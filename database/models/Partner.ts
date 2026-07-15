import { Schema, model, Document } from 'mongoose';

export interface IPartner extends Document {
  userId: string;
  guildId: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  code: string;
  activatedAt: Date;
  expiresAt: Date;
  isActive: boolean;
  benefits: {
    betaFeatures: boolean;
    advancedAI: boolean;
    earlyAccess: boolean;
    exclusiveBadge: boolean;
    prioritySupport: boolean;
    analytics: boolean;
    customEmbeds: boolean;
  };
  stats: {
    commandsUsed: number;
    feedbackGiven: number;
    reportsSubmitted: number;
    uptimeMonths: number;
    contributionPoints: number;
  };
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const partnerSchema = new Schema<IPartner>({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true },
  tier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },
  code: { type: String, required: true, unique: true },
  activatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true },
  benefits: {
    betaFeatures: { type: Boolean, default: false },
    advancedAI: { type: Boolean, default: false },
    earlyAccess: { type: Boolean, default: false },
    exclusiveBadge: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
    analytics: { type: Boolean, default: false },
    customEmbeds: { type: Boolean, default: false },
  },
  stats: {
    commandsUsed: { type: Number, default: 0 },
    feedbackGiven: { type: Number, default: 0 },
    reportsSubmitted: { type: Number, default: 0 },
    uptimeMonths: { type: Number, default: 0 },
    contributionPoints: { type: Number, default: 0 },
  },
  notes: { type: String, default: '' },
}, { timestamps: true });

partnerSchema.index({ code: 1 });
partnerSchema.index({ userId: 1, isActive: 1 });

export const Partner = model<IPartner>('Partner', partnerSchema);
