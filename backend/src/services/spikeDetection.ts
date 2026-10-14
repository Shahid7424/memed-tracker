/**
 * Bonus: flags a post whose views jump unusually fast, a common sign of
 * bought views. The flag is informational (shown to the brand); it does not
 * block payouts. A production system would hold flagged payouts for review.
 */
export const SPIKE_MIN_GAIN = 100_000; // ignore small jumps
export const SPIKE_MAX_VIEWS_PER_MINUTE = 10_000;

export function isViewSpike(previousViews: number, newViews: number, elapsedMs: number): boolean {
  const gained = newViews - previousViews;
  if (gained < SPIKE_MIN_GAIN) return false;
  const minutes = Math.max(elapsedMs, 1) / 60_000;
  return gained / minutes > SPIKE_MAX_VIEWS_PER_MINUTE;
}
