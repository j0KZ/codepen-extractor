import { readFile, writeFile, rename, access } from 'fs/promises';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { ProjectsIndex, ProjectSummary } from '../../../../shared/types/index.js';
import { env } from '../../config/env.js';

function getIndexPath(): string {
  return join(env.PROJECTS_DIR, 'index.json');
}

export function ensureIndexExists(): void {
  if (!existsSync(env.PROJECTS_DIR)) {
    mkdirSync(env.PROJECTS_DIR, { recursive: true });
  }

  const indexPath = getIndexPath();
  if (!existsSync(indexPath)) {
    const initialIndex: ProjectsIndex = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      projects: [],
    };
    writeFileSync(indexPath, JSON.stringify(initialIndex, null, 2), 'utf-8');
  }
}

export async function readIndex(): Promise<ProjectsIndex> {
  const indexPath = getIndexPath();
  const content = await readFile(indexPath, 'utf-8');
  return JSON.parse(content) as ProjectsIndex;
}

export async function writeIndexAtomically(index: ProjectsIndex): Promise<void> {
  const tempPath = join(env.PROJECTS_DIR, 'index.json.tmp');
  const finalPath = getIndexPath();

  index.lastUpdated = new Date().toISOString();
  await writeFile(tempPath, JSON.stringify(index, null, 2), 'utf-8');
  await rename(tempPath, finalPath);
}

export async function updateIndexWithProject(
  project: ProjectSummary
): Promise<void> {
  const index = await readIndex();
  const existingIdx = index.projects.findIndex((p) => p.id === project.id);

  if (existingIdx >= 0) {
    index.projects[existingIdx] = project;
  } else {
    index.projects.push(project);
  }

  await writeIndexAtomically(index);
}

export async function removeProjectFromIndex(projectId: string): Promise<void> {
  const index = await readIndex();
  index.projects = index.projects.filter((p) => p.id !== projectId);
  await writeIndexAtomically(index);
}
