import { isValidObjectId } from 'mongoose';
import { z } from 'zod';

export const objectIdSchema = z.string().refine((value) => isValidObjectId(value), 'Invalid id');

export const idParamsSchema = z.object({ id: objectIdSchema });

/** Whole rupees or view counts: integers only, so no floating-point money. */
export const wholeNumber = (label: string) =>
  z
    .number({ error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .refine(Number.isSafeInteger, `${label} is too large`);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
