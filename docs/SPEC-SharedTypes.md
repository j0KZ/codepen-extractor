# SPEC - SharedTypes

> Especificación para tipos compartidos entre frontend y backend

## Propósito

Centralizar tipos usados por múltiples partes del sistema para evitar duplicación y asegurar consistencia.

## Ubicación

```
shared/types/index.ts
```

Opcional: distribuir como paquete npm para mayor control de versiones.

## Tipos Principales

### ProjectSummary

```typescript
interface ProjectSummary {
  id: string;
  name: string;
  url: string;
  author: string;
  authorUrl?: string;
  extractedAt: string;
  license: string;
  hasCode: boolean;
  hasVariations: boolean;
  status: 'complete' | 'partial' | 'failed';
}
```

### ProjectMetadata

```typescript
interface ProjectMetadata {
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
  status: 'complete' | 'partial' | 'failed';
  errorMessage?: string;
  variations?: VariationSummary[];
}
```

### PreprocessorType

```typescript
type PreprocessorType =
  | 'none'
  | 'scss'
  | 'less'
  | 'stylus'
  | 'pug'
  | 'haml'
  | 'babel'
  | 'typescript'
  | 'coffeescript';
```

### VariationSummary

```typescript
interface VariationSummary {
  id: string;
  name: string;
  createdAt: string;
  description?: string;
}
```

### ProjectCode

```typescript
interface ProjectCode {
  html: string;
  css?: string;
  js?: string;
}
```

### ProjectWithCode

```typescript
interface ProjectWithCode extends ProjectSummary {
  code: ProjectCode;
  dependencies: string[];
  preprocessors: ProjectMetadata['preprocessors'];
}
```

## Tipos de API

### ApiError

```typescript
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

### ExtractResponse

```typescript
interface ExtractResponse {
  success: true;
  project: ProjectSummary;
}
```

### TransformStatusResponse

```typescript
interface TransformStatusResponse {
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  result?: {
    variationId: string;
    description: string;
  };
  error?: string;
}
```

### GetProjectsResponse

```typescript
interface GetProjectsResponse {
  projects: ProjectSummary[];
  total: number;
}
```

### HealthResponse

```typescript
interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  version: string;
  services: {
    filesystem: 'ok' | 'error';
    puppeteer: 'ok' | 'error';
    mcp: 'ok' | 'error' | 'not_configured';
  };
}
```

## Enums

```typescript
// Estados de extracción
type ExtractionStatus = 'idle' | 'validating' | 'extracting' | 'success' | 'error';

// Estados de chat con Claude
type ChatStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Estados de transformación
type TransformStatus = 'queued' | 'processing' | 'completed' | 'failed';
```

## Notas de Implementación

1. Usar `type` en lugar de `interface` donde sea apropiado para mayor flexibilidad
2. Exportar cada tipo individualmente para tree-shaking
3. Incluir JSDoc para documentación automática
4. Mantener sincronizado con Typescript del frontend

---

**Referencia**: Architecture.md, IMPLEMENTATION-SPEC.md sección 1
