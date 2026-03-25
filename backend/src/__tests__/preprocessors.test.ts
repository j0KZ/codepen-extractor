import { describe, it, expect } from 'vitest';
import { detectPreprocessors } from '../services/validation/preprocessors.js';

describe('detectPreprocessors', () => {
  it('returns none for plain code', () => {
    const result = detectPreprocessors({
      html: '<div>Hello</div>',
      css: 'body { color: red; }',
      js: 'console.log("hi");',
    });
    expect(result).toEqual({ html: 'none', css: 'none', js: 'none' });
  });

  it('detects SCSS from $variables', () => {
    const result = detectPreprocessors({
      html: '',
      css: '$primary: #333;\nbody { color: $primary; }',
      js: '',
    });
    expect(result.css).toBe('scss');
  });

  it('detects SCSS from @mixin', () => {
    const result = detectPreprocessors({
      html: '',
      css: '@mixin flex-center { display: flex; }',
      js: '',
    });
    expect(result.css).toBe('scss');
  });

  it('detects TypeScript from type annotations', () => {
    const result = detectPreprocessors({
      html: '',
      css: '',
      js: 'const name: string = "hello";',
    });
    expect(result.js).toBe('typescript');
  });

  it('detects TypeScript from interface', () => {
    const result = detectPreprocessors({
      html: '',
      css: '',
      js: 'interface User { name: string; }',
    });
    expect(result.js).toBe('typescript');
  });

  it('detects Babel from import/from', () => {
    const result = detectPreprocessors({
      html: '',
      css: '',
      js: 'import React from "react";',
    });
    expect(result.js).toBe('babel');
  });

  it('detects Pug from tag(attr) syntax', () => {
    const result = detectPreprocessors({
      html: 'div(class="container")',
      css: '',
      js: '',
    });
    expect(result.html).toBe('pug');
  });

  it('handles empty strings', () => {
    const result = detectPreprocessors({ html: '', css: '', js: '' });
    expect(result).toEqual({ html: 'none', css: 'none', js: 'none' });
  });
});
