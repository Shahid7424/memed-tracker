import {
  calculateEligiblePayout,
  campaignStatusFor,
  getEligibleMilestone,
  payoutStatusFor,
  planPayout,
  validateMilestones,
} from '../src/services/payout';
import { isViewSpike } from '../src/services/spikeDetection';
import type { Milestone } from '../src/types/domain';

const LADDER: Milestone[] = [
  { views: 10_000, payout: 500 },
  { views: 50_000, payout: 2_000 },
  { views: 100_000, payout: 5_000 },
];

describe('calculateEligiblePayout', () => {
  it.each([
    [0, 0],
    [9_999, 0],
    [10_000, 500],
    [49_999, 500],
    [50_000, 2_000],
    [99_999, 2_000],
    [100_000, 5_000],
    [5_000_000, 5_000],
  ])('%i views -> ₹%i', (views, expected) => {
    expect(calculateEligiblePayout(views, LADDER)).toBe(expected);
  });

  it('pays the highest milestone, never the sum of milestones', () => {
    // 500 + 2000 + 5000 would be 7500
    expect(calculateEligiblePayout(150_000, LADDER)).toBe(5_000);
  });

  it('does not depend on the ladder being sorted', () => {
    const shuffled = [LADDER[2]!, LADDER[0]!, LADDER[1]!];
    expect(calculateEligiblePayout(60_000, shuffled)).toBe(2_000);
    expect(getEligibleMilestone(60_000, shuffled)).toEqual({ views: 50_000, payout: 2_000 });
  });

  it('returns no milestone below the first threshold', () => {
    expect(getEligibleMilestone(9_999, LADDER)).toBeNull();
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid view count %p',
    (views) => {
      expect(() => calculateEligiblePayout(views, LADDER)).toThrow('View count must be a whole number');
    },
  );
});

describe('validateMilestones', () => {
  it('sorts an unordered ladder by views', () => {
    const result = validateMilestones([LADDER[2]!, LADDER[0]!, LADDER[1]!]);
    expect(result).toEqual(LADDER);
  });

  it('does not mutate the input', () => {
    const input = [LADDER[1]!, LADDER[0]!];
    validateMilestones(input);
    expect(input).toEqual([LADDER[1], LADDER[0]]);
  });

  it('rejects an empty ladder', () => {
    expect(() => validateMilestones([])).toThrow('Add at least one milestone');
  });

  it('rejects more than 10 milestones', () => {
    const many = Array.from({ length: 11 }, (_, i) => ({ views: (i + 1) * 1000, payout: (i + 1) * 100 }));
    expect(() => validateMilestones(many)).toThrow('at most 10');
  });

  it('rejects duplicate thresholds', () => {
    expect(() =>
      validateMilestones([
        { views: 10_000, payout: 500 },
        { views: 10_000, payout: 900 },
      ]),
    ).toThrow('same threshold');
  });

  it('rejects payouts that do not increase with views', () => {
    expect(() =>
      validateMilestones([
        { views: 10_000, payout: 2_000 },
        { views: 50_000, payout: 500 },
      ]),
    ).toThrow('must pay more');
    expect(() =>
      validateMilestones([
        { views: 10_000, payout: 500 },
        { views: 50_000, payout: 500 },
      ]),
    ).toThrow('must pay more');
  });

  it.each([
    [{ views: 0, payout: 100 }, 'thresholds must be positive'],
    [{ views: -5, payout: 100 }, 'thresholds must be positive'],
    [{ views: 10.5, payout: 100 }, 'thresholds must be positive'],
    [{ views: 1000, payout: 0 }, 'payouts must be positive'],
    [{ views: 1000, payout: 99.99 }, 'payouts must be positive'],
  ])('rejects invalid milestone %p', (milestone, message) => {
    expect(() => validateMilestones([milestone])).toThrow(message);
  });
});

describe('planPayout (budget cap)', () => {
  const base = { milestones: LADDER, paidAmount: 0, remainingBudget: 10_000 };

  it('pays the full milestone when the budget allows', () => {
    expect(planPayout({ ...base, views: 10_000 })).toEqual({ action: 'pay', eligiblePayout: 500, delta: 500 });
  });

  it('pays only the difference from what was already paid', () => {
    expect(planPayout({ ...base, views: 50_000, paidAmount: 500 })).toEqual({
      action: 'pay',
      eligiblePayout: 2_000,
      delta: 1_500,
    });
  });

  it('crossing several milestones at once pays the top one exactly once', () => {
    expect(planPayout({ ...base, views: 120_000 })).toEqual({ action: 'pay', eligiblePayout: 5_000, delta: 5_000 });
  });

  it('pays nothing when views are unchanged', () => {
    expect(planPayout({ ...base, views: 50_000, paidAmount: 2_000 })).toEqual({
      action: 'none',
      eligiblePayout: 2_000,
      delta: 0,
    });
  });

  it('never claws back money when views go down', () => {
    expect(planPayout({ ...base, views: 20_000, paidAmount: 2_000 })).toEqual({
      action: 'none',
      eligiblePayout: 500,
      delta: 0,
    });
  });

  it('blocks the payout (no partial amount) when the budget cannot cover the difference', () => {
    expect(planPayout({ ...base, views: 100_000, paidAmount: 500, remainingBudget: 4_499 })).toEqual({
      action: 'budget_blocked',
      eligiblePayout: 5_000,
      delta: 4_500,
    });
  });

  it('pays when the difference uses exactly the remaining budget', () => {
    expect(planPayout({ ...base, views: 100_000, paidAmount: 500, remainingBudget: 4_500 }).action).toBe('pay');
  });
});

describe('payoutStatusFor', () => {
  it('reports pending, paid and budget_blocked', () => {
    expect(payoutStatusFor(0, 0)).toBe('pending');
    expect(payoutStatusFor(2_000, 2_000)).toBe('paid');
    expect(payoutStatusFor(500, 2_000)).toBe('paid'); // views dropped
    expect(payoutStatusFor(5_000, 2_000)).toBe('budget_blocked');
  });
});

describe('campaignStatusFor', () => {
  it('is exhausted once the remaining budget cannot cover the first milestone', () => {
    expect(campaignStatusFor(500, LADDER)).toBe('live');
    expect(campaignStatusFor(499, LADDER)).toBe('exhausted');
    expect(campaignStatusFor(0, LADDER)).toBe('exhausted');
  });
});

describe('isViewSpike', () => {
  const minute = 60_000;
  it('flags a large, fast jump', () => {
    expect(isViewSpike(0, 100_000, minute)).toBe(true);
  });
  it('ignores small jumps and slow growth', () => {
    expect(isViewSpike(0, 90_000, 1)).toBe(false);
    expect(isViewSpike(0, 100_000, 60 * minute)).toBe(false);
  });
});
