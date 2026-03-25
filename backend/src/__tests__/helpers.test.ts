import { describe, it, expect } from 'vitest';
import { isValidCodePenUrl, generateProjectId, extractPenInfo } from '../utils/helpers.js';

describe('isValidCodePenUrl', () => {
  it('accepts standard CodePen URL', () => {
    expect(isValidCodePenUrl('https://codepen.io/florinpop17/pen/OPyapww')).toBe(true);
  });

  it('accepts URL with www', () => {
    expect(isValidCodePenUrl('https://www.codepen.io/user123/pen/abc123')).toBe(true);
  });

  it('accepts debug URL', () => {
    expect(isValidCodePenUrl('https://codepen.io/user/pen/abc123/debug')).toBe(true);
  });

  it('accepts URL with query params', () => {
    expect(isValidCodePenUrl('https://codepen.io/user/pen/abc123?ref=sidebar')).toBe(true);
  });

  it('rejects HTTP URL', () => {
    expect(isValidCodePenUrl('http://codepen.io/user/pen/abc123')).toBe(false);
  });

  it('rejects non-pen URL', () => {
    expect(isValidCodePenUrl('https://codepen.io/user/project/abc123')).toBe(false);
  });

  it('rejects shortened URL', () => {
    expect(isValidCodePenUrl('https://codepen.io/abc123')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidCodePenUrl('')).toBe(false);
  });

  it('rejects random URL', () => {
    expect(isValidCodePenUrl('https://example.com/pen/abc')).toBe(false);
  });
});

describe('generateProjectId', () => {
  it('generates id with pen_ prefix', () => {
    const id = generateProjectId('https://codepen.io/user/pen/abc123');
    expect(id).toMatch(/^pen_[a-f0-9]{8}$/);
  });

  it('generates same id for same URL', () => {
    const url = 'https://codepen.io/user/pen/abc123';
    expect(generateProjectId(url)).toBe(generateProjectId(url));
  });

  it('generates different ids for different URLs', () => {
    const id1 = generateProjectId('https://codepen.io/user/pen/abc123');
    const id2 = generateProjectId('https://codepen.io/user/pen/xyz789');
    expect(id1).not.toBe(id2);
  });
});

describe('extractPenInfo', () => {
  it('extracts username and penId', () => {
    const info = extractPenInfo('https://codepen.io/florinpop17/pen/OPyapww');
    expect(info).toEqual({
      username: 'florinpop17',
      penId: 'OPyapww',
      isDebug: false,
    });
  });

  it('detects debug URLs', () => {
    const info = extractPenInfo('https://codepen.io/user/pen/abc123/debug');
    expect(info).toEqual({
      username: 'user',
      penId: 'abc123',
      isDebug: true,
    });
  });

  it('handles www prefix', () => {
    const info = extractPenInfo('https://www.codepen.io/user/pen/abc123');
    expect(info).toEqual({
      username: 'user',
      penId: 'abc123',
      isDebug: false,
    });
  });

  it('returns null for invalid URL', () => {
    expect(extractPenInfo('https://example.com')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractPenInfo('')).toBeNull();
  });
});
