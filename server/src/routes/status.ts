import { Router, Request, Response } from 'express';
import { config } from '../config/env.js';
import { SystemStatusResponse } from '../../../shared/types/index.js';

export const statusRouter = Router();

const startTime = Date.now();

statusRouter.get('/', (_req: Request, res: Response): void => {
  const hasApiKey = Boolean(config.openRouterApiKey && config.openRouterApiKey.trim().length > 0);
  
  const statusResponse: SystemStatusResponse = {
    status: hasApiKey ? 'ok' : 'degraded',
    primaryModel: config.primaryModel,
    visionModel: config.visionModel,
    hasApiKey,
    uptime: Math.floor((Date.now() - startTime) / 1000)
  };

  res.json(statusResponse);
});
