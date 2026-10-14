import type { CreateCampaignInput, Milestone, Platform } from '@/types/api';

/** Inputs are kept as strings while typing so a field can be empty. */
export interface MilestoneDraft {
  key: number;
  views: string;
  payout: string;
}

export interface CampaignDraft {
  name: string;
  platform: Platform | null;
  totalBudget: string;
  milestones: MilestoneDraft[];
}

export interface CampaignFormErrors {
  name?: string;
  platform?: string;
  totalBudget?: string;
  milestones?: string;
  rows: Record<number, { views?: string; payout?: string }>;
}

const MAX_BUDGET = 1_000_000_000;

/** Parses "1,00,000" or "100000" into a whole number, or null. */
export function parseWholeNumber(value: string): number | null {
  const cleaned = value.replace(/[,\s]/g, '');
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isSafeInteger(n) ? n : null;
}

/** Milestones that are fully filled in, sorted by views (what the server will store). */
export function parsedLadder(drafts: MilestoneDraft[]): Milestone[] {
  return drafts
    .map((d) => ({ views: parseWholeNumber(d.views), payout: parseWholeNumber(d.payout) }))
    .filter((m): m is Milestone => m.views !== null && m.payout !== null && m.views > 0 && m.payout > 0)
    .sort((a, b) => a.views - b.views);
}

/**
 * Mirrors the backend rules so users get instant feedback. The server
 * re-validates everything; this is only for a better form experience.
 */
export function validateCampaignDraft(draft: CampaignDraft): {
  errors: CampaignFormErrors;
  input: CreateCampaignInput | null;
} {
  const errors: CampaignFormErrors = { rows: {} };

  if (draft.name.trim().length < 3) errors.name = 'Name must be at least 3 characters';
  if (!draft.platform) errors.platform = 'Choose a platform';

  const budget = parseWholeNumber(draft.totalBudget);
  if (budget === null || budget <= 0) errors.totalBudget = 'Enter a whole rupee amount greater than 0';
  else if (budget > MAX_BUDGET) errors.totalBudget = 'Budget is too large';

  if (draft.milestones.length === 0) errors.milestones = 'Add at least one milestone';

  const seenViews = new Map<number, number>();
  draft.milestones.forEach((row) => {
    const rowErrors: { views?: string; payout?: string } = {};
    const views = parseWholeNumber(row.views);
    const payout = parseWholeNumber(row.payout);
    if (views === null || views <= 0) rowErrors.views = 'Enter views above 0';
    else if (seenViews.has(views)) rowErrors.views = 'Duplicate threshold';
    else seenViews.set(views, row.key);
    if (payout === null || payout <= 0) rowErrors.payout = 'Enter an amount above 0';
    if (rowErrors.views || rowErrors.payout) errors.rows[row.key] = rowErrors;
  });

  const ladder = parsedLadder(draft.milestones);
  if (!errors.milestones && Object.keys(errors.rows).length === 0) {
    for (let i = 1; i < ladder.length; i++) {
      if (ladder[i]!.payout <= ladder[i - 1]!.payout) {
        errors.milestones = 'Each higher view milestone must pay more than the one below it';
        break;
      }
    }
    const firstPayout = ladder[0]?.payout;
    if (!errors.totalBudget && budget !== null && firstPayout !== undefined && budget < firstPayout) {
      errors.totalBudget = 'Budget must cover at least the first milestone payout';
    }
  }

  const hasErrors =
    Boolean(errors.name || errors.platform || errors.totalBudget || errors.milestones) ||
    Object.keys(errors.rows).length > 0;
  if (hasErrors || !draft.platform || budget === null) return { errors, input: null };

  return {
    errors,
    input: { name: draft.name.trim(), platform: draft.platform, totalBudget: budget, milestones: ladder },
  };
}
