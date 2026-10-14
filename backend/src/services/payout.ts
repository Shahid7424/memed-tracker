/**
 * Pure payout rules. Nothing in this file touches the database or Express,
 * so every rule can be unit tested directly (see tests/payout.test.ts).
 *
 * Money is always a whole number of rupees. Inputs that are not safe
 * integers are rejected, so floating-point rounding can never creep in.
 */
import { AppError } from '../utils/AppError';
import type { CampaignStatus, Milestone, PayoutStatus } from '../types/domain';

export const MAX_MILESTONES = 10;

function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

/**
 * Checks a milestone ladder and returns a copy sorted by view threshold.
 *
 * Rules: 1–10 rungs, thresholds are unique positive integers, payouts are
 * positive integers, and a higher threshold must pay strictly more than a
 * lower one (otherwise the higher rung would be pointless).
 */
export function validateMilestones(milestones: readonly Milestone[]): Milestone[] {
  if (milestones.length === 0) {
    throw AppError.badRequest('Add at least one milestone');
  }
  if (milestones.length > MAX_MILESTONES) {
    throw AppError.badRequest(`A campaign can have at most ${MAX_MILESTONES} milestones`);
  }

  for (const m of milestones) {
    if (!isPositiveInteger(m.views)) {
      throw AppError.badRequest('Milestone view thresholds must be positive whole numbers');
    }
    if (!isPositiveInteger(m.payout)) {
      throw AppError.badRequest('Milestone payouts must be positive whole rupee amounts');
    }
  }

  const sorted = [...milestones]
    .map((m) => ({ views: m.views, payout: m.payout }))
    .sort((a, b) => a.views - b.views);

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    if (curr.views === prev.views) {
      throw AppError.badRequest(`Two milestones use the same threshold (${curr.views} views)`);
    }
    if (curr.payout <= prev.payout) {
      throw AppError.badRequest(
        `The ${curr.views}-view milestone must pay more than the ${prev.views}-view milestone`,
      );
    }
  }

  return sorted;
}

export function assertValidViewCount(views: number): void {
  if (!Number.isSafeInteger(views) || views < 0) {
    throw AppError.badRequest('View count must be a whole number of 0 or more');
  }
}

/**
 * Returns the highest milestone whose threshold the view count has reached,
 * or null if the post has not reached the first milestone yet.
 * Does not assume the ladder is sorted.
 */
export function getEligibleMilestone(views: number, milestones: readonly Milestone[]): Milestone | null {
  assertValidViewCount(views);
  let best: Milestone | null = null;
  for (const m of milestones) {
    if (views >= m.views && (best === null || m.views > best.views)) {
      best = m;
    }
  }
  return best;
}

/**
 * The amount a post is eligible for at this view count: the payout of the
 * highest milestone crossed. Milestone amounts are never added together.
 */
export function calculateEligiblePayout(views: number, milestones: readonly Milestone[]): number {
  return getEligibleMilestone(views, milestones)?.payout ?? 0;
}

export type PayoutPlan =
  /** Nothing new to pay: same milestone as before, or views went down. */
  | { action: 'none'; eligiblePayout: number; delta: 0 }
  /** Pay `delta` on top of what was already paid. */
  | { action: 'pay'; eligiblePayout: number; delta: number }
  /** A higher milestone was reached but the remaining budget cannot cover it. */
  | { action: 'budget_blocked'; eligiblePayout: number; delta: number };

export interface PayoutInput {
  views: number;
  /** What this submission has already been paid in total. */
  paidAmount: number;
  milestones: readonly Milestone[];
  remainingBudget: number;
}

/**
 * Decides what (if anything) to pay for a view update.
 *
 * - Only the difference between the new eligible payout and what was already
 *   paid is awarded, so a post that jumps straight from 0 to the top rung gets
 *   the top payout once, and repeating an update pays nothing.
 * - Money already paid is never taken back when views drop.
 * - All-or-nothing: if the budget cannot cover the full difference, nothing
 *   is paid now (no partial milestones).
 *
 * The database layer must still enforce the budget atomically, because
 * `remainingBudget` may be stale by the time the write happens.
 */
export function planPayout({ views, paidAmount, milestones, remainingBudget }: PayoutInput): PayoutPlan {
  const eligiblePayout = calculateEligiblePayout(views, milestones);
  const delta = eligiblePayout - paidAmount;

  if (delta <= 0) {
    return { action: 'none', eligiblePayout, delta: 0 };
  }
  if (delta > remainingBudget) {
    return { action: 'budget_blocked', eligiblePayout, delta };
  }
  return { action: 'pay', eligiblePayout, delta };
}

export function payoutStatusFor(eligiblePayout: number, paidAmount: number): PayoutStatus {
  if (eligiblePayout > paidAmount) return 'budget_blocked';
  if (paidAmount === 0) return 'pending';
  return 'paid';
}

/**
 * A campaign is "exhausted" once its remaining budget cannot cover even the
 * first milestone, because a new creator could then never be paid. It stops
 * accepting new submissions, but existing submissions are still evaluated and
 * any increase that still fits in the budget is paid.
 */
export function campaignStatusFor(remainingBudget: number, milestones: readonly Milestone[]): CampaignStatus {
  const firstPayout = Math.min(...milestones.map((m) => m.payout));
  return remainingBudget < firstPayout ? 'exhausted' : 'live';
}
