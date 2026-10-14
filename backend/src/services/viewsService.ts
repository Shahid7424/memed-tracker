import mongoose, { type ClientSession } from 'mongoose';
import { Campaign } from '../models/Campaign';
import { Submission } from '../models/Submission';
import { AppError } from '../utils/AppError';
import { formatInr, formatViews } from '../utils/format';
import { toCampaignDto, toSubmissionDto, type CampaignDto, type SubmissionDto } from '../utils/serializers';
import { assertValidViewCount, campaignStatusFor, payoutStatusFor, planPayout } from './payout';
import { isViewSpike } from './spikeDetection';

export type PayoutAction = 'paid' | 'none' | 'budget_blocked';

export interface ViewUpdateResult {
  submission: SubmissionDto;
  campaign: CampaignDto;
  payout: {
    action: PayoutAction;
    /** Paid by this update (0 unless action is "paid"). */
    amountPaid: number;
    /** The extra amount the post qualified for but could not be paid. */
    blockedAmount: number;
    message: string;
  };
}

/**
 * Records a new view count for a submission and pays any newly earned amount.
 *
 * Everything runs inside one MongoDB transaction, so the campaign's spentAmount
 * and the submission's paidAmount are always written together or not at all.
 * On top of that, the campaign is charged with a conditional update that only
 * succeeds if `spentAmount + delta <= totalBudget` at write time, so the budget
 * can never be exceeded even if two updates race. If two transactions touch
 * the same document at once, MongoDB aborts one with a write conflict and
 * withTransaction() retries it from scratch against the fresh data, which is
 * why a repeated or concurrent update can never pay the same milestone twice.
 */
export async function updateSubmissionViews(submissionId: string, views: number): Promise<ViewUpdateResult> {
  assertValidViewCount(views);

  const session = await mongoose.startSession();
  try {
    let result: ViewUpdateResult | undefined;
    await session.withTransaction(async () => {
      result = await applyViewUpdate(submissionId, views, session);
    });
    if (!result) throw new Error('View update transaction finished without a result');
    return result;
  } finally {
    await session.endSession();
  }
}

async function applyViewUpdate(submissionId: string, views: number, session: ClientSession): Promise<ViewUpdateResult> {
  // Re-read inside the transaction: on a retry these reflect the other writer's changes.
  const submission = await Submission.findById(submissionId).session(session);
  if (!submission) throw AppError.notFound('Submission not found');
  const campaign = await Campaign.findById(submission.campaign).session(session);
  if (!campaign) throw AppError.notFound('Campaign for this submission no longer exists');

  const plan = planPayout({
    views,
    paidAmount: submission.paidAmount,
    milestones: campaign.milestones,
    remainingBudget: campaign.totalBudget - campaign.spentAmount,
  });

  let charged = campaign;
  let amountPaid = 0;
  if (plan.action === 'pay') {
    // Atomic budget guard: matches only if the delta still fits in the budget.
    const updated = await Campaign.findOneAndUpdate(
      { _id: campaign._id, $expr: { $lte: [{ $add: ['$spentAmount', plan.delta] }, '$totalBudget'] } },
      { $inc: { spentAmount: plan.delta } },
      { new: true, session },
    );
    if (updated) {
      charged = updated;
      amountPaid = plan.delta;
    }
  }

  const previousViews = submission.views;
  const lastUpdate = submission.viewsUpdatedAt ?? submission.createdAt;
  const paidAmount = submission.paidAmount + amountPaid;

  submission.views = views;
  submission.eligiblePayout = plan.eligiblePayout;
  submission.paidAmount = paidAmount;
  submission.payoutStatus = payoutStatusFor(plan.eligiblePayout, paidAmount);
  submission.flagged ||= isViewSpike(previousViews, views, Date.now() - lastUpdate.getTime());
  submission.viewsUpdatedAt = new Date();
  await submission.save({ session });

  const status = campaignStatusFor(charged.totalBudget - charged.spentAmount, charged.milestones);
  if (status !== charged.status) {
    charged.status = status;
    await charged.save({ session });
  }

  const blockedAmount = Math.max(0, plan.eligiblePayout - paidAmount);
  return {
    submission: toSubmissionDto(submission),
    campaign: toCampaignDto(charged),
    payout: {
      action: amountPaid > 0 ? 'paid' : blockedAmount > 0 ? 'budget_blocked' : 'none',
      amountPaid,
      blockedAmount,
      message: describeOutcome(views, previousViews, amountPaid, blockedAmount, charged.totalBudget - charged.spentAmount),
    },
  };
}

function describeOutcome(
  views: number,
  previousViews: number,
  amountPaid: number,
  blockedAmount: number,
  remaining: number,
): string {
  if (amountPaid > 0) {
    return `Paid ${formatInr(amountPaid)} for reaching ${formatViews(views)} views.`;
  }
  if (blockedAmount > 0) {
    return `This post qualifies for ${formatInr(blockedAmount)} more, but the campaign only has ${formatInr(remaining)} left. Partial milestones are not paid.`;
  }
  if (views < previousViews) {
    return 'Views went down. Money already paid is kept; no new payout.';
  }
  return 'Views updated. No new milestone reached.';
}
