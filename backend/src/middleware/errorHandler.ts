import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 11000;
}

/** Errors thrown by express.json() for bad bodies carry a `type` and `status`. */
function bodyParserError(err: unknown): { status: number; type: string } | null {
  if (typeof err !== 'object' || err === null) return null;
  const { status, type } = err as { status?: unknown; type?: unknown };
  return typeof status === 'number' && typeof type === 'string' ? { status, type } : null;
}

function toAppError(err: unknown): AppError | null {
  if (err instanceof AppError) return err;
  if (err instanceof mongoose.Error.CastError) return AppError.badRequest('Invalid id');
  if (isDuplicateKeyError(err)) return AppError.conflict('This record already exists', 'DUPLICATE');

  const parserError = bodyParserError(err);
  if (parserError?.type === 'entity.parse.failed') return AppError.badRequest('Request body is not valid JSON');
  if (parserError?.type === 'entity.too.large') return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  return null;
}

/**
 * Single place where errors become HTTP responses. Known errors are returned
 * with their message; anything unexpected is logged on the server and the
 * client only sees a generic message (no stack traces or database details).
 */
export function errorHandler(err: unknown, _req: Request, res: Response<ErrorBody>, _next: NextFunction): void {
  const known = toAppError(err);
  if (known) {
    const body: ErrorBody = { error: { code: known.code, message: known.message } };
    if (known.details !== undefined) body.error.details = known.details;
    res.status(known.statusCode).json(body);
    return;
  }

  console.error('Unexpected error:', err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } });
}

export function notFoundHandler(req: Request, res: Response<ErrorBody>): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` } });
}
