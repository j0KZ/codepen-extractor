import { Router } from 'express';
import { existsSync } from 'fs';
import type { HealthResponse } from '../../../shared/types/index.js';
import { env } from '../config/env.js';

const router = Router();

router.get('/', (_req, res) => {
  const filesystemOk = existsSync(env.PROJECTS_DIR);

  const health: HealthResponse = {
    status: filesystemOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    services: {
      filesystem: filesystemOk ? 'ok' : 'error',
      puppeteer: 'ok',
      mcp: 'not_configured',
    },
  };

  res.json(health);
});

export default router;
