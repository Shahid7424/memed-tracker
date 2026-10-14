import type { Request, Response } from 'express';
import { currentUser } from '../middleware/auth';
import * as campaignService from '../services/campaignService';
import { parse } from '../utils/validate';
import { createCampaignSchema, listCampaignsQuerySchema } from '../validators/campaign';
import { idParamsSchema } from '../validators/common';

export async function createCampaign(req: Request, res: Response): Promise<void> {
  const input = parse(createCampaignSchema, req.body);
  res.status(201).json({ data: await campaignService.createCampaign(currentUser(req).id, input) });
}

export async function listCampaigns(req: Request, res: Response): Promise<void> {
  const query = parse(listCampaignsQuerySchema, req.query);
  res.json({ data: await campaignService.listCampaigns(query) });
}

export async function listMyCampaigns(req: Request, res: Response): Promise<void> {
  res.json({ data: await campaignService.listBrandCampaigns(currentUser(req).id) });
}

export async function getCampaign(req: Request, res: Response): Promise<void> {
  const { id } = parse(idParamsSchema, req.params);
  res.json({ data: await campaignService.getCampaign(id) });
}

export async function listCampaignSubmissions(req: Request, res: Response): Promise<void> {
  const { id } = parse(idParamsSchema, req.params);
  res.json({ data: await campaignService.listCampaignSubmissions(id, currentUser(req).id) });
}
