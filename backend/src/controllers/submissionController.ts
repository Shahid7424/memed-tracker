import type { Request, Response } from 'express';
import { currentUser } from '../middleware/auth';
import * as submissionService from '../services/submissionService';
import { updateSubmissionViews } from '../services/viewsService';
import { parse } from '../utils/validate';
import { idParamsSchema } from '../validators/common';
import { createSubmissionSchema, updateViewsSchema } from '../validators/submission';

export async function createSubmission(req: Request, res: Response): Promise<void> {
  const input = parse(createSubmissionSchema, req.body);
  res.status(201).json({ data: await submissionService.createSubmission(currentUser(req).id, input) });
}

export async function listMySubmissions(req: Request, res: Response): Promise<void> {
  res.json({ data: await submissionService.listCreatorSubmissions(currentUser(req).id) });
}

export async function updateViews(req: Request, res: Response): Promise<void> {
  const { id } = parse(idParamsSchema, req.params);
  const { views } = parse(updateViewsSchema, req.body);
  res.json({ data: await updateSubmissionViews(id, views) });
}
