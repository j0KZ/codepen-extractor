import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from '../config/env.js';

const PROJECT_ID_RE = /^pen_[a-f0-9]{8}$/;

export function isValidProjectId(id: string): boolean {
  return PROJECT_ID_RE.test(id);
}

export function projectExists(projectId: string): boolean {
  if (!isValidProjectId(projectId)) return false;

  const projectPath = resolve(env.PROJECTS_DIR, projectId);

  // Path traversal guard
  if (!projectPath.startsWith(resolve(env.PROJECTS_DIR))) return false;

  return existsSync(projectPath);
}
