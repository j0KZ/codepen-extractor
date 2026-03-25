import type { PreprocessorType } from '../../../../shared/types/index.js';

interface PreprocessorDetection {
  html: PreprocessorType;
  css: PreprocessorType;
  js: PreprocessorType;
}

export function detectPreprocessors(rawCode: {
  html: string;
  css: string;
  js: string;
}): PreprocessorDetection {
  return {
    html: detectHtmlPreprocessor(rawCode.html),
    css: detectCssPreprocessor(rawCode.css),
    js: detectJsPreprocessor(rawCode.js),
  };
}

function detectHtmlPreprocessor(html: string): PreprocessorType {
  if (!html) return 'none';

  // Pug: lines like `div.class` or `tag(attr="val")`
  if (/^[\s]*[a-z]+\([^)]*\)[\s]*$/m.test(html)) return 'pug';

  // Haml: lines starting with %tag
  if (/^%[a-z]+[(\s#.]/m.test(html)) return 'haml';

  return 'none';
}

function detectCssPreprocessor(css: string): PreprocessorType {
  if (!css) return 'none';

  // SCSS: $variables, @mixin, @include, nesting with &
  if (/\$[a-z_-]+:\s*[^;]+;|@mixin\s|@include\s/.test(css)) return 'scss';

  // LESS: @variables (but not @media, @keyframes, etc.)
  if (/@[a-z_-]+:\s*[^;]+;/.test(css) && !/@(media|keyframes|font-face|import|charset|supports)/.test(css.match(/@[a-z_-]+:/)?.[0] || '')) return 'less';

  // Stylus: no braces style with = assignments
  if (/^[a-z_-]+\s+=\s+/m.test(css)) return 'stylus';

  return 'none';
}

function detectJsPreprocessor(js: string): PreprocessorType {
  if (!js) return 'none';

  // TypeScript: type annotations, interfaces, type aliases
  if (/:\s*(string|number|boolean|any)\b|interface\s+\w+\s*\{|type\s+\w+\s*=/.test(js)) return 'typescript';

  // Babel/ES6+: import/export, arrow functions with complex params
  if (/import\s+.*\s+from\s+['"]|export\s+(default|const|function|class)\s/.test(js)) return 'babel';

  // CoffeeScript: -> operator, indentation-based
  if (/\s->\s*$|^\s*[a-z]+\s*=\s*\([^)]*\)\s*->/m.test(js)) return 'coffeescript';

  return 'none';
}
