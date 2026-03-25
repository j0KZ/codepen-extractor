import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), `codepen-id-test-${Date.now()}`);

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

vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn().mockRejectedValue(new Error('Puppeteer mocked in tests')),
  },
}));

const { ensureIndexExists } = await import('../services/storage/projectsIndex.js');
const { ensureProjectsDir } = await import('../services/storage/fileManager.js');
const { default: app } = await import('../app.js');

const supertest = (await import('supertest')).default;

describe('GET /api/projects/:id - project ID validation', () => {
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

  it('rejects ID with dot-dot sequences', async () => {
    const res = await supertest(app).get('/api/projects/..%2F..%2Fetc');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PROJECT_ID');
  });

  it('rejects IDs that do not match pen_[a-f0-9]{8}', async () => {
    const res = await supertest(app).get('/api/projects/not_a_valid_id');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PROJECT_ID');
  });

  it('rejects IDs with uppercase hex', async () => {
    const res = await supertest(app).get('/api/projects/pen_AABBCCDD');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PROJECT_ID');
  });

  it('rejects IDs with wrong length', async () => {
    const res = await supertest(app).get('/api/projects/pen_abc');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PROJECT_ID');
  });

  it('rejects IDs with too many hex chars', async () => {
    const res = await supertest(app).get('/api/projects/pen_a1b2c3d4e5');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PROJECT_ID');
  });

  it('rejects plain traversal string', async () => {
    const res = await supertest(app).get('/api/projects/..%5C..%5Cwindows');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PROJECT_ID');
  });

  it('accepts valid project ID format (returns 404 if not found)', async () => {
    const res = await supertest(app).get('/api/projects/pen_a1b2c3d4');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PROJECT_NOT_FOUND');
  });
});
