import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import type { JwtConfig } from '../utils/jwt';

export function authRoutes(jwt: JwtConfig, rateLimitEnabled: boolean): Router {
  const router = Router();
  const controller = authController(jwt);

  // Slows down password guessing: 20 signup/login attempts per IP per 15 minutes.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => !rateLimitEnabled,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait a few minutes.' } },
  });

  router.post('/signup', authLimiter, controller.signup);
  router.post('/login', authLimiter, controller.login);
  router.get('/me', requireAuth(jwt.secret), controller.me);
  return router;
}
