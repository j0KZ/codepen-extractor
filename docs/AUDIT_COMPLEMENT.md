# Auditoría y Complementos - CodePen Extractor

> Este documento complementa IMPLEMENTATION-SPEC.md con los vacíos encontrados durante la auditoría.

---

## 1. Componentes Frontend - Decisión Final

### Pattern a Usar: ExtractorPanel Unificado

**Decisión**: Usar componente unificado según IMPLEMENTATION-SPEC.md, NO componentes separados.

```typescript
// CORRECTO (según spec):
frontend/src/components/Extractor/
└── ExtractorPanel.tsx   // Unificado

// INCORRECTO (según scaffold original):
frontend/src/components/Extractor/
├── URLInput.tsx
├── ExtractButton.tsx
└── ExtractStatus.tsx
```

### Rationale
- Mejor cohesión de estado
- Menos props drilling
- Más fácil de testear
- Consistent con el patrón de Context API

---

## 2. ClaudeContext - Especificación

### frontend/src/context/ClaudeContext.tsx

```typescript
import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export interface ClaudeMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ClaudeState {
  isConnected: boolean;
  isProcessing: boolean;
  messages: ClaudeMessage[];
  error?: string;
}

export interface ClaudeContextValue extends ClaudeState {
  sendMessage: (content: string, projectId?: string) => Promise<void>;
  clearMessages: () => void;
}

const ClaudeContext = createContext<ClaudeContextValue | null>(null);

interface ClaudeProviderProps {
  children: ReactNode;
}

export function ClaudeProvider({ children }: ClaudeProviderProps) {
  const [state, setState] = useState<ClaudeState>({
    isConnected: false,
    isProcessing: false,
    messages: [],
  });

  const sendMessage = useCallback(async (content: string, projectId?: string) => {
    // Agregar mensaje del usuario
    const userMessage: ClaudeMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    setState(prev => ({
      ...prev,
      isProcessing: true,
      messages: [...prev.messages, userMessage],
    }));

    try {
      // TODO: Implementar según sección 2.3 de IMPLEMENTATION-SPEC.md
      // Llamar al backend para transformar
      // Actualizar estado con respuesta
    } catch (error) {
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }));
    }
  }, []);

  const clearMessages = useCallback(() => {
    setState(prev => ({ ...prev, messages: [], error: undefined }));
  }, []);

  return (
    <ClaudeContext.Provider value={{ ...state, sendMessage, clearMessages }}>
      {children}
    </ClaudeContext.Provider>
  );
}

export function useClaude(): ClaudeContextValue {
  const context = useContext(ClaudeContext);
  if (!context) {
    throw new Error('useClaude must be used within a ClaudeProvider');
  }
  return context;
}
```

---

## 3. useTransformPolling - Especificación

### frontend/src/hooks/useTransformPolling.ts

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../services/api';

export interface TransformStatus {
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  result?: {
    variationId: string;
    description: string;
  };
  error?: string;
}

export interface UseTransformPollingOptions {
  onProgress?: (progress: number) => void;
  onComplete?: (result: TransformStatus['result']) => void;
  onError?: (error: string) => void;
}

export interface UseTransformPollingReturn {
  status: TransformStatus | null;
  isPolling: boolean;
  startPolling: (projectId: string, conversationId: string) => void;
  stopPolling: () => void;
}

/**
 * Hook para hacer polling del estado de una transformación
 * @param options - Callbacks para progress, complete y error
 * @returns Estado y funciones de control
 */
export function useTransformPolling(
  options: UseTransformPollingOptions = {}
): UseTransformPollingReturn {
  const [status, setStatus] = useState<TransformStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const POLLING_CONFIG = {
    intervalMs: 2000,
    timeoutMs: 300000, // 5 minutos
  };

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const startPolling = useCallback((projectId: string, conversationId: string) => {
    setIsPolling(true);
    setStatus({ status: 'processing', progress: 0 });
    startTimeRef.current = Date.now();

    const poll = async () => {
      const elapsed = Date.now() - startTimeRef.current;

      if (elapsed > POLLING_CONFIG.timeoutMs) {
        const errorMsg = 'Tiempo de transformación agotado';
        setStatus({ status: 'failed', error: errorMsg });
        setIsPolling(false);
        options.onError?.(errorMsg);
        return;
      }

      try {
        const response = await api.get(
          `/transform/${projectId}/status/${conversationId}`
        );
        const data: TransformStatus = response.data;

        if (data.progress !== undefined) {
          setStatus(prev => prev ? { ...prev, progress: data.progress } : null);
          options.onProgress?.(data.progress);
        }

        if (data.status === 'completed') {
          setStatus(data);
          setIsPolling(false);
          options.onComplete?.(data.result);
        } else if (data.status === 'failed') {
          setStatus(data);
          setIsPolling(false);
          options.onError?.(data.error || 'Transformación fallida');
        } else {
          // Continuar polleando
          intervalRef.current = setTimeout(poll, POLLING_CONFIG.intervalMs);
        }
      } catch (error) {
        const errorMsg = 'Error al obtener estado';
        setStatus({ status: 'failed', error: errorMsg });
        setIsPolling(false);
        options.onError?.(errorMsg);
      }
    };

    poll();
  }, [options]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, []);

  return {
    status,
    isPolling,
    startPolling,
    stopPolling,
  };
}
```

---

## 4. Routes de Transform - Especificación

### backend/src/routes/transform.ts

```typescript
import { Router, Request, Response } from 'express';
import { createTransformJob, getTransformStatus } from '../services/transform/transformHandler';

const router = Router();

/**
 * POST /api/transform/:id
 * Envía un mensaje para transformar un proyecto
 */
router.post('/:id', async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { message, conversationId } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'El campo "message" es requerido y debe ser string',
        },
      });
    }

    // Validar que el proyecto existe
    // TODO: Llamar a projectIndex.getProject(projectId)

    const result = await createTransformJob(projectId, message, conversationId);

    res.status(202).json({
      success: true,
      conversationId: result.conversationId,
      status: 'processing',
      message: 'La transformación se está procesando',
    });
  } catch (error) {
    console.error('Error en transform:', error);
    res.status(500).json({
      error: {
        code: 'TRANSFORM_FAILED',
        message: 'Error al procesar transformación',
      },
    });
  }
});

/**
 * GET /api/transform/:id/status/:conversationId
 * Obtiene el estado de una transformación
 */
router.get('/:id/status/:conversationId', async (req: Request, res: Response) => {
  try {
    const { id: projectId, conversationId } = req.params;

    const status = getTransformStatus(conversationId);

    if (!status) {
      return res.status(404).json({
        error: {
          code: 'TRANSFORM_NOT_FOUND',
          message: 'Transformación no encontrada',
        },
      });
    }

    // Verificar que la transformación pertenece al proyecto
    if (status.projectId !== projectId) {
      return res.status(404).json({
        error: {
          code: 'TRANSFORM_NOT_FOUND',
          message: 'Transformación no encontrada para este proyecto',
        },
      });
    }

    res.json(status);
  } catch (error) {
    console.error('Error en status:', error);
    res.status(500).json({
      error: {
        code: 'TRANSFORM_FAILED',
        message: 'Error al obtener estado',
      },
    });
  }
});

export { router as transformRouter };
```

---

## 5. Transform Handler - Especificación

### backend/src/services/transform/transformHandler.ts

```typescript
import { spawn, ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

export interface TransformJob {
  id: string;
  projectId: string;
  message: string;
  conversationId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: {
    variationId: string;
    description: string;
  };
  error?: string;
  createdAt: Date;
}

// Cola de procesamiento en memoria
const jobQueue: Map<string, TransformJob> = new Map();

/**
 * Crea un nuevo trabajo de transformación
 */
export async function createTransformJob(
  projectId: string,
  message: string,
  conversationId?: string
): Promise<{ conversationId: string }> {
  const finalConversationId = conversationId || `conv_${uuidv4()}`;

  const job: TransformJob = {
    id: uuidv4(),
    projectId,
    message,
    conversationId: finalConversationId,
    status: 'queued',
    progress: 0,
    createdAt: new Date(),
  };

  jobQueue.set(finalConversationId, job);

  // Procesar asíncronamente
  processTransformJob(job);

  return { conversationId: finalConversationId };
}

/**
 * Obtiene el estado de una transformación
 */
export function getTransformStatus(conversationId: string): TransformJob | null {
  return jobQueue.get(conversationId) || null;
}

/**
 * Procesa un trabajo de transformación
 */
async function processTransformJob(job: TransformJob): Promise<void> {
  job.status = 'processing';
  job.progress = 10;

  try {
    // TODO: Implementar según sección 2.3 de IMPLEMENTATION-SPEC.md
    // 1. Leer archivos del proyecto
    // 2. Enviar a Claude (via MCP o proceso hijo)
    // 3. Parsear respuesta
    // 4. Guardar como variación
    // 5. Actualizar job status

    job.progress = 100;
    job.status = 'completed';
  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Unknown error';
  }
}
```

---

## 6. Variaciones Storage - Especificación

### backend/src/services/storage/variations.ts

```typescript
import { promises as fs } from 'fs';
import { join } from 'path';

export interface VariationSummary {
  id: string;
  name: string;
  createdAt: string;
  description?: string;
}

export interface ProjectCode {
  html: string;
  css?: string;
  js?: string;
}

export interface Variation {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  description?: string;
  code: ProjectCode;
  isPreferred?: boolean;
}

/**
 * Lista todas las variaciones de un proyecto
 */
export async function listVariations(
  projectsDir: string,
  projectId: string
): Promise<VariationSummary[]> {
  const variationsDir = join(projectsDir, projectId, 'variations');

  try {
    const exists = await fs.access(variationsDir).then(() => true).catch(() => false);
    if (!exists) return [];

    const dirs = await fs.readdir(variationsDir);
    const variations: VariationSummary[] = [];

    for (const dir of dirs) {
      const metadataPath = join(variationsDir, dir, 'metadata.json');
      try {
        const content = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(content);
        variations.push({
          id: metadata.id,
          name: metadata.name,
          createdAt: metadata.createdAt,
          description: metadata.description,
        });
      } catch {
        // Skip invalid variation directories
      }
    }

    return variations;
  } catch {
    return [];
  }
}

/**
 * Obtiene una variación específica
 */
export async function getVariation(
  projectsDir: string,
  projectId: string,
  variationId: string
): Promise<Variation | null> {
  const variationDir = join(projectsDir, projectId, 'variations', variationId);

  try {
    const [metadataContent, html, css, js] = await Promise.all([
      fs.readFile(join(variationDir, 'metadata.json'), 'utf-8'),
      fs.readFile(join(variationDir, 'index.html'), 'utf-8').catch(() => ''),
      fs.readFile(join(variationDir, 'style.css'), 'utf-8').catch(() => ''),
      fs.readFile(join(variationDir, 'script.js'), 'utf-8').catch(() => ''),
    ]);

    const metadata = JSON.parse(metadataContent);
    return {
      ...metadata,
      code: { html, css: css || undefined, js: js || undefined },
    };
  } catch {
    return null;
  }
}

/**
 * Guarda una nueva variación
 */
export async function saveVariation(
  projectsDir: string,
  projectId: string,
  variation: Omit<Variation, 'id' | 'createdAt'>
): Promise<string> {
  const variationId = `${projectId}_v${Date.now()}`;
  const variationDir = join(projectsDir, projectId, 'variations', variationId);

  await fs.mkdir(variationDir, { recursive: true });

  await Promise.all([
    fs.writeFile(join(variationDir, 'index.html'), variation.code.html),
    variation.code.css
      ? fs.writeFile(join(variationDir, 'style.css'), variation.code.css)
      : Promise.resolve(),
    variation.code.js
      ? fs.writeFile(join(variationDir, 'script.js'), variation.code.js)
      : Promise.resolve(),
    fs.writeFile(
      join(variationDir, 'metadata.json'),
      JSON.stringify(
        {
          id: variationId,
          projectId,
          name: variation.name,
          createdAt: new Date().toISOString(),
          description: variation.description,
          isPreferred: variation.isPreferred,
        },
        null,
        2
      )
    ),
  ]);

  return variationId;
}
```

---

## 7. CodeEditor - Especificación

### frontend/src/components/Transformation/CodeEditor.tsx

```typescript
import { useState, useCallback, useMemo } from 'react';

export type CodeEditorTab = 'html' | 'css' | 'js';

export interface CodeEditorProps {
  code: {
    html: string;
    css?: string;
    js?: string;
  };
  onChange?: (code: CodeEditorProps['code']) => void;
  readOnly?: boolean;
  language?: 'html' | 'css' | 'javascript';
}

export function CodeEditor({
  code,
  onChange,
  readOnly = false,
}: CodeEditorProps) {
  const [activeTab, setActiveTab] = useState<CodeEditorTab>('html');

  const handleCodeChange = useCallback(
    (newCode: string) => {
      if (readOnly || !onChange) return;

      onChange({
        ...code,
        [activeTab]: newCode,
      });
    },
    [code, onChange, activeTab, readOnly]
  );

  const tabs: { id: CodeEditorTab; label: string }[] = useMemo(
    () => [
      { id: 'html', label: 'HTML' },
      { id: 'css', label: 'CSS' },
      { id: 'js', label: 'JS' },
    ],
    []
  );

  const currentCode = code[activeTab] || '';

  return (
    <div className="code-editor">
      <div className="editor-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            disabled={readOnly}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="editor-content">
        <textarea
          value={currentCode}
          onChange={(e) => handleCodeChange(e.target.value)}
          readOnly={readOnly}
          spellCheck={false}
          className={`code-textarea ${activeTab}`}
          aria-label={`Editor de ${activeTab.toUpperCase()}`}
        />
      </div>
    </div>
  );
}
```

---

## 8. Constantes Compartidas

### shared/constants.ts

```typescript
// ============================================
// CONSTANTES DEL PROYECTO
// ============================================

// API
export const API_CONFIG = {
  BASE_URL:
    typeof process !== 'undefined'
      ? process.env.VITE_API_URL || 'http://localhost:3001/api'
      : 'http://localhost:3001/api',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

// Polling
export const POLLING_CONFIG = {
  INTERVAL_MS: 2000,
  TIMEOUT_MS: 300000, // 5 minutos
} as const;

// Extracción
export const EXTRACTION_CONFIG = {
  MAX_CODE_SIZE_BYTES: 1024 * 1024, // 1MB
  MAX_DEPENDENCIES: 20,
  TIMEOUT_MS: 60000, // 1 minuto
  RETRY_ATTEMPTS: 3,
} as const;

// Rate Limiting
export const RATE_LIMIT_CONFIG = {
  WINDOW_MS: 60000, // 1 minuto
  MAX_REQUESTS: 10,
} as const;

// Regex
export const CODEPEN_URL_REGEX =
  /^https:\/\/(www\.)?codepen\.io\/[a-zA-Z0-9_-]+\/pen\/[a-zA-Z0-9]+(\/debug)?(\?.*)?$/;

// Preprocesadores válidos
export const ALLOWED_PREPROCESSORS = {
  html: ['none', 'pug', 'haml', 'markdown'] as const,
  css: ['none', 'scss', 'less', 'stylus'] as const,
  js: ['none', 'babel', 'typescript', 'coffeescript'] as const,
} as const;

// Puertos por defecto
export const DEFAULT_PORTS = {
  FRONTEND: 5173,
  BACKEND: 3001,
} as const;
```

---

## 9. Logger - Backend

### backend/src/utils/logger.ts

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.isDevelopment ? context : undefined,
    };
  }

  private output(entry: LogEntry): void {
    const formatted = JSON.stringify(entry);

    if (entry.level === 'error') {
      console.error(formatted);
    } else if (entry.level === 'warn') {
      console.warn(formatted);
    } else if (this.isDevelopment) {
      console.log(formatted);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.isDevelopment) {
      this.output(this.formatEntry('debug', message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.output(this.formatEntry('info', message, context));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.output(this.formatEntry('warn', message, context));
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.output(this.formatEntry('error', message, context));
  }
}

export const logger = new Logger();
```

---

## 10. Configuración CORS

### backend/src/config/cors.ts

```typescript
import { CorsOptions } from 'cors';

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173', // Vite default
  'http://localhost:3000', // Alternative
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
};
```

---

## 11. Actualización de main.tsx

### frontend/src/main.tsx (Actualizado)

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ProjectProvider } from './context/ProjectContext';
import { ExtractionProvider } from './context/ExtractionContext';
import { ClaudeProvider } from './context/ClaudeContext'; // AGREGAR
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProjectProvider>
        <ExtractionProvider>
          <ClaudeProvider> {/* AGREGAR */}
            <App />
          </ClaudeProvider> {/* AGREGAR */}
        </ExtractionProvider>
      </ProjectProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

---

## 12. Checklist Final para Implementación

### Pre-requisitos
- [ ] Node.js 18+ instalado
- [ ] Git inicializado
- [ ] Editor configurado (VS Code recomendado)

### Setup Inicial
- [ ] Crear estructura de carpetas según Scaffold.md
- [ ] Ejecutar `npm install` en root
- [ ] Ejecutar `npm install` en backend
- [ ] Ejecutar `npm install` en frontend
- [ ] Crear `.env` en backend
- [ ] Crear `.env` en frontend
- [ ] Verificar `npm run build` compila

### Verificación
- [ ] `GET /api/health` retorna 200
- [ ] Frontend inicia en localhost:5173
- [ ] Backend inicia en localhost:3001
- [ ] CORS permite frontend

### Fase 1 - MVP
- [ ] POST /api/extract funciona
- [ ] GET /api/projects lista proyectos
- [ ] Extracción guarda archivos correctamente

---

*Documento generado post-auditoría. Complementa IMPLEMENTATION-SPEC.md.*
