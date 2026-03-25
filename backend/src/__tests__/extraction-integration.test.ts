import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), `codepen-extract-test-${Date.now()}`);

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

const SAMPLE_HTML = '<div class="container"><h1>Hello World</h1></div>';
const SAMPLE_CSS = '.container { max-width: 800px; margin: 0 auto; }';
const SAMPLE_JS = 'console.log("hello from pen");';

const mockPage = {
  setDefaultNavigationTimeout: vi.fn(),
  goto: vi.fn().mockResolvedValue({ status: () => 200 }),
  evaluate: vi.fn(),
  close: vi.fn(),
};

const mockBrowser = {
  newPage: vi.fn().mockResolvedValue(mockPage),
  close: vi.fn(),
};

vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn().mockResolvedValue(mockBrowser),
  },
}));

// Setup page.evaluate to return code on first call, metadata on second
mockPage.evaluate
  .mockResolvedValueOnce({
    html: SAMPLE_HTML,
    css: SAMPLE_CSS,
    js: SAMPLE_JS,
    dependencies: ['https://cdn.example.com/lib.js'],
  })
  .mockResolvedValueOnce({
    title: 'Test Pen Title',
    author: undefined,
    authorUrl: undefined,
  });

const { ensureIndexExists } = await import('../services/storage/projectsIndex.js');
const { ensureProjectsDir } = await import('../services/storage/fileManager.js');
const { default: app } = await import('../app.js');

const supertest = (await import('supertest')).default;

describe('POST /api/extract - happy path integration', () => {
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

  it('extracts a pen and saves files to disk', async () => {
    const penUrl = 'https://codepen.io/testuser/pen/AbCdEf';

    const res = await supertest(app)
      .post('/api/extract')
      .send({ url: penUrl });

    expect(res.status).toBe(201);

    // Verify response shape matches ExtractResponse / ProjectSummary
    const body = res.body;
    expect(body.success).toBe(true);
    expect(body.project).toBeDefined();

    const project = body.project;
    expect(project.id).toMatch(/^pen_[a-f0-9]{8}$/);
    expect(project.name).toBe('Test Pen Title');
    expect(project.url).toBe(penUrl);
    expect(project.author).toBe('testuser');
    expect(project.authorUrl).toBe('https://codepen.io/testuser');
    expect(project.extractedAt).toBeDefined();
    expect(project.license).toBe('MIT');
    expect(project.hasCode).toBe(true);
    expect(project.hasVariations).toBe(false);
    expect(project.status).toBe('complete');

    // Verify files written to disk
    const projectDir = join(testDir, project.id);
    expect(existsSync(projectDir)).toBe(true);
    expect(readFileSync(join(projectDir, 'index.html'), 'utf-8')).toBe(SAMPLE_HTML);
    expect(readFileSync(join(projectDir, 'style.css'), 'utf-8')).toBe(SAMPLE_CSS);
    expect(readFileSync(join(projectDir, 'script.js'), 'utf-8')).toBe(SAMPLE_JS);
    expect(existsSync(join(projectDir, 'metadata.json'))).toBe(true);
    expect(existsSync(join(projectDir, 'LICENSE'))).toBe(true);

    // Verify metadata.json content
    const metadata = JSON.parse(readFileSync(join(projectDir, 'metadata.json'), 'utf-8'));
    expect(metadata.id).toBe(project.id);
    expect(metadata.dependencies).toContain('https://cdn.example.com/lib.js');
    expect(metadata.files.html).toBe('index.html');
    expect(metadata.files.css).toBe('style.css');
    expect(metadata.files.js).toBe('script.js');

    // Verify index.json was updated
    const index = JSON.parse(readFileSync(join(testDir, 'index.json'), 'utf-8'));
    const indexed = index.projects.find((p: { id: string }) => p.id === project.id);
    expect(indexed).toBeDefined();
    expect(indexed.name).toBe('Test Pen Title');
  });
});
