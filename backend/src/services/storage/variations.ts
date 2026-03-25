import fs from 'node:fs/promises';
import path from 'node:path';
import type { Variation, VariationSummary, SaveVariationInput } from '../../../../shared/types/index.js';
import { ApiError, NotFoundError } from '../../utils/errors.js';

export async function assertProjectExists(
  projectsDir: string,
  projectId: string,
): Promise<void> {
  const metadataPath = path.join(projectsDir, projectId, 'metadata.json');
  try {
    await fs.access(metadataPath);
  } catch {
    throw new NotFoundError('PROJECT_NOT_FOUND', `Project ${projectId} not found`);
  }
}

export async function listVariations(
  projectsDir: string,
  projectId: string,
): Promise<VariationSummary[]> {
  const variationsDir = path.join(projectsDir, projectId, 'variations');

  let entries: string[];
  try {
    const dirEntries = await fs.readdir(variationsDir, { withFileTypes: true });
    entries = dirEntries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }

  const summaries: VariationSummary[] = [];

  for (const entry of entries) {
    try {
      const metadataPath = path.join(variationsDir, entry, 'metadata.json');
      const raw = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(raw);
      summaries.push({
        id: metadata.id,
        name: metadata.name,
        createdAt: metadata.createdAt,
        description: metadata.description,
      });
    } catch {
      // skip corrupted variations
    }
  }

  summaries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return summaries;
}

export async function getVariation(
  projectsDir: string,
  projectId: string,
  variationId: string,
): Promise<Variation | null> {
  const variationDir = path.join(projectsDir, projectId, 'variations', variationId);

  let metadataRaw: string;
  try {
    metadataRaw = await fs.readFile(path.join(variationDir, 'metadata.json'), 'utf-8');
  } catch {
    return null;
  }

  const metadata = JSON.parse(metadataRaw);

  let html: string;
  try {
    html = await fs.readFile(path.join(variationDir, 'index.html'), 'utf-8');
  } catch {
    html = '';
  }

  let css: string | undefined;
  try {
    css = await fs.readFile(path.join(variationDir, 'style.css'), 'utf-8');
  } catch {
    css = undefined;
  }

  let js: string | undefined;
  try {
    js = await fs.readFile(path.join(variationDir, 'script.js'), 'utf-8');
  } catch {
    js = undefined;
  }

  return {
    id: metadata.id,
    projectId: metadata.projectId,
    name: metadata.name,
    createdAt: metadata.createdAt,
    description: metadata.description,
    code: { html, css, js },
    isPreferred: metadata.isPreferred,
  };
}

export async function saveVariation(
  projectsDir: string,
  projectId: string,
  data: SaveVariationInput,
): Promise<string> {
  const variationsDir = path.join(projectsDir, projectId, 'variations');
  await fs.mkdir(variationsDir, { recursive: true });

  let variationId: string | null = null;
  let variationDir: string = '';

  for (let attempt = 0; attempt < 3; attempt++) {
    const candidateId = `${projectId}_v${Date.now()}`;
    const candidateDir = path.join(variationsDir, candidateId);

    try {
      await fs.access(candidateDir);
      // dir exists, collision — wait and retry
      await new Promise((r) => setTimeout(r, 1));
      continue;
    } catch {
      // dir doesn't exist, good
      variationId = candidateId;
      variationDir = candidateDir;
      break;
    }
  }

  if (!variationId) {
    throw new ApiError(409, 'VARIATION_ID_COLLISION', 'Could not generate unique variation ID after 3 attempts');
  }

  await fs.mkdir(variationDir, { recursive: true });

  const now = new Date().toISOString();
  const metadata = {
    id: variationId,
    projectId,
    name: data.name,
    createdAt: now,
    description: data.description,
    isPreferred: data.isPreferred ?? false,
  };

  await fs.writeFile(path.join(variationDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
  await fs.writeFile(path.join(variationDir, 'index.html'), data.code.html);

  if (data.code.css !== undefined) {
    await fs.writeFile(path.join(variationDir, 'style.css'), data.code.css);
  }

  if (data.code.js !== undefined) {
    await fs.writeFile(path.join(variationDir, 'script.js'), data.code.js);
  }

  return variationId;
}

export async function deleteVariation(
  projectsDir: string,
  projectId: string,
  variationId: string,
): Promise<boolean> {
  const variationDir = path.join(projectsDir, projectId, 'variations', variationId);

  try {
    await fs.rm(variationDir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

export async function setPreferredVariation(
  projectsDir: string,
  projectId: string,
  variationId: string,
): Promise<void> {
  const variation = await getVariation(projectsDir, projectId, variationId);
  if (!variation) {
    throw new NotFoundError('VARIATION_NOT_FOUND', `Variation ${variationId} not found`);
  }

  const projectDir = path.join(projectsDir, projectId);

  await fs.writeFile(path.join(projectDir, 'index.html'), variation.code.html);

  if (variation.code.css !== undefined) {
    await fs.writeFile(path.join(projectDir, 'style.css'), variation.code.css);
  }

  if (variation.code.js !== undefined) {
    await fs.writeFile(path.join(projectDir, 'script.js'), variation.code.js);
  }

  // Update project metadata to mark preferred variation
  const metadataPath = path.join(projectDir, 'metadata.json');
  try {
    const raw = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(raw);
    metadata.preferredVariation = variationId;
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  } catch {
    // metadata update is best-effort
  }
}
