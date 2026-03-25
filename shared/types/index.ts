export type PreprocessorType =
  | 'none'
  | 'scss'
  | 'less'
  | 'stylus'
  | 'pug'
  | 'haml'
  | 'babel'
  | 'typescript'
  | 'coffeescript';

export type ProjectStatus = 'complete' | 'partial' | 'failed';

export type ExtractionStatus = 'idle' | 'validating' | 'extracting' | 'success' | 'error';

export interface ProjectSummary {
  id: string;
  name: string;
  url: string;
  author: string;
  authorUrl?: string;
  extractedAt: string;
  license: string;
  hasCode: boolean;
  hasVariations: boolean;
  status: ProjectStatus;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  url: string;
  author: string;
  authorUrl?: string;
  license: string;
  licenseUrl?: string;
  createdAt?: string;
  extractedAt: string;
  preprocessors: {
    html: PreprocessorType;
    css: PreprocessorType;
    js: PreprocessorType;
  };
  dependencies: string[];
  files: {
    html: string;
    css?: string;
    js?: string;
  };
  status: ProjectStatus;
  errorMessage?: string;
  variations?: VariationSummary[];
}

export interface VariationSummary {
  id: string;
  name: string;
  createdAt: string;
  description?: string;
}

export interface Variation {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  description?: string;
  code: {
    html: string;
    css?: string;
    js?: string;
  };
  isPreferred?: boolean;
}

export interface SaveVariationInput {
  name: string;
  description?: string;
  code: {
    html: string;
    css?: string;
    js?: string;
  };
  isPreferred?: boolean;
}

export interface ProjectCode {
  html: string;
  css?: string;
  js?: string;
}

export interface ProjectWithCode extends ProjectSummary {
  code: ProjectCode;
  dependencies: string[];
  preprocessors: ProjectMetadata['preprocessors'];
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  version: string;
  services: {
    filesystem: 'ok' | 'error';
    puppeteer: 'ok' | 'error';
    mcp: 'ok' | 'error' | 'not_configured';
  };
}

export interface GetProjectsResponse {
  projects: ProjectSummary[];
  total: number;
}

export interface GetProjectResponse {
  project: ProjectWithCode;
}

export interface ExtractRequest {
  url: string;
}

export interface ExtractResponse {
  success: true;
  project: ProjectSummary;
}

export interface ProjectsIndex {
  version: number;
  lastUpdated: string;
  projects: ProjectSummary[];
}
