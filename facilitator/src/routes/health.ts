import { Router, Request, Response } from 'express';
import { HealthStatus } from '../types';

let startTime = Date.now();

export function HealthRouter(): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);

    const healthStatus: HealthStatus = {
      status: 'healthy',
      uptime,
      version: '1.0.0'
    };

    res.json(healthStatus);
  });

  return router;
}

