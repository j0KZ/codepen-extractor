import { existsSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_ID_RE = /^pen_[a-f0-9]{8}$/;

const PROJECTS_DIR = resolve(
  process.env.PROJECTS_DIR || resolve(__dirname, "../../../proyectos")
);

export function isValidProjectId(id: string): boolean {
  return PROJECT_ID_RE.test(id);
}

export function projectExists(projectId: string): boolean {
  if (!isValidProjectId(projectId)) return false;

  const projectPath = resolve(PROJECTS_DIR, projectId);

  // Path traversal guard
  if (!projectPath.startsWith(PROJECTS_DIR)) return false;

  return existsSync(projectPath);
}
