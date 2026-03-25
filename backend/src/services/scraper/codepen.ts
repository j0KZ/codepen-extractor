import puppeteer from 'puppeteer';
import type { ProjectCode, ProjectSummary, ProjectMetadata } from '../../../../shared/types/index.js';
import { extractPenInfo, generateProjectId, sleep } from '../../utils/helpers.js';
import { ExtractionError, NotFoundError, ValidationError } from '../../utils/errors.js';
import { detectPreprocessors } from '../validation/preprocessors.js';
import { generateLicense } from '../../utils/license.js';
import { saveProjectFiles } from '../storage/fileManager.js';
import { updateIndexWithProject } from '../storage/projectsIndex.js';
import { env } from '../../config/env.js';

interface ExtractedCode {
  html: string;
  css: string;
  js: string;
  dependencies: string[];
  metadata: {
    title?: string;
    author?: string;
    authorUrl?: string;
  };
}

async function extractPen(url: string): Promise<ExtractedCode> {
  const penInfo = extractPenInfo(url);
  if (!penInfo) {
    throw new ValidationError('INVALID_URL', 'URL de CodePen invalida');
  }

  const debugUrl = `https://codepen.io/${penInfo.username}/pen/${penInfo.penId}/debug`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(env.PUPPETEER_TIMEOUT_MS);

    const response = await page.goto(debugUrl, { waitUntil: 'networkidle0' });

    if (!response || response.status() === 404) {
      throw new NotFoundError('PEN_NOT_FOUND', 'El Pen no existe o es privado');
    }

    // Detect CodePen's "not found" page (returns 200 but shows error content)
    const is404Page = await page.evaluate(() => {
      const title = document.title?.toLowerCase() || '';
      const body = document.body?.textContent?.toLowerCase() || '';
      return title.includes('404') || body.includes('this pen doesn') || body.includes('item not found');
    });

    if (is404Page) {
      throw new NotFoundError('PEN_NOT_FOUND', 'El Pen no existe o es privado');
    }

    // Extract code from the debug page
    const code = await page.evaluate(() => {
      // The debug view renders the pen directly — the body IS the pen content
      const html = document.body.innerHTML || '';

      // Extract CSS from style tags
      const styles = document.querySelectorAll('style');
      const css = Array.from(styles)
        .map((s) => s.textContent || '')
        .filter((t) => t.trim())
        .join('\n');

      // Extract inline JS from script tags without src
      const scripts = document.querySelectorAll('script:not([src])');
      const js = Array.from(scripts)
        .map((s) => s.textContent || '')
        .filter((t) => t.trim())
        .join('\n');

      // Extract dependencies
      const dependencies: string[] = [];
      document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
        const href = link.getAttribute('href');
        if (href) dependencies.push(href);
      });
      document.querySelectorAll('script[src]').forEach((script) => {
        const src = script.getAttribute('src');
        if (src) dependencies.push(src);
      });

      return { html, css, js, dependencies };
    });

    // Extract metadata from page title / meta tags
    const metadata = await page.evaluate(() => {
      const title = document.title?.replace(/ - CodePen$/i, '').trim() || undefined;
      return {
        title,
        author: undefined as string | undefined,
        authorUrl: undefined as string | undefined,
      };
    });

    // Fallback author from URL
    if (!metadata.author) {
      metadata.author = penInfo.username;
      metadata.authorUrl = `https://codepen.io/${penInfo.username}`;
    }

    // Normalize dependency URLs
    const absoluteDependencies = code.dependencies.map((dep) => {
      if (dep.startsWith('http')) return dep;
      if (dep.startsWith('//')) return 'https:' + dep;
      return `https://codepen.io${dep}`;
    });

    return {
      html: code.html,
      css: code.css,
      js: code.js,
      dependencies: absoluteDependencies,
      metadata,
    };
  } finally {
    await browser.close();
  }
}

async function extractWithRetry(url: string, retries: number = 3): Promise<ExtractedCode> {
  let lastError: Error = new Error('Unknown extraction error');

  for (let i = 0; i < retries; i++) {
    try {
      return await extractPen(url);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry validation errors, not-found, or non-transient extraction errors
      if (error instanceof ValidationError) throw error;
      if (error instanceof NotFoundError) throw error;
      if (error instanceof ExtractionError) throw error;

      // Exponential backoff: 1s, 2s, 4s
      if (i < retries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

export async function extractAndSave(url: string): Promise<ProjectSummary> {
  const projectId = generateProjectId(url);
  const penInfo = extractPenInfo(url);
  if (!penInfo) {
    throw new ValidationError('INVALID_URL', 'URL de CodePen invalida');
  }

  try {
    const extracted = await extractWithRetry(url);

    const preprocessors = detectPreprocessors({
      html: extracted.html,
      css: extracted.css,
      js: extracted.js,
    });

    const now = new Date().toISOString();
    const author = extracted.metadata.author || penInfo.username;
    const name = extracted.metadata.title || `Pen ${penInfo.penId}`;

    const code: ProjectCode = {
      html: extracted.html,
      css: extracted.css || undefined,
      js: extracted.js || undefined,
    };

    const license = generateLicense(author, url);

    const metadata: ProjectMetadata = {
      id: projectId,
      name,
      url,
      author,
      authorUrl: extracted.metadata.authorUrl || `https://codepen.io/${penInfo.username}`,
      license: 'MIT',
      extractedAt: now,
      preprocessors,
      dependencies: extracted.dependencies,
      files: {
        html: 'index.html',
        css: code.css ? 'style.css' : undefined,
        js: code.js ? 'script.js' : undefined,
      },
      status: 'complete',
    };

    await saveProjectFiles(projectId, code, metadata);

    // Write LICENSE file separately
    const { writeFile } = await import('fs/promises');
    const { join } = await import('path');
    await writeFile(
      join(env.PROJECTS_DIR, projectId, 'LICENSE'),
      license,
      'utf-8'
    );

    const summary: ProjectSummary = {
      id: projectId,
      name,
      url,
      author,
      authorUrl: metadata.authorUrl,
      extractedAt: now,
      license: 'MIT',
      hasCode: true,
      hasVariations: false,
      status: 'complete',
    };

    await updateIndexWithProject(summary);

    return summary;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    if (error instanceof NotFoundError) throw error;
    if (error instanceof ExtractionError) throw error;

    throw new ExtractionError(
      'EXTRACTION_FAILED',
      'Error al extraer el Pen',
      url,
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}
