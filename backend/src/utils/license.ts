import { DEFAULT_LICENSE } from '../../../shared/constants.js';

export function generateLicense(author: string, url: string, year?: number): string {
  const y = year ?? new Date().getFullYear();
  return DEFAULT_LICENSE
    .replace('{{year}}', String(y))
    .replace('{{author}}', author)
    .replace('{{url}}', url);
}
