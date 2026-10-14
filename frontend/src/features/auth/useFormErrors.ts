import { useState } from 'react';
import { ApiError } from '@/lib/api';

/**
 * Field errors for a form: set by client-side checks, or mapped from the
 * API's 400 response so server-side validation shows next to the right input.
 */
export function useFormErrors<F extends string>() {
  const [errors, setErrors] = useState<Partial<Record<F, string>>>({});

  function fromApiError(err: unknown, fields: readonly F[]): boolean {
    if (!(err instanceof ApiError) || err.fieldErrors.length === 0) return false;
    const next: Partial<Record<F, string>> = {};
    for (const { field, message } of err.fieldErrors) {
      const key = fields.find((f) => field === f || field.startsWith(`${f}.`));
      if (key && !next[key]) next[key] = message;
    }
    setErrors(next);
    return Object.keys(next).length > 0;
  }

  return { errors, setErrors, fromApiError };
}
