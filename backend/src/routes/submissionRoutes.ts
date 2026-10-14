import { Router } from 'express';
import * as submissions from '../controllers/submissionController';
import { requireAuth, requireRole } from '../middleware/auth';

export function submissionRoutes(jwtSecret: string): Router {
  const router = Router();
  router.use(requireAuth(jwtSecret));

  router.post('/', requireRole('creator'), submissions.createSubmission);
  router.get('/mine', requireRole('creator'), submissions.listMySubmissions);
  // Simulates platform data. Per the brief there is no role or ownership check
  // here; we still require a logged-in user so the endpoint is not anonymous.
  router.patch('/:id/views', submissions.updateViews);
  return router;
}
