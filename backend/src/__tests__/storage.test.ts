import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// We need to override the env before importing storage modules
const testDir = join(tmpdir(), `codepen-test-${Date.now()}`);

// Mock env before importing
import { vi } from 'vitest';
vi.mock('../config/env.js', () => ({
  env: {
    PORT: 3001,
    PROJECTS_DIR: testDir,
    NODE_ENV: 'test',
    RATE_LIMIT_WINDOW_MS: 60000,
    RATE_LIMIT_MAX_REQUESTS: 10,
    PUPPETEER_TIMEOUT_MS: 30000,
  },
}));

// Now import the modules that depend on env
const { ensureIndexExists, readIndex, writeIndexAtomically } = await import(
  '../services/storage/projectsIndex.js'
);

describe('Storage - Projects Index', () => {
  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('creates index.json if it does not exist', () => {
    ensureIndexExists();
    const indexPath = join(testDir, 'index.json');
    expect(existsSync(indexPath)).toBe(true);

    const content = JSON.parse(readFileSync(indexPath, 'utf-8'));
    expect(content.version).toBe(1);
    expect(content.projects).toEqual([]);
  });

  it('does not overwrite existing index.json', () => {
    ensureIndexExists();
    const indexPath = join(testDir, 'index.json');

    // Read original
    const original = readFileSync(indexPath, 'utf-8');

    // Call again
    ensureIndexExists();
    const after = readFileSync(indexPath, 'utf-8');

    expect(after).toBe(original);
  });

  it('reads and writes index atomically', async () => {
    ensureIndexExists();

    const index = await readIndex();
    expect(index.version).toBe(1);
    expect(index.projects).toEqual([]);

    // Write with a project
    index.projects.push({
      id: 'pen_test1234',
      name: 'Test Pen',
      url: 'https://codepen.io/user/pen/abc',
      author: 'testuser',
      extractedAt: new Date().toISOString(),
      license: 'MIT',
      hasCode: true,
      hasVariations: false,
      status: 'complete',
    });

    await writeIndexAtomically(index);

    // Read back
    const updated = await readIndex();
    expect(updated.projects).toHaveLength(1);
    expect(updated.projects[0].id).toBe('pen_test1234');

    // Temp file should not exist
    expect(existsSync(join(testDir, 'index.json.tmp'))).toBe(false);
  });
});
