# Especificación de Implementación - CodePen Extractor

> **Propósito**: Este documento resuelve TODAS las ambigüedades identificadas en la auditoría para permitir implementación sin preguntas. Un desarrollador debe poder codificar sin detenerse a preguntar.

**Estado**: Completo (v0.3 - Post auditoría profunda)
**Última actualización**: 2026-02-16
**Versión**: 0.3

---

## Tabla de Contenidos

1. [Modelo de Datos](#1-modelo-de-datos)
   - [1.0 Arquitectura General](#10-arquitectura-general)
   - [1.1 Generación de IDs](#11-generación-de-ids)
   - [1.2 Schema de index.json](#12-schema-de-indexjson)
   - [1.3 Schema de metadata.json](#13-schema-de-metadatajson)
   - [1.4 Escritura Atómica de index.json](#14-escritura-atómica-de-indexjson)
2. [Especificación de API](#2-especificación-de-api)
   - [2.1 Formato de Error Estándar](#21-formato-de-error-estándar)
   - [2.2 Endpoints](#22-endpoints)
   - [2.3 Integración con Claude Code](#23-integración-con-claude-code)
3. [MCP Server Spec](#3-mcp-server-spec)
4. [Manejo de Errores](#4-manejo-de-errores)
5. [Componentes UI](#5-componentes-ui)
6. [Detección de Preprocesadores](#6-detección-de-preprocesadores)
7. [Recuperación y Rollback](#7-recuperación-y-rollback)
   - [7.0 Extracción de CodePen](#70-extracción-de-codepen)
   - [7.1 Flujo de Extracción con Recovery](#71-flujo-de-extracción-con-recovery)
   - [7.2 File Locking](#72-file-locking)
8. [Modelo de Variaciones](#8-modelo-de-variaciones)
   - [8.1 Schema de Variación](#81-schema-de-variación)
   - [8.2 Estructura de Carpetas](#82-estructura-de-carpetas)
   - [8.3 Flujo "Guardar como Preferida](#83-flujo-guardar-como-preferida)
   - [8.4 API de Variaciones](#84-api-de-variaciones)
9. [Apéndice A: Funciones Auxiliares](#9-apéndice-a-funciones-auxiliares)
10. [Apéndice B: Test Cases](#10-apéndice-b-test-cases)
11. [Apéndice C: Variables de Entorno](#11-apéndice-c-variables-de-entorno)
12. [Apéndice D: Dependencias](#12-apéndice-d-dependencias)
13. [Apéndice E: Checklist de Implementación](#13-apéndice-e-checklist-de-implementación)
14. [Apéndice F: URLs de Referencia](#14-apéndice-f-urls-de-referencia)

---

## 1. Modelo de Datos

### 1.0 Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ARQUITECTURA DEL SISTEMA                        │
└─────────────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌──────────────┐     ┌─────────────────────────────┐
  │  Usuario │────►│   Frontend   │────►│       Backend API           │
  │ (Browser)│◄────│   (React)    │◄────│       (Express)             │
  └──────────┘     └──────────────┘     └──────────────┬──────────────┘
                                                       │
                                                       │
                       ┌───────────────────────────────┼────────────────┐
                       │                               │                │
                       ▼                               ▼                ▼
              ┌──────────────┐             ┌──────────────┐   ┌────────────┐
              │  Storage     │             │   Puppeteer  │   │   MCP      │
              │  (JSON/SQLite)│             │  (Scraping)  │   │  Server    │
              └──────────────┘             └──────────────┘   └─────┬──────┘
                                                                      │
                                                              ┌───────▼────────┐
                                                              │  Claude Code   │
                                                              │  (Terminal)    │
                                                              └────────────────┘

═════════════════════════════════════════════════════════════════════════
                              FLUJO DE DATOS
═════════════════════════════════════════════════════════════════════════

1. EXTRACCIÓN:
   URL CodePen ──► Debug Endpoint ──► Puppeteer ──► Parse HTML ──► Archivos
                     (captura)         (scrape)      (extrae deps)   (index.html, etc.)

2. ALMACENAMIENTO:
   Archivos ──► projects/{projectId}/ ──► index.json (referencia)

3. VARIACIONES:
   Original ──► Transform (Claude) ──► Nueva variación ──► Merge/Replace

4. EXPORT:
   Proyecto ──► ZIP ──► Usuario

═════════════════════════════════════════════════════════════════════════
                            RESPONSABILIDADES
═════════════════════════════════════════════════════════════════════════

┌─────────────────┬──────────────────────────────────────────────────────┐
│    Componente   │  Responsabilidad                                     │
├─────────────────┼──────────────────────────────────────────────────────┤
│ Frontend        │ UI, validación básica, polling, preview              │
│ Backend API     │ Lógica de negocio, validación, coordinación          │
│ Storage        │ Persistencia (JSON/SQLite + archivos)                │
│ Puppeteer      │ Extracción de código desde CodePen                   │
│ MCP Server    │ Herramientas para Claude Code                         │
│ Claude Code   │ Transformaciones de código (chat)                     │
└─────────────────┴──────────────────────────────────────────────────────┘
```

### 1.1 Generación de IDs

| Campo | Estrategia | Ejemplo |
|-------|------------|---------|
| **Project ID** | `pen_${urlHash}` donde urlHash = primeros 8 caracteres del SHA256 de la URL | `pen_a3f8c2d1` |
| **Variation ID** | `${projectId}_v${timestamp}` | `pen_a3f8c2d1_v1708099200` |

**Implementación**:
```typescript
import { createHash } from 'crypto';

function generateProjectId(url: string): string {
  const hash = createHash('sha256').update(url).digest('hex');
  return `pen_${hash.slice(0, 8)}`;
}

function generateVariationId(projectId: string): string {
  return `${projectId}_v${Date.now()}`;
}
```

### 1.2 Schema de index.json

```typescript
interface ProjectsIndex {
  version: number; // = 1, para migraciones futuras
  lastUpdated: string; // ISO 8601
  projects: ProjectSummary[];
}

interface ProjectSummary {
  id: string;
  name: string;
  url: string;
  author: string;
  authorUrl?: string;
  extractedAt: string; // ISO 8601
  license: string; // "MIT" por defecto
  hasCode: boolean; // true si los archivos existen
  hasVariations: boolean; // true si hay variaciones
  status: 'complete' | 'partial' | 'failed'; // estado de extracción
}
```

**Ejemplo**:
```json
{
  "version": 1,
  "lastUpdated": "2026-02-16T00:00:00Z",
  "projects": [
    {
      "id": "pen_a3f8c2d1",
      "name": "Double Slider Form",
      "url": "https://codepen.io/florinpop17/pen/OPyapww",
      "author": "Florin Pop",
      "authorUrl": "https://codepen.io/florinpop17",
      "extractedAt": "2026-02-16T00:00:00Z",
      "license": "MIT",
      "hasCode": true,
      "hasVariations": false,
      "status": "complete"
    }
  ]
}
```

### 1.3 Schema de metadata.json

```typescript
interface ProjectMetadata {
  // Identificación
  id: string;
  name: string;
  url: string;

  // Autoría
  author: string;
  authorUrl?: string;
  license: string;
  licenseUrl?: string;

  // Fechas
  createdAt?: string; // Fecha original del Pen (si se puede obtener)
  extractedAt: string;

  // Código
  preprocessors: {
    html: PreprocessorType; // "none" | "pug" | "haml" | "markdown"
    css: PreprocessorType;  // "none" | "scss" | "less" | "stylus"
    js: PreprocessorType;   // "none" | "babel" | "typescript" | "coffeescript"
  };

  // Dependencias
  dependencies: string[]; // URLs de CDNs, fuentes, etc.

  // Archivos
  files: {
    html: string; // "index.html"
    css?: string; // "style.css" si existe
    js?: string;  // "script.js" si existe
  };

  // Estado
  status: 'complete' | 'partial' | 'failed';
  errorMessage?: string; // Si status = 'failed'

  // Variaciones
  variations?: VariationSummary[];
}

type PreprocessorType = 'none' | 'scss' | 'less' | 'stylus' | 'pug' | 'haml' | 'babel' | 'typescript' | 'coffeescript';

interface VariationSummary {
  id: string;
  name: string;
  createdAt: string;
  description?: string; // Cambios realizados
}
```

### 1.4 Escritura Atómica de index.json

**Inicialización Automática**: El índice se inicializa automáticamente si no existe. La función `ensureIndexExists()` crea el archivo con estructura vacía:

```typescript
// backend/src/services/storage/projectsIndex.ts

function ensureIndexExists(): void {
  const indexPath = join(projectsDir, 'index.json');
  if (!fs.existsSync(indexPath)) {
    const initialIndex = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      projects: [],
    };
    fs.writeFileSync(indexPath, JSON.stringify(initialIndex, null, 2));
  }
}
```

Esta función debe llamarse al iniciar el servidor, antes de cualquier operación de lectura/escritura.

**Escritura Atómica**:
```typescript
import { writeFile, rename } from 'fs/promises';
import { join } from 'path';

async function writeIndexAtomically(index: ProjectsIndex, projectsDir: string): Promise<void> {
  const tempPath = join(projectsDir, 'index.json.tmp');
  const finalPath = join(projectsDir, 'index.json');

  // 1. Escribir a archivo temporal
  await writeFile(tempPath, JSON.stringify(index, null, 2), 'utf-8');

  // 2. Atomic rename (operación atómica en POSIX y NTFS)
  await rename(tempPath, finalPath);
}
```

---

## 2. Especificación de API

### 2.1 Formato de Error Estándar

Todos los errores siguen este schema:

```typescript
interface ApiError {
  error: {
    code: string; // Código de error para el frontend (ej: "INVALID_URL")
    message: string; // Mensaje para el usuario
    details?: Record<string, unknown>; // Detalles para debugging (solo en dev)
  };
}
```

### 2.2 Endpoints

#### GET /api/projects

**Descripción**: Lista todos los proyectos extraídos

**Request**:
```http
GET /api/projects HTTP/1.1
```

**Response (200 OK)**:
```typescript
interface GetProjectsResponse {
  projects: ProjectSummary[];
  total: number;
}
```

**Ejemplo**:
```json
{
  "projects": [
    {
      "id": "pen_a3f8c2d1",
      "name": "Double Slider Form",
      "url": "https://codepen.io/florinpop17/pen/OPyapww",
      "author": "Florin Pop",
      "extractedAt": "2026-02-16T00:00:00Z",
      "license": "MIT",
      "hasVariations": false
    }
  ],
  "total": 1
}
```

**Errores**:
| Código | HTTP | Mensaje |
|--------|------|---------|
| INDEX_CORRUPTED | 500 | "Índice de proyectos corrupto" |

---

#### GET /api/projects/:id

**Descripción**: Obtiene detalles completos de un proyecto incluyendo código

**Request**:
```http
GET /api/projects/pen_a3f8c2d1 HTTP/1.1
```

**Response (200 OK)**:
```typescript
interface GetProjectResponse {
  project: ProjectWithCode;
}

interface ProjectWithCode extends ProjectSummary {
  code: {
    html: string;
    css?: string;
    js?: string;
  };
  dependencies: string[];
  preprocessors: ProjectMetadata['preprocessors'];
}
```

**Errores**:
| Código | HTTP | Mensaje |
|--------|------|---------|
| PROJECT_NOT_FOUND | 404 | "Proyecto no encontrado" |
| FILES_NOT_FOUND | 500 | "Archivos de código no encontrados" |

---

#### POST /api/extract

**Descripción**: Extrae código de un Pen de CodePen

**Request**:
```http
POST /api/extract HTTP/1.1
Content-Type: application/json

{
  "url": "https://codepen.io/florinpop17/pen/OPyapww"
}
```

**Request Schema**:
```typescript
interface ExtractRequest {
  url: string; // URL válida de CodePen
}
```

**Validación de URL**:
```typescript
// backend/src/services/validation/urlValidator.ts

/**
 * Valida que una URL sea de CodePen y esté bien formada
 * Acepta:
 *  - https://codepen.io/user/pen/abc123
 *  - https://codepen.io/user/pen/abc123/debug
 *  - https://codepen.io/user/pen/abc123?ref=sidebar
 *  - https://www.codepen.io/user/pen/abc123
 * Rechaza:
 *  - http:// (no HTTPS)
 *  - codepen.io/user/project/... (no es un Pen)
 *  - URLs acortadas (codepen.io/abc123)
 */
function isValidCodePenUrl(url: string): boolean {
  const regex = /^https:\/\/(www\.)?codepen\.io\/[a-zA-Z0-9_-]+\/pen\/[a-zA-Z0-9]+(\/debug)?(\?.*)?$/;
  return regex.test(url);
}

function extractPenInfo(url: string): { username: string; penId: string; isDebug: boolean } | null {
  const match = url.match(/^https:\/\/(www\.)?codepen\.io\/([a-zA-Z0-9_-]+)\/pen\/([a-zA-Z0-9]+)(\/debug)?/);
  if (!match) return null;

  return {
    username: match[2],
    penId: match[3],
    isDebug: !!match[4],
  };
}
```

**Response (201 Created)**:
```typescript
interface ExtractResponse {
  success: true;
  project: ProjectSummary;
}
```

**Errores**:
| Código | HTTP | Mensaje |
|--------|------|---------|
| INVALID_URL | 400 | "URL de CodePen inválida" |
| EXTRACTION_FAILED | 500 | "Error al extraer el Pen" |
| RATE_LIMIT_EXCEEDED | 429 | "Demasiadas solicitudes. Intenta en 5 minutos" |
| PEN_NOT_FOUND | 404 | "El Pen no existe o es privado" |
| TIMEOUT | 504 | "Tiempo de extracción agotado" |

---

#### DELETE /api/projects/:id

**Descripción**: Elimina un proyecto y sus archivos

**Request**:
```http
DELETE /api/projects/pen_a3f8c2d1 HTTP/1.1
```

**Response (200 OK)**:
```typescript
interface DeleteProjectResponse {
  success: true;
  message: string;
}
```

**Errores**:
| Código | HTTP | Mensaje |
|--------|------|---------|
| PROJECT_NOT_FOUND | 404 | "Proyecto no encontrado" |
| DELETE_FAILED | 500 | "Error al eliminar archivos" |

---

#### POST /api/export/:id

**Descripción**: Exporta proyecto como ZIP

**Request**:
```http
POST /api/export/pen_a3f8c2d1 HTTP/1.1
```

**Response (200 OK)**:
```
Content-Type: application/zip
Content-Disposition: attachment; filename="pen_a3f8c2d1.zip"

[Binary ZIP data]
```

**Errores**:
| Código | HTTP | Mensaje |
|--------|------|---------|
| PROJECT_NOT_FOUND | 404 | "Proyecto no encontrado" |
| EXPORT_FAILED | 500 | "Error al generar ZIP" |

---

#### GET /api/projects/:id/variations

**Descripción**: Lista variaciones de un proyecto

**Request**:
```http
GET /api/projects/pen_a3f8c2d1/variations HTTP/1.1
```

**Response (200 OK)**:
```typescript
interface GetVariationsResponse {
  variations: Array<{
    id: string;
    name: string;
    createdAt: string;
    description?: string;
  }>;
}
```

**Errores**:
| Código | HTTP | Mensaje |
|--------|------|---------|
| PROJECT_NOT_FOUND | 404 | "Proyecto no encontrado" |

---

#### POST /api/transform/:id

**Descripción**: Envía mensaje a Claude Code para transformar proyecto

**Request**:
```http
POST /api/transform/pen_a3f8c2d1 HTTP/1.1
Content-Type: application/json

{
  "message": "Cambia el color principal a azul",
  "conversationId": "conv_abc123" // Opcional, para continuar conversación
}
```

**Request Schema**:
```typescript
interface TransformRequest {
  message: string;
  conversationId?: string;
}
```

**Response (202 Accepted)**:
```typescript
interface TransformResponse {
  success: true;
  conversationId: string;
  status: 'processing';
  message: "La transformación se está procesando";
}
```

**Errores**:
| Código | HTTP | Mensaje |
|--------|------|---------|
| PROJECT_NOT_FOUND | 404 | "Proyecto no encontrado" |
| CLAUDE_NOT_CONFIGURED | 503 | "Claude Code no está configurado" |
| TRANSFORM_FAILED | 500 | "Error al procesar transformación" |

---

#### GET /api/transform/:id/status/:conversationId

**Descripción**: Obtiene estado de transformación en curso

**Request**:
```http
GET /api/transform/pen_a3f8c2d1/status/conv_abc123 HTTP/1.1
```

**Response (200 OK)**:
```typescript
interface TransformStatusResponse {
  status: 'processing' | 'completed' | 'failed';
  progress?: number; // 0-100
  message?: string;
  result?: {
    variationId: string;
    description: string;
  };
  error?: string;
}
```

**Configuración de Polling (Frontend)**:
```typescript
// frontend/src/hooks/useTransformPolling.ts

const POLLING_CONFIG = {
  intervalMs: 2000,      // 2 segundos entre cada poll
  timeoutMs: 300000,     // 5 minutos timeout máximo
  maxAttempts: 150,      // timeout / interval
};

async function pollTransformStatus(
  projectId: string,
  conversationId: string,
  onProgress: (progress: number) => void,
  onComplete: (result: TransformStatusResponse) => void,
  onError: (error: string) => void
): Promise<void> {
  let attempts = 0;
  const startTime = Date.now();

  const poll = async () => {
    attempts++;
    const elapsed = Date.now() - startTime;

    // Check timeout
    if (elapsed > POLLING_CONFIG.timeoutMs || attempts > POLLING_CONFIG.maxAttempts) {
      onError('Tiempo de transformación agotado');
      return;
    }

    try {
      const res = await fetch(`/api/transform/${projectId}/status/${conversationId}`);
      const data: TransformStatusResponse = await res.json();

      if (data.progress !== undefined) {
        onProgress(data.progress);
      }

      if (data.status === 'completed') {
        onComplete(data);
      } else if (data.status === 'failed') {
        onError(data.error || 'Transformación falló');
      } else {
        // Continuar polleando
        setTimeout(poll, POLLING_CONFIG.intervalMs);
      }
    } catch (error) {
      onError('Error al obtener estado');
    }
  };

  poll();
}
```

### 2.3 Integración con Claude Code

#### 2.3.1 Arquitectura de Comunicación

El backend NO se comunica directamente con Claude Code. En cambio:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────►│  Backend    │────►│  MCP Server │────► Claude Code
│  (Chat UI)  │     │  (API)      │     │  (stdin/out)│     (Terminal)
└─────────────┘     └─────────────┘     └─────────────┘
       │                                     │
       │◄──────────── WebSocket/SSE ─────────┘
```

**Nota importante**: Esta es una arquitectura asíncrona. El frontend hace polling al backend.

#### 2.3.2 Implementación del Transform Handler

```typescript
// backend/src/services/transform/transformHandler.ts

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { readProjectFiles, writeVariation } from '../storage/projectFiles';

interface TransformJob {
  id: string;
  projectId: string;
  message: string;
  conversationId?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: {
    variationId: string;
    description: string;
  };
  error?: string;
  createdAt: Date;
}

// Cola de procesamiento
const jobQueue: Map<string, TransformJob> = new Map();
const claudeProcess: ChildProcess | null = null;

export async function createTransformJob(
  projectId: string,
  message: string,
  conversationId?: string
): Promise<{ conversationId: string }> {
  // Generar ID de conversación si no existe
  const finalConversationId = conversationId || `conv_${uuidv4()}`;

  // Crear trabajo
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

async function processTransformJob(job: TransformJob): Promise<void> {
  job.status = 'processing';
  job.progress = 10;

  try {
    // 1. Leer archivos del proyecto
    const projectFiles = await readProjectFiles(job.projectId);
    job.progress = 20;

    // 2. Preparar mensaje para Claude
    const systemPrompt = `Eres un asistente de código. El usuario quiere transformar un proyecto.
Proyecto ID: ${job.projectId}
Archivos:
- HTML: ${projectFiles.html.length} chars
- CSS: ${projectFiles.css?.length || 0} chars
- JS: ${projectFiles.js?.length || 0} chars

El usuario dice: "${job.message}"

Responde ÚNICAMENTE con el código modificado en este formato:
\`\`\`codepen-update
{
  "html": "...código HTML...",
  "css": "...código CSS...",
  "js": "...código JS..."
}
\`\`\`
No escribas explicaciones, solo el código.`;

    // 3. Enviar a Claude (via MCP o proceso hijo)
    const claudeResponse = await sendToClaude(systemPrompt);
    job.progress = 70;

    // 4. Parsear respuesta
    const updates = parseClaudeResponse(claudeResponse);

    // 5. Guardar como variación
    const variationId = await writeVariation(job.projectId, {
      code: {
        html: updates.html || projectFiles.html,
        css: updates.css || projectFiles.css,
        js: updates.js || projectFiles.js,
      },
      description: job.message,
    });

    job.progress = 100;
    job.status = 'completed';
    job.result = {
      variationId,
      description: job.message,
    };

  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Unknown error';
  }
}

async function sendToClaude(message: string): Promise<string> {
  // Opción A: Usar MCP Server (recomendado)
  // const mcpClient = getMcpClient();
  // return await mcpClient.sendMessage(message);

  // Opción B: Proceso hijo (para desarrollo)
  return new Promise((resolve, reject) => {
    const claude = spawn('claude', ['--print'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    claude.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    claude.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    claude.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Claude exited with code ${code}: ${stderr}`));
      }
    });

    claude.stdin.write(message);
    claude.stdin.end();
  });
}

function parseClaudeResponse(response: string): { html?: string; css?: string; js?: string } {
  // Buscar el bloque codepen-update
  const match = response.match(/```codepen-update\n([\s\S]*?)```/);
  if (!match) {
    throw new Error('Invalid Claude response format');
  }

  try {
    return JSON.parse(match[1]);
  } catch {
    throw new Error('Failed to parse Claude response');
  }
}

export function getTransformStatus(conversationId: string): TransformJob | null {
  return jobQueue.get(conversationId) || null;
}
```

#### 2.3.3 Decisión: Storage JSON vs SQLite

| Aspecto | JSON (Actual) | SQLite (Alternativa) |
|---------|---------------|---------------------|
| Complejidad | Bajo | Medio |
| Concurrencia | Pobre (file locking) | Buena (WAL mode) |
| Queries | Limitados | Full SQL |
| Migraciones | Manual | Built-in |
| Dependencias | Ninguna | better-sqlite3 |

**Recomendación para MVP**: Mantener JSON con file locking (como está).

**Para producción**: Migrar a SQLite:
```bash
npm install better-sqlite3
```

```typescript
// Alternativa SQLite
import Database from 'better-sqlite3';

const db = new Database('projects.db');

db.exec(`
  CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT,
    url TEXT,
    author TEXT,
    extractedAt TEXT,
    status TEXT
  );

  CREATE TABLE variations (
    id TEXT PRIMARY KEY,
    projectId TEXT,
    createdAt TEXT,
    description TEXT,
    FOREIGN KEY (projectId) REFERENCES projects(id)
  );
`);
```

#### 2.3.4 Justificación de Rate Limiter en Memoria

**为什么会 esto (por qué en memoria)**:
- MVP: simplicidad, sin dependencias extra
- Un solo servidor: no hay problema de consistencia
- Restartacceptable: si falla, se resetea

**Para producción con múltiples instancias**:
```typescript
// Opción 1: Redis
import Redis from 'ioredis';
const redis = new Redis();

async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, Math.ceil(windowMs / 1000));
  }
  return current <= limit;
}

// Opción 2: Redis + Lua script para atomicidad
const script = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;
```

---

#### GET /api/health

**Descripción**: Health check para verificar que el backend está vivo

**Request**:
```http
GET /api/health HTTP/1.1
```

**Response (200 OK)**:
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

**Ejemplo**:
```json
{
  "status": "ok",
  "timestamp": "2026-02-16T00:00:00Z",
  "version": "1.0.0",
  "services": {
    "filesystem": "ok",
    "puppeteer": "ok",
    "mcp": "not_configured"
  }
}
```

---

## 3. MCP Server Spec

### 3.1 Arquitectura

```
┌─────────────────┐         stdio          ┌─────────────────┐
│  Claude Code    │ ◄────────────────────► │  MCP Server     │
│  (en terminal)  │                        │  (Node.js)      │
└─────────────────┘                        └────────┬────────┘
                                                    │
                                                    │ HTTP
                                                    ▼
                                           ┌─────────────────┐
                                           │  Backend API    │
                                           │  (Express)      │
                                           └─────────────────┘
```

### 3.2 Instalación

**Paso 1**: Crear servidor MCP

```bash
mkdir mcp-server-codepen
cd mcp-server-codepen
npm init -y
npm install @modelcontextprotocol/sdk express axios
npm install -D @types/node typescript
```

**Paso 2**: Configurar en `claude_desktop_config.json`

**Ubicación del archivo de configuración**:
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "codepen-extractor": {
      "command": "node",
      "args": ["/ruta/a/mcp-server-codepen/dist/index.js"],
      "env": {
        "BACKEND_URL": "http://localhost:3001"
      }
    }
  }
}
```

### 3.3 Herramientas MCP

#### read_project_files

**Descripción**: Lee los archivos HTML, CSS, JS de un proyecto

**Input Schema**:
```typescript
interface ReadProjectFilesInput {
  projectId: string;
}
```

**Output Schema**:
```typescript
interface ReadProjectFilesOutput {
  success: boolean;
  files?: {
    html: string;
    css?: string;
    js?: string;
  };
  metadata?: ProjectMetadata;
  error?: string;
}
```

---

#### write_variation

**Descripción**: Escribe una variación del proyecto

**Input Schema**:
```typescript
interface WriteVariationInput {
  projectId: string;
  code: {
    html: string;
    css?: string;
    js?: string;
  };
  description?: string;
}
```

**Output Schema**:
```typescript
interface WriteVariationOutput {
  success: boolean;
  variationId?: string;
  error?: string;
}
```

---

#### list_variations

**Descripción**: Lista todas las variaciones de un proyecto

**Input Schema**:
```typescript
interface ListVariationsInput {
  projectId: string;
}
```

**Output Schema**:
```typescript
interface ListVariationsOutput {
  success: boolean;
  variations?: Array<{
    id: string;
    createdAt: string;
    description?: string;
  }>;
  error?: string;
}
```

---

#### test_animation

**Descripción**: Usa Playwright para probar la animación (future)

**Input Schema**:
```typescript
interface TestAnimationInput {
  variationId: string;
}
```

**Output Schema**:
```typescript
interface TestAnimationOutput {
  success: boolean;
  screenshot?: string; // Base64
  errors?: string[];
}
```

---

## 4. Manejo de Errores

### 4.1 Matriz de Errores

| Error | Código | HTTP | Mensaje Usuario | Mensaje Log | Retry |
|-------|--------|------|-----------------|-------------|-------|
| URL inválida | INVALID_URL | 400 | "La URL ingresada no es válida" | `Invalid CodePen URL: ${url}` | No |
| Pen no existe | PEN_NOT_FOUND | 404 | "El Pen no existe o es privado" | `Pen not found: ${url}, status: ${status}` | No |
| Rate limit | RATE_LIMIT_EXCEEDED | 429 | "Demasiadas solicitudes. Intenta en 5 minutos" | `Rate limit exceeded for IP: ${ip}` | Sí (5 min) |
| Timeout | TIMEOUT | 504 | "La extracción tardó demasiado" | `Timeout after ${timeout}ms for ${url}` | Sí (1 vez) |
| Iframe vacío | EMPTY_IFRAME | 500 | "No se pudo extraer el código" | `Empty iframe for ${url}` | Sí (2 veces) |
| Error de red | NETWORK_ERROR | 503 | "Error de conexión. Verifica tu internet" | `Network error: ${error.message}` | Sí (3 veces) |
| Proyecto no encontrado | PROJECT_NOT_FOUND | 404 | "Proyecto no encontrado" | `Project not found: ${id}` | No |
| Índice corrupto | INDEX_CORRUPTED | 500 | "Error interno del servidor" | `Corrupted index.json: ${error.message}` | No |
| Archivos no encontrados | FILES_NOT_FOUND | 500 | "Archivos de código no encontrados" | `Files not found for project: ${id}` | No |
| Claude no configurado | CLAUDE_NOT_CONFIGURED | 503 | "La integración con IA no está disponible" | `Claude Code MCP not configured` | No |

### 4.3 Rate Limiting

**Implementación para MVP (memoria)**:

```typescript
// backend/src/middleware/rateLimiter.ts

interface RateLimitEntry {
  count: number;
  resetAt: number; // timestamp cuando se resetea el contador
}

interface RateLimitConfig {
  windowMs: number;    // Ventana de tiempo en ms
  maxRequests: number; // Máximo de requests por ventana
}

const CONFIG: RateLimitConfig = {
  windowMs: 60000,      // 1 minuto
  maxRequests: 10,      // 10 requests por minuto
};

// Store en memoria (se resetea al reiniciar el servidor)
const store = new Map<string, RateLimitEntry>();

export function rateLimiter() {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let entry = store.get(ip);

    // Si no existe o la ventana expiró, crear nueva entrada
    if (!entry || now > entry.resetAt) {
      entry = {
        count: 1,
        resetAt: now + CONFIG.windowMs,
      };
      store.set(ip, entry);
      return next();
    }

    // Si está dentro de la ventana, incrementar contador
    entry.count++;

    if (entry.count > CONFIG.maxRequests) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Demasiadas solicitudes. Intenta en 5 minutos',
          details: {
            retryAfter: Math.ceil((entry.resetAt - now) / 1000),
          },
        },
      });
    }

    store.set(ip, entry);
    next();
  };
}

// Para producción: migrar a Redis o archivo JSON persistente
```

**Configuración por endpoint**:
```typescript
// backend/src/routes/extract.ts

// Rate limiting más estricto para extracciones
const extractRateLimiter = rateLimiter({
  windowMs: 3600000,    // 1 hora
  maxRequests: 50,      // 50 extracciones por hora
});

router.post('/', extractRateLimiter, async (req, res) => {
  // ...
});
```

### 4.4 Clase de Error Base

```typescript
// backend/src/utils/errors.ts

export class ApiError extends Error {
  constructor(
    public code: string,
    public httpStatus: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ExtractionError extends ApiError {
  constructor(
    code: string,
    message: string,
    public url?: string,
    details?: Record<string, unknown>
  ) {
    super(code, 500, message, details);
    this.name = 'ExtractionError';
  }
}

export class ValidationError extends ApiError {
  constructor(code: string, message: string) {
    super(code, 400, message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(code: string, message: string) {
    super(code, 404, message);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfter: number) {
    super(
      'RATE_LIMIT_EXCEEDED',
      429,
      'Demasiadas solicitudes. Intenta en ' + Math.ceil(retryAfter / 60) + ' minutos',
      { retryAfter }
    );
    this.name = 'RateLimitError';
  }
}
```

---

## 5. Componentes UI

### 5.1 ExtractorPanel

**Props**:
```typescript
interface ExtractorPanelProps {
  onExtractComplete: (project: ProjectSummary) => void;
  onExtractError: (error: string) => void;
}
```

**Estados**:
```typescript
type ExtractionStatus = 'idle' | 'validating' | 'extracting' | 'success' | 'error';

interface ExtractionState {
  status: ExtractionStatus;
  progress: number; // 0-100
  message: string;
  error?: string;
}
```

**Eventos**:
- `onExtractStart`: Cuando inicia la extracción
- `onExtractProgress`: Actualización de progreso (cada 10%)
- `onExtractComplete`: Extracción exitosa
- `onExtractError`: Error en extracción

---

### 5.2 ChatPanel

**Props**:
```typescript
interface ChatPanelProps {
  projectId: string;
  onTransformationComplete: (variationId: string) => void;
}
```

**Estados**:
```typescript
type ChatStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface ChatState {
  status: ChatStatus;
  messages: ChatMessage[];
  isProcessing: boolean;
  error?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}
```

---

### 5.3 ProjectCard

**Props**:
```typescript
interface ProjectCardProps {
  project: ProjectSummary;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
}
```

**Estados internos**:
- `isDeleting`: boolean (muestra spinner mientras elimina)
- `showConfirm`: boolean (muestra confirmación de eliminación)

---

### 5.4 IframeViewer

**Props**:
```typescript
interface IframeViewerProps {
  code: {
    html: string;
    css?: string;
    js?: string;
  };
  dependencies?: string[];
  sandbox?: boolean; // default: true
}
```

**Implementación**:
```tsx
// frontend/src/components/Preview/IframeViewer.tsx

import DOMPurify from 'dompurify';

interface IframeViewerProps {
  code: {
    html: string;
    css?: string;
    js?: string;
  };
  dependencies?: string[];
  sandbox?: boolean; // default: true
}

function IframeViewer({ code, dependencies, sandbox = true }: IframeViewerProps) {
  // Sanitizar HTML para prevenir XSS
  const sanitizedHtml = DOMPurify.sanitize(code.html, {
    ALLOWED_TAGS: [
      'div', 'span', 'p', 'button', 'input', 'form', 'label',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'img', 'svg', 'path', 'circle',
      'header', 'footer', 'nav', 'main', 'section', 'article', 'aside',
      'br', 'hr', 'strong', 'em', 'b', 'i', 'u',
    ],
    ALLOWED_ATTR: [
      'class', 'id', 'style', 'href', 'src', 'alt', 'title',
      'type', 'name', 'value', 'placeholder', 'disabled', 'checked',
      'viewBox', 'fill', 'stroke', 'd', 'cx', 'cy', 'r',
      'data-*', 'aria-*', 'role', 'tabindex',
    ],
    ALLOW_DATA_URI: false, // Prevenir data URIs potencialmente peligrosas
  });

  // Sanitizar CSS (básico - remover @import y url())
  const sanitizedCss = (code.css || '')
    .replace(/@import/gi, '/* removed */')
    .replace(/url\s*\(\s*['"]?data:/gi, 'url(/* removed */)');

  const srcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        ${dependencies?.map(url => `<link rel="stylesheet" href="${sanitizeUrl(url)}">`).join('')}
        <style>${sanitizedCss}</style>
      </head>
      <body>
        ${sanitizedHtml}
        <script>
          try {
            ${code.js || ''}
          } catch (e) {
            console.error('Error en código del usuario:', e);
          }
        <\/script>
      </body>
    </html>
  `;

  return (
    <iframe
      srcDoc={srcDoc}
      sandbox={sandbox ? "allow-scripts" : undefined}
      title="Preview"
      className="w-full h-full border-0"
    />
  );
}

// Sanitizar URLs de dependencias
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return url;
  } catch {
    return '';
  }
}

export default IframeViewer;
```

**Dependencia requerida**:
```json
// frontend/package.json
{
  "dependencies": {
    "dompurify": "^3.0.0"
  }
}
```

**Alternativa sin DOMPurify (sandbox estricto)**:
```tsx
// Si no quieres usar DOMPurify, usar sandbox más restrictivo:
sandbox="allow-scripts" // Permite JS pero previene:
                        // - navigation (top-navigation)
                        // - popups (popups-to-escape-sandbox)
                        // - forms (allow-forms)
                        // - same-origin (allow-same-origin)
```

---

## 6. Detección de Preprocesadores

### 6.1 Algoritmo

```typescript
// backend/src/services/validation/preprocessors.ts

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
  // Pug (antes Jade)
  if (/^[\s]*[a-z]+\([^\)]*\)[\s]*$/m.test(html)) return 'pug';
  // Haml
  if (/^%[a-z]+[\(#]/m.test(html)) return 'haml';
  // Markdown
  if (/^#+\s|^\*\*|^\*/m.test(html)) return 'markdown';

  return 'none';
}

function detectCssPreprocessor(css: string): PreprocessorType {
  // SCSS/SASS
  if (/\$[a-z_-]+:\s*[^;]+;|@mixin|@include|&::|&:/.test(css)) return 'scss';
  // LESS
  if (/@[a-z_-]+:\s*[^;]+;|\.mix\(|&:/.test(css)) return 'less';
  // Stylus
  if (/^[a-z_-]+\s+=\s+/m.test(css)) return 'stylus';

  return 'none';
}

function detectJsPreprocessor(js: string): PreprocessorType {
  // TypeScript
  if (/: (string|number|boolean|any)\b|interface\s+\w+|type\s+\w+=/.test(js)) return 'typescript';
  // Babel (ES6+ features)
  if (/import\s+.*\s+from|export\s+default|const\s+\w+\s+=\s+\([^)]*\)\s*=>/.test(js)) return 'babel';
  // CoffeeScript
  if (/^\s*[a-z]+\s*=\s*(?!function)|->|=>/.test(js)) return 'coffeescript';

  return 'none';
}
```

### 6.2 Dónde se guarda

La detección ocurre post-extracción y se guarda en `metadata.json.preprocessors`.

### 6.3 Fallback

Si la detección es ambigua, default a `'none'`. El usuario puede editar manualmente si es necesario.

---

## 7. Recuperación y Rollback

### 7.0 Cómo Funciona la Extracción de CodePen

#### 7.0.1 Debug Endpoint

CodePen expone un endpoint de debug que renderiza el código compilado:

```
URL: https://codepen.io/{username}/pen/{penId}/debug
```

Esta página contiene:
- HTML compilado (sin preprocesador)
- CSS compilado
- JS compilado
- Metadatos en atributos `data-*`

#### 7.0.2 Extracción con Puppeteer

```typescript
// backend/src/services/scraper/codepen.ts

interface ExtractedCode {
  html: string;
  css: string;
  js: string;
  dependencies: string[];
  preprocessors: {
    html: PreprocessorType;
    css: PreprocessorType;
    js: PreprocessorType;
  };
  metadata: {
    title?: string;
    author?: string;
    authorUrl?: string;
  };
}

export async function extractPen(url: string): Promise<ExtractedCode> {
  const { username, penId } = extractPenInfo(url);
  const debugUrl = `https://codepen.io/${username}/pen/${penId}/debug`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Configurar timeout
    await page.setDefaultNavigationTimeout(30000);

    // Navegar al debug endpoint
    await page.goto(debugUrl, { waitUntil: 'networkidle0' });

    // Extraer código compilado desde el iframe
    const code = await page.evaluate(() => {
      const iframe = document.querySelector('iframe[title="CodePen Preview"]') as HTMLIFrameElement;
      if (!iframe) throw new Error('Iframe not found');

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Cannot access iframe document');

      // Extraer HTML
      const html = iframeDoc.body.innerHTML;

      // Extraer CSS (del head del iframe)
      const styles = iframeDoc.querySelectorAll('style');
      const css = Array.from(styles).map(s => s.textContent).join('\n');

      // Extraer JS (de scripts en el body)
      const scripts = iframeDoc.querySelectorAll('script:not([src])');
      const js = Array.from(scripts).map(s => s.textContent).join('\n');

      // Extraer dependencias (links CSS externos y scripts externos)
      const dependencies: string[] = [];
      iframeDoc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        const href = link.getAttribute('href');
        if (href) dependencies.push(href);
      });
      iframeDoc.querySelectorAll('script[src]').forEach(script => {
        const src = script.getAttribute('src');
        if (src) dependencies.push(src);
      });

      return { html, css, js, dependencies };
    });

    // Extraer metadatos desde la página principal (no el iframe)
    const metadata = await page.evaluate(() => {
      // CodePen pone el título en el elemento .preview-title o similar
      const titleEl = document.querySelector('[data-title]') ||
                      document.querySelector('.preview-title') ||
                      document.querySelector('.title');
      const authorEl = document.querySelector('[data-username]') ||
                      document.querySelector('.user-name');

      return {
        title: titleEl?.getAttribute('data-title') || titleEl?.textContent?.trim(),
        author: authorEl?.getAttribute('data-username') || authorEl?.textContent?.trim(),
        authorUrl: authorEl ? authorEl.closest('a')?.href : undefined
      };
    });

    // Detectar preprocesadores (ver sección 6)
    const preprocessors = detectPreprocessors({
      html: code.html,
      css: code.css,
      js: code.js
    });

    // Parsear dependencias absolutas
    const absoluteDependencies = code.dependencies.map(dep => {
      if (dep.startsWith('http')) return dep;
      if (dep.startsWith('//')) return 'https:' + dep;
      // URLs relativas a CodePen - convertir a absolutas
      return `https://codepen.io${dep}`;
    });

    return {
      html: code.html,
      css: code.css,
      js: code.js,
      dependencies: absoluteDependencies,
      preprocessors,
      metadata
    };

  } finally {
    await browser.close();
  }
}
```

#### 7.0.3 Obtención del Nombre del Proyecto

CodePen no expone el nombre del Pen visiblemente en el HTML. Opciones:

1. **Del atributo `data-title`** (preferido):
```typescript
const title = document.querySelector('[data-title]')?.getAttribute('data-title');
```

2. **Del elemento `.preview-title`**:
```typescript
const title = document.querySelector('.preview-title')?.textContent?.trim();
```

3. **Fallback: generar desde URL**:
```typescript
const fallbackName = `Pen ${penId}`; // Si no se encuentra
```

#### 7.0.4 Obtención de License

CodePen no provee información de licencia directamente. Estrategias:

1. **默认值**: MIT (más común en CodePen)
2. **Del autor**: Si el perfil del autor indica licencia
3. **Del código**: Buscar comentarios con license info
4. **Interactivo**: Pedir al usuario que confirme

```typescript
function detectLicense(html: string, css: string, js: string): string {
  const allCode = html + css + js;

  // Buscar comentarios de license
  if (/MIT License/i.test(allCode)) return 'MIT';
  if (/GPLv3/i.test(allCode)) return 'GPL-3.0';
  if (/Apache/i.test(allCode)) return 'Apache-2.0';
  if (/BSD/i.test(allCode)) return 'BSD-3-Clause';
  if (/CC0|Public Domain/i.test(allCode)) return 'CC0-1.0';

  return 'MIT'; // Default
}
```

### 7.1 Flujo de Extracción con Recovery

```typescript
// backend/src/services/scraper/codepen.ts

export async function extractPenWithRecovery(url: string): Promise<ExtractedData> {
  const projectId = generateProjectId(url);
  const tempDir = join(projectsDir, `.tmp_${projectId}`);

  try {
    // 1. Crear directorio temporal
    await fs.mkdir(tempDir, { recursive: true });

    // 2. Extraer con retry
    const code = await extractWithRetry(url, 3);

    // 3. Guardar archivos en temporal
    await fs.writeFile(join(tempDir, 'index.html'), code.html);
    await fs.writeFile(join(tempDir, 'style.css'), code.css);
    await fs.writeFile(join(tempDir, 'script.js'), code.js);

    // 4. Mover a directorio final (atómico)
    const finalDir = join(projectsDir, projectId);
    await fs.rename(tempDir, finalDir);

    // 5. Actualizar index.json
    await updateIndexWithProject(projectId, { status: 'complete' });

    return { ...code, id: projectId, status: 'complete' };

  } catch (error) {
    // 6. Cleanup en caso de error
    await fs.rm(tempDir, { recursive: true, force: true });

    // 7. Marcar como fallido si existe entrada previa
    await updateIndexWithProject(projectId, { status: 'failed', errorMessage: error.message });

    throw new ExtractionError('EXTRACTION_FAILED', 'Error al extraer el Pen', url);
  }
}

async function extractWithRetry(url: string, retries: number): Promise<ExtractedCode> {
  let lastError: Error;

  for (let i = 0; i < retries; i++) {
    try {
      return await extractPen(url);
    } catch (error) {
      lastError = error;

      // No retry en errores de validación
      if (error instanceof ValidationError) throw error;

      // Backoff exponencial: 1s, 2s, 4s
      const delay = Math.pow(2, i) * 1000;
      await sleep(delay);
    }
  }

  throw lastError;
}
```

---

## 7.2 File Locking

Para prevenir race conditions:

```typescript
// backend/src/utils/fileLock.ts

import { writeFile, unlink, access } from 'fs/promises';
import { join } from 'path';

/**
 * Alternativa nativa sin dependencias externas (cross-platform)
 * Usa archivo .lock como semáforo
 */
export async function withProjectLock<T>(
  projectsDir: string,
  projectId: string,
  fn: () => Promise<T>,
  timeoutMs: number = 10000
): Promise<T> {
  const lockFile = join(projectsDir, `.${projectId}.lock`);
  const startTime = Date.now();

  // Esperar a que el lock esté disponible
  while (true) {
    try {
      // Intentar crear archivo lock (flag 'wx' falla si existe)
      await writeFile(lockFile, process.pid.toString(), { flag: 'wx' });
      break; // Lock adquirido
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'EEXIST') {
        throw error; // Error inesperado
      }

      // Timeout check
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Timeout acquiring lock for ${projectId}`);
      }

      // Esperar 100ms antes de reintentar
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  try {
    return await fn();
  } finally {
    // Liberar lock (ignorar error si no existe)
    await unlink(lockFile).catch(() => {});
  }
}

// Uso
await withProjectLock(projectsDir, projectId, async () => {
  // Operaciones críticas - solo un proceso puede ejecutar esto a la vez
  await updateIndexWithProject(projectId, { status: 'complete' });
});
```

---

## 8. Apéndice A: Funciones Auxiliares

### A.1 Funciones de Utilidad

```typescript
// backend/src/utils/helpers.ts

/**
 * Sleep/delay para retries y polling
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Genera ID único para variaciones
 */
export function generateVariationId(projectId: string): string {
  return `${projectId}_v${Date.now()}`;
}

/**
 * Genera ID de proyecto desde URL (hash SHA256)
 */
import { createHash } from 'crypto';

export function generateProjectId(url: string): string {
  const hash = createHash('sha256').update(url).digest('hex');
  return `pen_${hash.slice(0, 8)}`;
}
```

### A.2 Funciones de Index

```typescript
// backend/src/services/storage/projectsIndex.ts

import { readFile, writeFile, rename } from 'fs/promises';
import { join } from 'path';
import { ProjectsIndex, ProjectSummary } from '../types';

/**
 * Lee el índice de proyectos desde archivo
 */
async function readIndex(projectsDir: string): Promise<ProjectsIndex> {
  const indexPath = join(projectsDir, 'index.json');

  try {
    const content = await readFile(indexPath, 'utf-8');
    return JSON.parse(content) as ProjectsIndex;
  } catch (error) {
    // Si no existe o está corrupto, retornar índice vacío
    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      projects: [],
    };
  }
}

/**
 * Escribe índice atómicamente (temp file + rename)
 */
async function writeIndexAtomically(
  index: ProjectsIndex,
  projectsDir: string
): Promise<void> {
  const tempPath = join(projectsDir, 'index.json.tmp');
  const finalPath = join(projectsDir, 'index.json');

  await writeFile(tempPath, JSON.stringify(index, null, 2), 'utf-8');
  await rename(tempPath, finalPath);
}

/**
 * Actualiza o agrega un proyecto al índice
 */
async function updateIndexWithProject(
  projectsDir: string,
  projectId: string,
  updates: Partial<ProjectSummary> & { id: string }
): Promise<void> {
  const index = await readIndex(projectsDir);

  const existingIndex = index.projects.findIndex(p => p.id === projectId);

  if (existingIndex >= 0) {
    // Actualizar proyecto existente
    index.projects[existingIndex] = {
      ...index.projects[existingIndex],
      ...updates,
    };
  } else {
    // Agregar nuevo proyecto
    index.projects.push(updates as ProjectSummary);
  }

  index.lastUpdated = new Date().toISOString();
  await writeIndexAtomically(index, projectsDir);
}

/**
 * Elimina un proyecto del índice
 */
async function removeProjectFromIndex(
  projectsDir: string,
  projectId: string
): Promise<void> {
  const index = await readIndex(projectsDir);

  index.projects = index.projects.filter(p => p.id !== projectId);
  index.lastUpdated = new Date().toISOString();

  await writeIndexAtomically(index, projectsDir);
}
```

### A.3 Funciones de Metadata

```typescript
// backend/src/services/storage/metadata.ts

import { readFile, writeFile, rename } from 'fs/promises';
import { join } from 'path';
import { ProjectMetadata } from '../types';

/**
 * Lee metadata de un proyecto
 */
async function readMetadata(
  projectsDir: string,
  projectId: string
): Promise<ProjectMetadata | null> {
  const metadataPath = join(projectsDir, projectId, 'metadata.json');

  try {
    const content = await readFile(metadataPath, 'utf-8');
    return JSON.parse(content) as ProjectMetadata;
  } catch (error) {
    return null;
  }
}

/**
 * Escribe metadata atómicamente
 */
async function writeMetadata(
  projectsDir: string,
  projectId: string,
  metadata: ProjectMetadata
): Promise<void> {
  const tempPath = join(projectsDir, projectId, 'metadata.json.tmp');
  const finalPath = join(projectsDir, projectId, 'metadata.json');

  await writeFile(tempPath, JSON.stringify(metadata, null, 2), 'utf-8');
  await rename(tempPath, finalPath);
}

/**
 * Lee metadata de archivo directo (para variaciones)
 */
async function readMetadataFile(filePath: string): Promise<ProjectMetadata> {
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content) as ProjectMetadata;
}
```

---

## 9. Apéndice B: Test Cases

### B.1 Tests de API (Backend)

```typescript
// backend/src/__tests__/extract.test.ts

import request from 'supertest';
import { app } from '../app';

describe('POST /api/extract', () => {
  describe('Validación de URL', () => {
    it('debe retornar 400 para URL inválida (no CodePen)', async () => {
      const res = await request(app)
        .post('/api/extract')
        .send({ url: 'https://google.com' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_URL');
      expect(res.body.error.message).toBe('La URL ingresada no es válida');
    });

    it('debe retornar 400 para URL sin protocolo', async () => {
      const res = await request(app)
        .post('/api/extract')
        .send({ url: 'codepen.io/user/pen/abc123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_URL');
    });

    it('debe aceptar URL con /debug', async () => {
      const res = await request(app)
        .post('/api/extract')
        .send({ url: 'https://codepen.io/user/pen/abc123/debug' });

      // Debería pasar validación (puede fallar después por network)
      expect(res.status).not.toBe(400);
    });

    it('debe aceptar URL con query params', async () => {
      const res = await request(app)
        .post('/api/extract')
        .send({ url: 'https://codepen.io/user/pen/abc123?ref=sidebar' });

      expect(res.status).not.toBe(400);
    });
  });

  describe('Extracción exitosa', () => {
    it('debe extraer Pen válido y retornar project summary', async () => {
      const res = await request(app)
        .post('/api/extract')
        .send({ url: 'https://codepen.io/florinpop17/pen/OPyapww' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.project).toMatchObject({
        id: expect.stringMatching(/^pen_[a-f0-9]{8}$/),
        url: 'https://codepen.io/florinpop17/pen/OPyapww',
        status: 'complete',
      });
    });
  });

  describe('Manejo de errores', () => {
    it('debe retornar 404 para Pen que no existe', async () => {
      const res = await request(app)
        .post('/api/extract')
        .send({ url: 'https://codepen.io/user/pen/invalid123' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PEN_NOT_FOUND');
    });

    it('debe retornar 504 para timeout', async () => {
      // Mock para forzar timeout
      jest.spyOn(puppeteer, 'launch').mockImplementation(() => {
        return new Promise(() => {
          // Nunca resuelve - fuerza timeout
        });
      });

      const res = await request(app)
        .post('/api/extract')
        .send({ url: 'https://codepen.io/user/pen/slow123' });

      expect(res.status).toBe(504);
      expect(res.body.error.code).toBe('TIMEOUT');
    });
  });
});

describe('GET /api/projects', () => {
  it('debe retornar lista vacía si no hay proyectos', async () => {
    const res = await request(app).get('/api/projects');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      projects: [],
      total: 0,
    });
  });

  it('debe retornar proyectos existentes', async () => {
    const res = await request(app).get('/api/projects');

    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.projects[0]).toMatchObject({
      id: expect.stringMatching(/^pen_[a-f0-9]{8}$/),
      name: expect.any(String),
      url: expect.any(String),
    });
  });
});

describe('GET /api/health', () => {
  it('debe retornar status ok', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      version: expect.any(String),
      services: expect.any(Object),
    });
  });
});
```

### B.2 Tests de Funciones Auxiliares

```typescript
// backend/src/__tests__/helpers.test.ts

import {
  isValidCodePenUrl,
  generateProjectId,
  generateVariationId,
} from '../utils/helpers';

describe('isValidCodePenUrl', () => {
  it('debe aceptar URLs válidas de CodePen', () => {
    expect(isValidCodePenUrl('https://codepen.io/user/pen/abc123')).toBe(true);
    expect(isValidCodePenUrl('https://www.codepen.io/user/pen/abc123')).toBe(true);
    expect(isValidCodePenUrl('https://codepen.io/user-name/pen/abc123')).toBe(true);
    expect(isValidCodePenUrl('https://codepen.io/user_name/pen/abc123')).toBe(true);
  });

  it('debe aceptar URLs con /debug', () => {
    expect(isValidCodePenUrl('https://codepen.io/user/pen/abc123/debug')).toBe(true);
  });

  it('debe aceptar URLs con query params', () => {
    expect(isValidCodePenUrl('https://codepen.io/user/pen/abc123?ref=sidebar')).toBe(true);
    expect(isValidCodePenUrl('https://codepen.io/user/pen/abc123/debug?foo=bar')).toBe(true);
  });

  it('debe rechazar HTTP (no HTTPS)', () => {
    expect(isValidCodePenUrl('http://codepen.io/user/pen/abc123')).toBe(false);
  });

  it('debe rechazar URLs que no son de CodePen', () => {
    expect(isValidCodePenUrl('https://google.com')).toBe(false);
    expect(isValidCodePenUrl('https://codepen.io')).toBe(false);
  });

  it('debe rechazar proyectos (no son Pens)', () => {
    expect(isValidCodePenUrl('https://codepen.io/user/project/abc123')).toBe(false);
  });
});

describe('generateProjectId', () => {
  it('debe generar ID con formato pen_XXXXXXXX', () => {
    const id = generateProjectId('https://codepen.io/user/pen/abc123');
    expect(id).toMatch(/^pen_[a-f0-9]{8}$/);
  });

  it('debe generar mismo ID para misma URL', () => {
    const id1 = generateProjectId('https://codepen.io/user/pen/abc123');
    const id2 = generateProjectId('https://codepen.io/user/pen/abc123');
    expect(id1).toBe(id2);
  });

  it('debe generar ID diferente para URLs diferentes', () => {
    const id1 = generateProjectId('https://codepen.io/user/pen/abc123');
    const id2 = generateProjectId('https://codepen.io/user/pen/xyz789');
    expect(id1).not.toBe(id2);
  });
});

describe('generateVariationId', () => {
  it('debe generar ID con formato pen_XXXXXXXX_vTIMESTAMP', () => {
    const projectId = 'pen_a3f8c2d1';
    const variationId = generateVariationId(projectId);

    expect(variationId).toMatch(/^pen_[a-f0-9]{8}_v\d+$/);
  });
});
```

### B.3 Tests de Componentes (Frontend)

```typescript
// frontend/src/components/Preview/__tests__/IframeViewer.test.tsx

import { render, screen } from '@testing-library/react';
import IframeViewer from '../IframeViewer';

describe('IframeViewer', () => {
  it('debe renderizar iframe con srcDoc', () => {
    render(
      <IframeViewer
        code={{
          html: '<div>Hello</div>',
          css: 'body { color: red; }',
          js: 'console.log("test")',
        }}
      />
    );

    const iframe = screen.getByTitle('Preview');
    expect(iframe).toBeInTheDocument();
  });

  it('debe incluir dependencias en el head', () => {
    render(
      <IframeViewer
        code={{ html: '<div>Test</div>' }}
        dependencies={['https://example.com/style.css']}
      />
    );

    const iframe = screen.getByTitle('Preview') as HTMLIFrameElement;
    // Verificar que el iframe fue creado (contenido es difícil de testear)
    expect(iframe.srcDoc).toContain('https://example.com/style.css');
  });
});
```

---

## 10. Apéndice C: Variables de Entorno

### Backend (.env)

```bash
# Puerto del servidor
PORT=3001

# Directorio para guardar proyectos
PROJECTS_DIR=./proyectos

# Timeout para extracción (ms)
MAX_EXTRACTION_TIME=60000

# Puppeteer config
PUPPETEER_HEADLESS=true
PUPPETEER_TIMEOUT=30000

# Rate limiting (opcional - usa defaults si no está)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10

# Environment
NODE_ENV=development
```

### Frontend (.env)

```bash
# URL del backend API
VITE_API_URL=http://localhost:3001/api

# Polling interval para transformaciones (ms)
VITE_POLLING_INTERVAL=2000

# Timeout para transformaciones (ms)
VITE_TRANSFORM_TIMEOUT=300000
```

---

## 11. Apéndice D: Dependencias

### Backend (backend/package.json)

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.0",
    "puppeteer": "^21.0.0",
    "archiver": "^6.0.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "tsx": "^4.7.0",
    "@types/node": "^20.10.0",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/archiver": "^6.0.2",
    "@types/uuid": "^9.0.7",
    "@types/supertest": "^6.0.0",
    "supertest": "^6.3.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0"
  }
}
```

### Frontend (frontend/package.json)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "axios": "^1.6.0",
    "dompurify": "^3.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/dompurify": "^3.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "vitest": "^1.0.0",
    "eslint": "^8.56.0"
  }
}
```

---

## 12. Modelo de Variaciones

### 8.1 Schema de Variación

```typescript
interface Variation {
  id: string;
  projectId: string; // Referencia al proyecto padre
  name: string;
  createdAt: string;
  description?: string; // Qué cambios se hicieron

  // Código - SIEMPRE se almacena copia completa (no referencia)
  // NO se hace herencia para evitar complejidad
  code: {
    html: string;
    css?: string;
    js?: string;
  };

  // Metadatos propios
  isPreferred?: boolean; // Si es true, esta variación reemplaza al original
}
```

**Decisión de diseño**: Las variaciones almacenan COPIA COMPLETA del código, no referencia al padre.

**Justificación**:
- Simplicidad: No hay que resolver dependencias en runtime
- Performance: Lectura directa, no merge
- Consistencia: La variación no cambia si el padre cambia
- Fault tolerance: Si el padre se corrupte, la variación survives

### 8.1b Algoritmo de Merge (para referencia futura si se necesita)

Si en el futuro se quiere implementar herencia:

```typescript
// NO implementado - solo referencia
interface MergeStrategy {
  // 1. Clon strategy (implementado)
  // variación = copia completa del padre

  // 2. Patch strategy (futuro)
  // variación = diff del padre, se aplica en runtime
  // Problemas: conflictos, complejidad, debugging

  // 3. Branch strategy (futuro)
  // variación = referencia + overrides
  // Problemas: mismo que patch
}
```

### 8.2 Estructura de Carpetas

```
proyectos/
├── pen_a3f8c2d1/
│   ├── metadata.json
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── variations/
│       ├── pen_a3f8c2d1_v1708099200/
│       │   ├── metadata.json
│       │   ├── index.html
│       │   ├── style.css
│       │   └── script.js
│       └── pen_a3f8c2d1_v1708100000/
│           └── ...
```

### 8.3 Flujo "Guardar como Preferida"

Cuando un usuario marca una variación como "preferida":

**Opción A: Reemplazar original** (RECOMENDADA)
```typescript
async function setPreferredVariation(projectId: string, variationId: string): Promise<void> {
  const variationDir = join(projectsDir, projectId, 'variations', variationId);
  const projectDir = join(projectsDir, projectId);

  // 1. Copiar archivos de variación a proyecto principal
  await fs.copyFile(join(variationDir, 'index.html'), join(projectDir, 'index.html'));
  await fs.copyFile(join(variationDir, 'style.css'), join(projectDir, 'style.css'));
  await fs.copyFile(join(variationDir, 'script.js'), join(projectDir, 'script.js'));

  // 2. Actualizar metadata
  const metadata = await readMetadata(projectId);
  metadata.variations?.forEach(v => v.isPreferred = false);
  const variation = metadata.variations?.find(v => v.id === variationId);
  if (variation) variation.isPreferred = true;

  await writeMetadata(projectId, metadata);
}
```

**Opción B: Crear rama** (No recomendada - complejidad innecesaria)

### 8.4 API de Variaciones

```typescript
// GET /api/projects/:id/variations
async function listVariations(projectId: string): Promise<VariationSummary[]> {
  const variationsDir = join(projectsDir, projectId, 'variations');

  if (!await fs.exists(variationsDir)) return [];

  const dirs = await fs.readdir(variationsDir);
  const variations: VariationSummary[] = [];

  for (const dir of dirs) {
    const metadata = await readMetadataFile(join(variationsDir, dir, 'metadata.json'));
    variations.push({
      id: metadata.id,
      name: metadata.name,
      createdAt: metadata.createdAt,
      description: metadata.description,
    });
  }

  return variations;
}
```

---

## 13. Apéndice E: Checklist de Implementación Detallado

### Fase 0 - Setup (1-2 días)

**Infraestructura:**
- [ ] Inicializar repositorio Git
- [ ] Crear estructura de carpetas (Scaffold.md)
- [ ] Configurar TypeScript en backend y frontend
- [ ] Crear `.env` con variables de entorno (ver Apéndice C)
- [ ] Instalar dependencias backend (`npm install`)
- [ ] Instalar dependencias frontend (`npm install`)
- [ ] Configurar ESLint + Prettier

**Validación:**
- [ ] Ejecutar `npm run build` - debe compilar sin errores
- [ ] Ejecutar `npm run dev` - debe iniciar ambos servidores

---

### Fase 1 - MVP (1 semana)

**Backend:**
- [ ] Implementar `isValidCodePenUrl()` (Sec 2.2)
- [ ] Implementar `generateProjectId()` (Apéndice A.1)
- [ ] Implementar `extractPen()` con Puppeteer
- [ ] Implementar `extractWithRetry()` con backoff (Sec 7.1)
- [ ] Implementar `writeIndexAtomically()` (Apéndice A.2)
- [ ] Implementar `updateIndexWithProject()` (Apéndice A.2)
- [ ] Implementar `FileManager` con directorio temporal
- [ ] Crear endpoint `POST /api/extract` con validación
- [ ] Crear endpoint `GET /api/projects`
- [ ] Crear endpoint `GET /api/projects/:id`
- [ ] Crear endpoint `GET /api/health`
- [ ] Implementar rate limiter básico (Sec 4.3)
- [ ] Implementar `detectPreprocessors()` (Sec 6.1)
- [ ] Implementar `generateLicense()` (Rules.md)

**Frontend:**
- [ ] Crear layout base (App.tsx)
- [ ] Crear componente `URLInput` con validación
- [ ] Crear componente `ExtractButton` con estado loading
- [ ] Crear componente `ExtractStatus` con progreso
- [ ] Implementar `useExtraction` hook
- [ ] Implementar polling de estado (cada 2s)
- [ ] Mostrar éxito/error después de extracción

**Tests:**
- [ ] Tests de validación de URL (Apéndice B.2)
- [ ] Tests de extracción (Apéndice B.1)
- [ ] Tests de health check (Apéndice B.1)

**Criterios de éxito:**
- [ ] Puedo extraer un Pen desde la URL
- [ ] El código se guarda en archivos locales
- [ ] La UI muestra éxito/error
- [ ] Los tests pasan (>80% coverage)

---

### Fase 2 - Galería (1 semana)

**Backend:**
- [ ] Crear endpoint `DELETE /api/projects/:id`
- [ ] Implementar `removeProjectFromIndex()` (Apéndice A.2)
- [ ] Implementar cleanup de archivos al eliminar
- [ ] Crear endpoint `GET /api/projects/:id/variations`

**Frontend:**
- [ ] Crear componente `ProjectCard` con thumbnail
- [ ] Crear componente `ProjectGrid` responsive
- [ ] Crear componente `ProjectFilters` (búsqueda)
- [ ] Crear componente `IframeViewer` con sanitización (Sec 5.4)
- [ ] Implementar `useProjects` hook
- [ ] Implementar confirmación de eliminación
- [ ] Implementar previsualización de proyecto

**Tests:**
- [ ] Tests de listación de proyectos
- [ ] Tests de eliminación de proyectos
- [ ] Tests de IframeViewer (Apéndice B.3)

**Criterios de éxito:**
- [ ] Puedo ver todos los proyectos guardados
- [ ] El previsualizador funciona
- [ ] Puedo eliminar proyectos

---

### Fase 3 - MCP (1 semana)

**MCP Server:**
- [ ] Crear estructura `mcp-server-codepen/`
- [ ] Instalar `@modelcontextprotocol/sdk`
- [ ] Implementar `read_project_files` tool (Sec 3.3)
- [ ] Implementar `write_variation` tool (Sec 3.3)
- [ ] Implementar `list_variations` tool (Sec 3.3)
- [ ] Configurar `claude_desktop_config.json` (Sec 3.2)
- [ ] Probar conexión con Claude Code

**Backend:**
- [ ] Crear endpoint `POST /api/transform/:id`
- [ ] Crear endpoint `GET /api/transform/:id/status/:conversationId`
- [ ] Implementar cola de transformaciones
- [ ] Implementar `setPreferredVariation()` (Sec 8.3)

**Frontend:**
- [ ] Crear componente `ChatPanel` con estados (Sec 5.2)
- [ ] Implementar polling de estado de transformación
- [ ] Crear componente `VariationList`
- [ ] Implementar "guardar como preferida"

**Tests:**
- [ ] Tests de herramientas MCP
- [ ] Tests de transformación

**Criterios de éxito:**
- [ ] Puedo chatear con Claude Code
- [ ] Las modificaciones se guardan
- [ ] Puedo ver variaciones

---

### Fase 4 - Polish (1 semana)

**Backend:**
- [ ] Implementar exportación ZIP (`POST /api/export/:id`)
- [ ] Implementar `generateZip()` con archiver
- [ ] Agregar tests de exportación

**Frontend:**
- [ ] Crear botón de exportar
- [ ] Implementar descarga de ZIP
- [ ] Agregar indicator de progreso

**Documentación:**
- [ ] Actualizar README.md con instrucciones
- [ ] Documentar API endpoints
- [ ] Agregar troubleshooting guide

**Tests:**
- [ ] Tests E2E con Playwright
- [ ] Tests de regresión visual

**Criterios de éxito:**
- [ ] Puedo exportar como ZIP
- [ ] Los tests pasan (>80% coverage)
- [ ] La documentación está completa

---

## 14. Apéndice F: URLs de Referencia

| Recurso | URL |
|---------|-----|
| CodePen Debug View | `https://codepen.io/{user}/pen/{id}/debug` |
| CodePen API (no oficial) | N/A (no hay API pública) |
| Puppeteer Docs | https://pptr.dev/ |
| MCP SDK | https://github.com/modelcontextprotocol/typescript-sdk |
| OpenAPI Spec | https://swagger.io/specification/ |
| DOMPurify | https://github.com/cure53/DOMPurify |
| Express.js | https://expressjs.com/ |
| React Testing Library | https://testing-library.com/react |

---

## Historial de Cambios

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2026-02-16 | 0.1 | Documento inicial creado post-auditoría |
| 2026-02-16 | 0.2 | Post auditoría del SPEC - Agregados: validación URL, rate limiting, polling config, funciones auxiliares, sanitización XSS, test cases, variables de entorno, dependencias, file locking nativo |
| 2026-02-16 | 0.3 | Auditoría profunda - Agregados: arquitectura general, detalles extracción CodePen (Puppeteer, debug endpoint), integración Claude Code completa, justificación storage (JSON vs SQLite), merge strategy para variaciones, límites de validación, determinación de licencia |
