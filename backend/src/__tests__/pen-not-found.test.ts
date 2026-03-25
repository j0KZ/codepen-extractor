import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), `codepen-notfound-test-${Date.now()}`);

vi.mock('../config/env.js', () => ({
  env: {
    PORT: 3098,
    PROJECTS_DIR: testDir,
    NODE_ENV: 'test',
    RATE_LIMIT_WINDOW_MS: 60000,
    RATE_LIMIT_MAX_REQUESTS: 100,
    PUPPETEER_TIMEOUT_MS: 30000,
  },
}));

// Mock puppeteer to simulate a 404 response from CodePen
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        setDefaultNavigationTimeout: vi.fn(),
        goto: vi.fn().mockResolvedValue({
          status: () => 404,
        }),
        evaluate: vi.fn(),
        close: vi.fn(),
      }),
      close: vi.fn(),
    }),
  },
}));

const { ensureIndexExists } = await import('../services/storage/projectsIndex.js');
const { ensureProjectsDir } = await import('../services/storage/fileManager.js');
const { default: app } = await import('../app.js');

const supertest = (await import('supertest')).default;

describe('PEN_NOT_FOUND', () => {
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

  it('returns 404 with PEN_NOT_FOUND when pen does not exist', async () => {
    const res = await supertest(app)
      .post('/api/extract')
      .send({ url: 'https://codepen.io/someuser/pen/xxxxxx' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PEN_NOT_FOUND');
    expect(res.body.error.message).toBeDefined();
  });

  it('returns 404 with PEN_NOT_FOUND on soft-404 (HTTP 200 with not-found heading)', async () => {
    const puppeteer = await import('puppeteer');
    const mockLaunch = vi.mocked(puppeteer.default.launch);

    // Override mock: HTTP 200 but page has a not-found heading
    const mockPage = {
      setDefaultNavigationTimeout: vi.fn(),
      goto: vi.fn().mockResolvedValue({ status: () => 200 }),
      evaluate: vi.fn().mockImplementation((fn: Function) => {
        // Simulate the soft-404 check returning true
        return Promise.resolve(true);
      }),
      close: vi.fn(),
    };
    mockLaunch.mockResolvedValueOnce({
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn(),
    } as any);

    const res = await supertest(app)
      .post('/api/extract')
      .send({ url: 'https://codepen.io/someuser/pen/yyyyyy' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PEN_NOT_FOUND');
  });
});
