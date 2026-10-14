import { z } from 'zod';
import { objectIdSchema, wholeNumber } from './common';

export const createSubmissionSchema = z.object({
  campaignId: objectIdSchema,
  postUrl: z.string().trim().min(1, 'Post link is required').max(500),
});

export const updateViewsSchema = z.object({
  views: wholeNumber('Views').min(0, 'Views cannot be negative'),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type UpdateViewsInput = z.infer<typeof updateViewsSchema>;
