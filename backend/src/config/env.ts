import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  PROJECTS_DIR: resolve(process.env.PROJECTS_DIR || '../proyectos'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10),
  PUPPETEER_TIMEOUT_MS: parseInt(process.env.PUPPETEER_TIMEOUT_MS || '30000', 10),
} as const;
