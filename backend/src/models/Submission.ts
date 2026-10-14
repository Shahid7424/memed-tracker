import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { PAYOUT_STATUSES, PLATFORMS } from '../types/domain';

const submissionSchema = new Schema(
  {
    campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    platform: { type: String, enum: PLATFORMS, required: true },
    // Canonical form of the link (see utils/postUrl.ts), used for duplicate checks.
    postUrl: { type: String, required: true },
    views: { type: Number, required: true, default: 0, min: 0 },
    // What the current view count qualifies for (can go down if views drop).
    eligiblePayout: { type: Number, required: true, default: 0, min: 0 },
    // What has actually been paid out. Only ever increases.
    paidAmount: { type: Number, required: true, default: 0, min: 0 },
    payoutStatus: { type: String, enum: PAYOUT_STATUSES, required: true, default: 'pending' },
    viewsUpdatedAt: { type: Date, default: null },
    // Set once views jump unusually fast (see services/spikeDetection.ts). Never cleared automatically.
    flagged: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

// A post can be entered into a campaign only once, by anyone.
submissionSchema.index({ campaign: 1, postUrl: 1 }, { unique: true });
// Creator's "my submissions" page.
submissionSchema.index({ creator: 1, createdAt: -1 });
// Brand's "submissions for this campaign" page.
submissionSchema.index({ campaign: 1, createdAt: -1 });

export type SubmissionFields = InferSchemaType<typeof submissionSchema>;
export type SubmissionDocument = HydratedDocument<SubmissionFields>;
export const Submission = model('Submission', submissionSchema);
