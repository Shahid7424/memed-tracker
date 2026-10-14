import jwt, { type SignOptions } from 'jsonwebtoken';
import { ROLES, type AuthUser, type Role } from '../types/domain';

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export function signToken(user: AuthUser, config: JwtConfig): string {
  return jwt.sign({ role: user.role }, config.secret, {
    subject: user.id,
    expiresIn: config.expiresIn as SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

/** Returns the user in the token, or null if it is invalid, expired or malformed. */
export function verifyToken(token: string, secret: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || typeof payload.sub !== 'string') return null;
    const role: unknown = payload.role;
    if (!ROLES.includes(role as Role)) return null;
    return { id: payload.sub, role: role as Role };
  } catch {
    return null;
  }
}
