# Architecture - Arquitectura del Sistema

## Visión General de la Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Extractor │  │  Galería    │  │  Panel de Transformación │  │
│  │   Panel    │  │  Proyectos  │  │     (Claude Code)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js + Express)                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   API      │  │  Scraper    │  │   File Manager         │  │
│  │   REST     │  │  (Puppeteer)│  │   (Almacenamiento)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  SISTEMA DE ARCHIVOS LOCAL                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                        /proyectos                           ││
│  │   /pen-001/          /pen-002/          /pen-003/           ││
│  │   ├── index.html     ├── index.html     ├── index.html      ││
│  │   ├── style.css      ├── style.css      ├── style.css        ││
│  │   ├── script.js      ├── script.js      ├── script.js        ││
│  │   ├── metadata.json  ├── metadata.json  ├── metadata.json   ││
│  │   └── LICENSE        └── LICENSE        └── LICENSE         ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLAUDE CODE DESKTOP (MCP)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Playwright │  │ Filesystem  │  │   Custom Tools         │  │
│  │    MCP      │  │    MCP      │  │   (CodePen)           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Componentes del Sistema

### 1. Frontend (React)

#### Estructura de Componentes

> **Nota**: Los componentes de Extracción (URLInput, ExtractButton, ExtractStatus) pueden implementarse como componentes separados o agruparse en un único componente `ExtractorPanel` como se especifica en IMPLEMENTATION-SPEC.md.

```
src/
├── components/
│   ├── Extractor/
│   │   └── ExtractorPanel.tsx   # Panel unificado de extracción
│   ├── Gallery/
│   │   ├── ProjectCard.jsx    # Tarjeta de proyecto
│   │   ├── ProjectGrid.jsx    # Grid de proyectos
│   │   └── ProjectFilters.jsx # Filtros de búsqueda
│   ├── Preview/
│   │   ├── IframeViewer.jsx   # Previsualizador
│   │   └── ProjectInfo.jsx    # Info del proyecto
│   └── Transformation/
│       ├── ChatPanel.jsx       # Chat con Claude
│       ├── CodeEditor.jsx      # Editor de código
│       └── VariationList.jsx  # Lista de variaciones
├── pages/
│   ├── Home.jsx               # Página principal
│   ├── Gallery.jsx            # Galería de proyectos
│   └── Project.jsx           # Detalle de proyecto
├── services/
│   ├── api.js                 # Llamadas al backend
│   └── storage.js             # Gestión de archivos
└── App.jsx
```

#### Estado Global (Context API)
- `ProjectContext`: Lista de proyectos y proyecto actual
- `ExtractionContext`: Estado de extracciones activas
- `ClaudeContext`: Estado de conexión con Claude Code y transformaciones

---

### 2. Backend (Node.js + Express)

#### Estructura de Rutas
```
backend/
├── server.js                  # Entry point
├── routes/
│   ├── projects.js           # /api/projects
│   ├── extract.js            # /api/extract
│   └── export.js             # /api/export
├── services/
│   ├── scraper/
│   │   └── codepen.js        # Lógica de scraping
│   ├── storage/
│   │   └── fileManager.js    # Gestión de archivos
│   └── validation/
│       └── resources.js      # Validar URLs
├── utils/
│   ├── license.js            # Detección de licencias
│   └── cleanup.js            # Limpieza de código
└── config/
    └── constants.js          # Constantes globales
```

#### API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/projects` | Listar todos los proyectos |
| GET | `/api/projects/:id` | Obtener detalles de un proyecto |
| POST | `/api/extract` | Extraer código de un Pen |
| DELETE | `/api/projects/:id` | Eliminar un proyecto |
| POST | `/api/export/:id` | Exportar como ZIP |
| POST | `/api/transform/:id` | Enviar código a Claude Code |

> **Nota**: Para especificación completa de endpoints, schemas y manejo de errores, ver [IMPLEMENTATION-SPEC.md](./IMPLEMENTATION-SPEC.md) - **Fuente de Verdad**.

---

### 3. Sistema de Almacenamiento

#### Estructura de Carpetas
```
proyectos/
├── index.json                # Índice de todos los proyectos
├── pen_OPyapww/
│   ├── metadata.json         # Info del Pen
│   ├── index.html            # Código HTML
│   ├── style.css             # Código CSS
│   ├── script.js             # Código JavaScript
│   ├── resources.json        # Dependencias externas
│   ├── LICENSE               # Licencia (atribución)
│   └── variations/           # Variaciones generadas
│       ├── variation-1/
│       │   ├── index.html
│       │   ├── style.css
│       │   └── script.js
│       └── variation-2/
└── pen_another/
    └── ...
```

#### Formato de metadata.json
```json
{
  "id": "pen_OPyapww",
  "name": "Double Slider Sign-in/Sign-up Form",
  "url": "https://codepen.io/florinpop17/pen/OPyapww",
  "author": "Florin Pop",
  "authorUrl": "https://codepen.io/florinpop17",
  "createdAt": "2024-01-15T10:30:00Z",
  "extractedAt": "2026-02-16T00:00:00Z",
  "license": "MIT",
  "licenseUrl": "https://opensource.org/licenses/MIT",
  "preprocessors": {
    "html": "none",
    "css": "scss",
    "js": "babel"
  },
  "dependencies": [
    "https://fonts.googleapis.com/css?family=Montserrat",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"
  ],
  "tags": ["login", "form", "animation", "slider"]
}
```

---

### 4. Integración con Claude Code (MCP)

#### Arquitectura MCP
```
┌──────────────────┐      MCP       ┌──────────────────┐
│  Claude Code     │◄──────────────►│  Custom Server   │
│  Desktop         │                │  (CodePen MCP)   │
└──────────────────┘                └──────────────────┘
       │                                      │
       │                                      ▼
       │                             ┌──────────────────┐
       │                             │   Backend API    │
       │                             │   (Node.js)      │
       │                             └──────────────────┘
       │                                      │
       ▼                                      ▼
┌──────────────────┐                ┌──────────────────┐
│  Playwright MCP  │                │  Filesystem MCP  │
│  (Pruebas)       │                │  (Archivos)      │
└──────────────────┘                └──────────────────┘
```

#### Herramientas MCP Disponibles

1. **Filesystem MCP** (existente)
   - `read_file`: Leer archivos del proyecto
   - `write_file`: Escribir archivos modificados
   - `list_files`: Ver estructura de carpetas

2. **Playwright MCP** (para testing)
   - `navigate_to`: Abrir URL en navegador
   - `click_element`: Interactuar con elementos
   - `screenshot`: Capturar pantalla
   - `evaluate`: Ejecutar JavaScript

3. **Custom CodePen MCP** (a desarrollar)
   - `extract_pen`: Extraer código de URL
   - `save_project`: Guardar en sistema local
   - `list_projects`: Listar proyectos guardados

> **Nota**: Para especificación completa de herramientas MCP, schemas y configuración, ver [IMPLEMENTATION-SPEC.md](./IMPLEMENTATION-SPEC.md) - **Fuente de Verdad**.

---

### 5. Flujo de Datos

#### Extracción de un Pen
```
1. Usuario ingresa URL en frontend
2. Frontend → POST /api/extract
3. Backend lanza Puppeteer
4. Puppeteer navega a Debug View del Pen
5. Puppeteer extrae HTML, CSS, JS
6. Backend detecta preprocesadores
7. Backend extrae dependencias (CDNs, fuentes)
8. Backend genera metadata.json
9. Backend guarda archivos en /proyectos/[id]/
10. Backend → Response con éxito
11. Frontend actualiza galería
```

#### Transformación con Claude
```
1. Usuario selecciona proyecto
2. Usuario envía mensaje en chat
3. Frontend → Claude Code (via MCP)
4. Claude Code lee archivos del proyecto
5. Claude Code analiza y modifica código
6. Claude Code escribe archivos en /variations/
7. Frontend previsualiza variación
8. Usuario guarda o descarta variación
```

---

### 6. Diagrama de Secuencia - Extracción

```
┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐
│Usuario │     │Frontend│     │Backend │     │Puppeteer│
└───┬────┘     └───┬────┘     └───┬────┘     └───┬────┘
    │             │             │             │
    │ 1.Ingresa URL│             │             │
    │────────────►│             │             │
    │             │ 2.POST /api/extract       │
    │             │────────────►│             │
    │             │             │ 3.Iniciar   │
    │             │             │────────────►│
    │             │             │             │ 4.Navegar a
    │             │             │             │   Debug View
    │             │             │◄────────────│
    │             │             │ 5.Código    │
    │             │◄────────────│  extraído   │
    │             │             │             │
    │ 6.Muestra  │             │             │
    │  éxito     │             │             │
    │◄───────────│             │             │
    │             │             │             │
```

---

### 7. Consideraciones de Seguridad

| Aspecto | Medida |
|---------|--------|
| XSS | Sanitizar código extraído antes de renderizar |
| Rate limiting | Limitar requests a CodePen |
| Dependencias | Validar URLs externas antes de guardar |
| Archivos | No ejecutar código de proyectos externos |
| Licencias | Advertir sobre licencias no-MIT |

---

### 8. Escalabilidad

- **Horizontal**: Múltiples instancias del backend
- **Vertical**: Mejorar Puppeteer con caching
- **Storage**: Migrar a SQLite si hay muchos proyectos
- **Cache**: Implementar caché para proyectos frecuentes

---

### 9. Tecnologías y Versiones

| Tecnología | Versión Mínima |
|------------|----------------|
| Node.js | 18.x |
| React | 18.x |
| Express | 4.x |
| Puppeteer | 21.x |
| TypeScript | 5.x |
| Vite | 5.x |

---

### 10. Ambiente de Desarrollo

```
# Estructura de variables de entorno
NODE_ENV=development
PORT=3001
PROJECTS_DIR=./proyectos
MAX_EXTRACTION_TIME=60000
PUPPETEER_HEADLESS=true
```
