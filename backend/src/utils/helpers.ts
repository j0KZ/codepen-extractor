import { createHash } from 'crypto';
import { CODEPEN_URL_REGEX } from '../../../shared/constants.js';

export function generateProjectId(url: string): string {
  const hash = createHash('sha256').update(url).digest('hex');
  return `pen_${hash.slice(0, 8)}`;
}

export function isValidCodePenUrl(url: string): boolean {
  return CODEPEN_URL_REGEX.test(url);
}

export function extractPenInfo(url: string): { username: string; penId: string; isDebug: boolean } | null {
  const match = url.match(
    /^https:\/\/(www\.)?codepen\.io\/([a-zA-Z0-9_-]+)\/pen\/([a-zA-Z0-9]+)(\/debug)?/
  );
  if (!match) return null;

  return {
    username: match[2],
    penId: match[3],
    isDebug: !!match[4],
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
