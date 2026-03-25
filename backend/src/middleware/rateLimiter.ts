import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export function rateLimiter(config?: Partial<RateLimitConfig>) {
  const windowMs = config?.windowMs ?? env.RATE_LIMIT_WINDOW_MS;
  const maxRequests = config?.maxRequests ?? env.RATE_LIMIT_MAX_REQUESTS;
  const store = new Map<string, RateLimitEntry>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      entry = {
        count: 1,
        resetAt: now + windowMs,
      };
      store.set(ip, entry);
      next();
      return;
    }

    entry.count++;

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Demasiadas solicitudes. Intenta en ' + Math.ceil(retryAfter / 60) + ' minutos',
          details: { retryAfter },
        },
      });
      return;
    }

    store.set(ip, entry);
    next();
  };
}
