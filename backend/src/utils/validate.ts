import type { z } from 'zod';
import { AppError } from './AppError';

/**
 * Parses untrusted input (body, params or query) with a zod schema.
 * On failure throws a 400 listing each invalid field, e.g.
 * { field: "milestones.0.views", message: "Milestone views must be greater than 0" }.
 */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input ?? {});
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    throw new AppError(400, 'VALIDATION_ERROR', details[0]?.message ?? 'Invalid request', details);
  }
  return result.data;
}
