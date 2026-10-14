import type { Request, Response } from 'express';
import { currentUser } from '../middleware/auth';
import * as authService from '../services/authService';
import type { JwtConfig } from '../utils/jwt';
import { parse } from '../utils/validate';
import { loginSchema, signupSchema } from '../validators/auth';

export function authController(jwt: JwtConfig) {
  return {
    async signup(req: Request, res: Response): Promise<void> {
      const input = parse(signupSchema, req.body);
      res.status(201).json({ data: await authService.signup(input, jwt) });
    },

    async login(req: Request, res: Response): Promise<void> {
      const input = parse(loginSchema, req.body);
      res.json({ data: await authService.login(input, jwt) });
    },

    async me(req: Request, res: Response): Promise<void> {
      res.json({ data: await authService.getUserById(currentUser(req).id) });
    },
  };
}
