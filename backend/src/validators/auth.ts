import { z } from 'zod';
import { ROLES } from '../types/domain';

const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254));

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters') // bcrypt only uses the first 72 bytes
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  role: z.enum(ROLES, { error: 'Role must be "brand" or "creator"' }),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(72),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
