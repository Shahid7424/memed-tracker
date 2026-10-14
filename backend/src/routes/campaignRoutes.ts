import { Router } from 'express';
import * as campaigns from '../controllers/campaignController';
import { requireAuth, requireRole } from '../middleware/auth';

export function campaignRoutes(jwtSecret: string): Router {
  const router = Router();
  router.use(requireAuth(jwtSecret));

  router.post('/', requireRole('brand'), campaigns.createCampaign);
  router.get('/', campaigns.listCampaigns);
  // Must be registered before "/:id" so "mine" is not treated as an id.
  router.get('/mine', requireRole('brand'), campaigns.listMyCampaigns);
  router.get('/:id', campaigns.getCampaign);
  router.get('/:id/submissions', requireRole('brand'), campaigns.listCampaignSubmissions);
  return router;
}
