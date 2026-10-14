import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { verifyToken } from '../utils/jwt';
import type { AuthUser, Role } from '../types/domain';

/** Requires a valid "Authorization: Bearer <jwt>" header and sets req.user. */
export function requireAuth(jwtSecret: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw AppError.unauthorized();
    }
    const user = verifyToken(header.slice('Bearer '.length).trim(), jwtSecret);
    if (!user) {
      throw new AppError(401, 'INVALID_TOKEN', 'Your session has expired. Please log in again.');
    }
    req.user = user;
    next();
  };
}

/** Must run after requireAuth. Rejects users whose role is not in the list. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw AppError.forbidden(`Only ${roles.join(' or ')} accounts can do this`);
    }
    next();
  };
}

/** For handlers behind requireAuth: returns req.user, typed as present. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}
