import { apiRequest } from '@/lib/api';
import type { AuthResponse, Role, User } from '@/types/api';

export const authApi = {
  signup: (input: { name: string; email: string; password: string; role: Role }) =>
    apiRequest<AuthResponse>('/api/auth/signup', { method: 'POST', body: input }),
  login: (input: { email: string; password: string }) =>
    apiRequest<AuthResponse>('/api/auth/login', { method: 'POST', body: input }),
  me: (signal?: AbortSignal) => apiRequest<User>('/api/auth/me', { signal }),
};
