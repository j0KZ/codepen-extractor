import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), `codepen-api-test-${Date.now()}`);

vi.mock('../config/env.js', () => ({
  env: {
    PORT: 3099,
    PROJECTS_DIR: testDir,
    NODE_ENV: 'test',
    RATE_LIMIT_WINDOW_MS: 60000,
    RATE_LIMIT_MAX_REQUESTS: 100,
    PUPPETEER_TIMEOUT_MS: 30000,
  },
}));

// Mock puppeteer to avoid actual browser launches during tests
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn().mockRejectedValue(new Error('Puppeteer mocked in tests')),
  },
}));

const { ensureIndexExists } = await import('../services/storage/projectsIndex.js');
const { ensureProjectsDir } = await import('../services/storage/fileManager.js');
const { default: app } = await import('../app.js');

// Dynamic import of supertest
const supertest = (await import('supertest')).default;

describe('API endpoints', () => {
  beforeAll(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
    ensureProjectsDir();
    ensureIndexExists();
  });

  afterAll(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('GET /api/health', () => {
    it('returns health status', async () => {
      const res = await supertest(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.version).toBe('0.1.0');
      expect(res.body.services).toBeDefined();
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/projects', () => {
    it('returns empty project list', async () => {
      const res = await supertest(app).get('/api/projects');
      expect(res.status).toBe(200);
      expect(res.body.projects).toEqual([]);
      expect(res.body.total).toBe(0);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('returns 404 for unknown project', async () => {
      const res = await supertest(app).get('/api/projects/pen_nonexist');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PROJECT_NOT_FOUND');
    });
  });

  describe('POST /api/extract', () => {
    it('returns 400 for invalid URL', async () => {
      const res = await supertest(app)
        .post('/api/extract')
        .send({ url: 'not-a-valid-url' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_URL');
    });

    it('returns 400 for missing URL', async () => {
      const res = await supertest(app)
        .post('/api/extract')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_URL');
    });

    it('returns 400 for non-CodePen URL', async () => {
      const res = await supertest(app)
        .post('/api/extract')
        .send({ url: 'https://example.com/pen/abc123' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_URL');
    });
  });
});
