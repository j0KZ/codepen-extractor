import { readFile, writeFile, mkdir, rm, access } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { ProjectCode, ProjectMetadata } from '../../../../shared/types/index.js';
import { env } from '../../config/env.js';

export function ensureProjectsDir(): void {
  if (!existsSync(env.PROJECTS_DIR)) {
    mkdirSync(env.PROJECTS_DIR, { recursive: true });
  }
}

export async function saveProjectFiles(
  projectId: string,
  code: ProjectCode,
  metadata: ProjectMetadata
): Promise<void> {
  const projectDir = join(env.PROJECTS_DIR, projectId);
  const tempDir = join(env.PROJECTS_DIR, `.tmp_${projectId}`);

  try {
    // Write to temp directory first
    await mkdir(tempDir, { recursive: true });

    await writeFile(join(tempDir, 'index.html'), code.html, 'utf-8');
    if (code.css) {
      await writeFile(join(tempDir, 'style.css'), code.css, 'utf-8');
    }
    if (code.js) {
      await writeFile(join(tempDir, 'script.js'), code.js, 'utf-8');
    }
    await writeFile(
      join(tempDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );

    // Remove existing project dir if it exists
    if (existsSync(projectDir)) {
      await rm(projectDir, { recursive: true, force: true });
    }

    // Atomic move: rename temp to final
    const { rename } = await import('fs/promises');
    await rename(tempDir, projectDir);
  } catch (error) {
    // Cleanup temp directory on failure
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

export async function readProjectFiles(
  projectId: string
): Promise<{ code: ProjectCode; metadata: ProjectMetadata }> {
  const projectDir = join(env.PROJECTS_DIR, projectId);

  const html = await readFile(join(projectDir, 'index.html'), 'utf-8');

  let css: string | undefined;
  try {
    css = await readFile(join(projectDir, 'style.css'), 'utf-8');
  } catch {
    // CSS file is optional
  }

  let js: string | undefined;
  try {
    js = await readFile(join(projectDir, 'script.js'), 'utf-8');
  } catch {
    // JS file is optional
  }

  const metadataRaw = await readFile(
    join(projectDir, 'metadata.json'),
    'utf-8'
  );
  const metadata = JSON.parse(metadataRaw) as ProjectMetadata;

  return { code: { html, css, js }, metadata };
}

export async function deleteProjectFiles(projectId: string): Promise<void> {
  const projectDir = join(env.PROJECTS_DIR, projectId);
  await rm(projectDir, { recursive: true, force: true });
}

export function projectDirExists(projectId: string): boolean {
  return existsSync(join(env.PROJECTS_DIR, projectId));
}
