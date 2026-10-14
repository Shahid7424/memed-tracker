import type { Milestone } from '@/types/api';

/**
 * Display-only helper: which milestone a view count has reached. The backend
 * is the source of truth for money; this only highlights the ladder in the UI.
 */
export function reachedMilestoneIndex(views: number, milestones: Milestone[]): number {
  let index = -1;
  milestones.forEach((m, i) => {
    if (views >= m.views) index = i;
  });
  return index;
}
