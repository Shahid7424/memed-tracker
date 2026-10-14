import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { CAMPAIGN_STATUSES, PLATFORMS } from '../types/domain';

const milestoneSchema = new Schema(
  {
    views: { type: Number, required: true, min: 1 },
    payout: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const campaignSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    platform: { type: String, enum: PLATFORMS, required: true },
    brand: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Whole rupees. remaining = totalBudget - spentAmount (derived, never stored,
    // so the two numbers can never disagree).
    totalBudget: { type: Number, required: true, min: 1 },
    spentAmount: { type: Number, required: true, default: 0, min: 0 },
    // Sorted by views ascending; validated by validateMilestones() before saving.
    milestones: { type: [milestoneSchema], required: true },
    status: { type: String, enum: CAMPAIGN_STATUSES, required: true, default: 'live' },
  },
  { timestamps: true },
);

// Brand dashboard: "my campaigns, newest first".
campaignSchema.index({ brand: 1, createdAt: -1 });
// Creator browse page: "live campaigns, optionally by platform, newest first".
campaignSchema.index({ status: 1, platform: 1, createdAt: -1 });

export type CampaignFields = InferSchemaType<typeof campaignSchema>;
export type CampaignDocument = HydratedDocument<CampaignFields>;
export const Campaign = model('Campaign', campaignSchema);
