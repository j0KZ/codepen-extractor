# Scaffold - Estructura de Archivos del Proyecto

## Estructura Principal

```
codepen-extractor/
│
├── .gitignore
├── package.json                 # Proyecto root (scripts compartido)
├── README.md
│
├── docs/                       # Documentación
│   ├── PRD.md
│   ├── Architecture.md
│   ├── Rules.md
│   ├── Plan.md
│   ├── Scaffold.md
│   ├── IMPLEMENTATION-SPEC.md
│   ├── SPEC-Context.md              # Context de Claude (NUEVO)
│   ├── SPEC-TransformPolling.md    # Hook de polling (NUEVO)
│   ├── SPEC-Variations.md          # Servicio de variaciones (NUEVO)
│   ├── SPEC-SharedTypes.md         # Tipos compartidos (NUEVO)
│   └── Investigación_Profunda_de_CodePen_y_IA.md
│
├── shared/                         # Código compartido (NUEVO)
│   ├── types/
│   │   └── index.ts
│   └── constants.ts
│
├── frontend/                   # Aplicación React
│   ├── .env
│   ├── .env.local
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── eslint.config.js
│   ├── public/
│   │   └── favicon.ico
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── App.css
│       ├── index.css
│       ├── assets/
│       │   └── logo.svg
│       ├── components/
│       │   ├── Extractor/
│       │   │   └── ExtractorPanel.tsx   # Unificado (NUEVO -更正)
│       │   ├── Gallery/
│       │   │   ├── ProjectCard.tsx
│       │   │   ├── ProjectGrid.tsx
│       │   │   └── ProjectFilters.tsx
│       │   ├── Preview/
│       │   │   ├── IframeViewer.tsx
│       │   │   └── ProjectInfo.tsx
│       │   ├── Transformation/
│       │   │   ├── ChatPanel.tsx
│       │   │   ├── CodeEditor.tsx       # NUEVO -Especificado
│       │   │   └── VariationList.tsx
│       │   └── common/
│       │       ├── Button.tsx
│       │       ├── Input.tsx
│       │       ├── Loading.tsx
│       │       └── ErrorMessage.tsx
│       ├── pages/
│       │   ├── Home.tsx
│       │   ├── Gallery.tsx
│       │   └── Project.tsx
│       ├── hooks/
│       │   ├── useProjects.ts
│       │   ├── useExtraction.ts
│       │   ├── useClaude.ts
│       │   └── useTransformPolling.ts  # NUEVO -Especificado
│       ├── services/
│       │   ├── api.ts
│       │   └── storage.ts
│       ├── context/                   # NUEVO
│       │   ├── ProjectContext.tsx
│       │   ├── ExtractionContext.tsx
│       │   └── ClaudeContext.tsx       # NUEVO
│       ├── types/
│       │   ├── project.ts
│       │   └── extraction.ts
│       └── utils/
│           ├── validation.ts
│           └── formatting.ts
│
├── backend/                    # Servidor Node.js
│   ├── .env
│   ├── package.json
│   ├── tsconfig.json
│   ├── dist/                   # Compilado JavaScript
│   ├── src/
│   │   ├── index.ts            # Entry point
│   │   ├── app.ts              # Express app
│   │   └── config/
│   │       ├── constants.ts
│   │       └── cors.ts          # NUEVO
│   ├── routes/
│   │   ├── projects.ts
│   │   ├── extract.ts
│   │   ├── export.ts
│   │   └── transform.ts         # NUEVO -Completado
│   ├── services/
│   │   ├── scraper/
│   │   │   └── codepen.ts
│   │   ├── storage/
│   │   │   ├── fileManager.ts
│   │   │   ├── projectsIndex.ts
│   │   │   └── variations.ts    # NUEVO -Completado
│   │   └── validation/
│   │       └── resources.ts
│   ├── utils/
│   │   ├── license.ts
│   │   ├── cleanup.ts
│   │   ├── errors.ts
│   │   └── logger.ts            # NUEVO
│   └── middleware/
│       └── rateLimiter.ts
│
├── mcp-server-codepen/         # Servidor MCP (NUEVO)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts
│
└── proyectos/                  # Directorio de proyectos extraídos
    ├── index.json              # Índice de proyectos
    ├── pen_OPyapww/
    │   ├── metadata.json
    │   ├── index.html
    │   ├── style.css
    │   ├── script.js
    │   ├── resources.json
    │   ├── LICENSE
    │   └── variations/
    │       └── variation-1/
    │           ├── index.html
    │           ├── style.css
    │           └── script.js
    └── pen_another/
        └── ...
```

---

## Detalle de Archivos

### Root

#### `.gitignore`
```
# Dependencies
node_modules/

# Build
dist/
build/

# Environment
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# Projects data
proyectos/

# Cache
.cache/
.vite/
```

#### `package.json` (Root)
```json
{
  "name": "codepen-extractor",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "cd backend && npm run dev",
    "build": "npm run build:backend && npm run build:frontend",
    "build:frontend": "cd frontend && npm run build",
    "build:backend": "cd backend && npm run build",
    "start": "cd backend && npm start",
    "lint": "eslint .",
    "test": "jest"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

---

### Backend

#### `backend/package.json`
```json
{
  "name": "codepen-extractor-backend",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts --env-file",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src --ext .ts"
  },
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
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0"
  }
}
```

#### `backend/src/index.ts`
```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { projectsRouter } from './routes/projects';
import { extractRouter } from './routes/extract';
import { exportRouter } from './routes/export';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/projects', projectsRouter);
app.use('/api/extract', extractRouter);
app.use('/api/export', exportRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
```

#### `backend/src/routes/extract.ts`
```typescript
import { Router } from 'express';
import { extractPen } from '../services/scraper/codepen';
import { saveProject } from '../services/storage/fileManager';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { url } = req.body;
    
    // Validar URL
    if (!url || !isValidCodePenUrl(url)) {
      return res.status(400).json({ error: 'URL inválida' });
    }
    
    // Extraer código
    const extractedData = await extractPen(url);
    
    // Guardar proyecto
    const project = await saveProject(extractedData);
    
    res.json({ success: true, project });
  } catch (error) {
    console.error('Error extracting:', error);
    res.status(500).json({ error: 'Error al extraer el Pen' });
  }
});

function isValidCodePenUrl(url: string): boolean {
  const regex = /^https:\/\/(www\.)?codepen\.io\/[\w-]+\/pen\/[\w]+(\/debug)?(\?.*)?$/;
  return regex.test(url);
}

export { router as extractRouter };
```

---

### Frontend

#### `frontend/package.json`
```json
{
  "name": "codepen-extractor-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "eslint": "^8.56.0",
    "@eslint/js": "^9.0.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "globals": "^15.0.0"
  }
}
```

#### `frontend/src/main.tsx`
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ProjectProvider } from './context/ProjectContext';
import { ExtractionProvider } from './context/ExtractionContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProjectProvider>
        <ExtractionProvider>
          <App />
        </ExtractionProvider>
      </ProjectProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

#### `frontend/src/App.tsx`
```typescript
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import Project from './pages/Project';

function App() {
  return (
    <div className="app">
      <header>
        <h1>CodePen Extractor</h1>
        <nav>
          <a href="/">Extraer</a>
          <a href="/gallery">Galería</a>
        </nav>
      </header>
      
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/project/:id" element={<Project />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
```

---

### Tipos Compartidos

#### `frontend/src/types/project.ts`
```typescript
export interface Project {
  id: string;
  name: string;
  url: string;
  author: string;
  authorUrl?: string;
  createdAt: string;
  extractedAt: string;
  license: string;
  status: 'complete' | 'partial' | 'failed';
  preprocessors: {
    html: 'none' | 'pug' | 'haml' | 'markdown';
    css: 'none' | 'scss' | 'less' | 'stylus';
    js: 'none' | 'babel' | 'typescript' | 'coffeescript';
  };
  dependencies: string[];
  hasVariations: boolean;
}

export interface ProjectCode {
  html: string;
  css: string;
  js: string;
}

export interface ProjectWithCode extends Project {
  code: ProjectCode;
}

export interface Variation {
  id: string;
  name: string;
  createdAt: string;
  code: ProjectCode;
}
```

#### `frontend/src/types/extraction.ts`
```typescript
export type ExtractionStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ExtractionState {
  status: ExtractionStatus;
  progress: number;
  message: string;
  error?: string;
}

export interface ExtractionResult {
  success: boolean;
  project?: Project;
  error?: string;
}
```

---

### Servicios

#### `frontend/src/services/api.ts`
```typescript
import axios from 'axios';
import { Project, ProjectWithCode } from '../types/project';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
});

export const extractPen = async (url: string): Promise<Project> => {
  const response = await api.post('/extract', { url });
  return response.data.project;
};

export const getProjects = async (): Promise<Project[]> => {
  const response = await api.get('/projects');
  return response.data;
};

export const getProject = async (id: string): Promise<ProjectWithCode> => {
  const response = await api.get(`/projects/${id}`);
  return response.data;
};

export const deleteProject = async (id: string): Promise<void> => {
  await api.delete(`/projects/${id}`);
};

export const exportProject = async (id: string): Promise<Blob> => {
  const response = await api.post(`/export/${id}`, {}, { responseType: 'blob' });
  return response.data;
};

export default api;
```

---

## Scripts de Setup

### Inicializar Proyecto
```bash
# 1. Crear estructura
mkdir -p codepen-extractor/{frontend/src/{components/{Extractor,Gallery,Preview,Transformation,common},pages,hooks,services,context,types,utils},backend/src/{routes,services/{scraper,storage,validation},utils,config},proyectos,docs}

# 2. Backend
cd backend
npm init -y
npm install express cors dotenv puppeteer archiver uuid
npm install -D typescript tsx @types/node @types/express @types/cors @types/archiver @types/uuid eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser

# 3. Frontend
cd ../frontend
npm create vite@latest . -- --template react-ts
npm install react-router-dom axios

# 4. Root
cd ..
npm install -D concurrently
```

---

## Configuración de Proxy

Para desarrollo local, configurar Vite para hacer proxy al backend:

```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

---

## Comandos de Desarrollo

```bash
# Desarrollo completo
npm run dev

# Solo backend
cd backend && npm run dev

# Solo frontend
cd frontend && npm run dev

# Build para producción
npm run build

# Lint
npm run lint
```

---

## Variables de Entorno

### `backend/.env`
```
NODE_ENV=development
PORT=3001
PROJECTS_DIR=../proyectos
MAX_EXTRACTION_TIME=60000
PUPPETEER_HEADLESS=true
```

### `frontend/.env`
```
VITE_API_URL=http://localhost:3001/api
```

---

## Próximo Paso

Una vez creada esta estructura, ejecutar:

```bash
# Instalar dependencias
npm install

# Verificar que todo compila
npm run build

# Iniciar desarrollo
npm run dev
```

Si todo funciona, procedemos con la **Fase 0: Preparación y Pruebas**.
