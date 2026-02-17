# Plan - Plan de Implementación

## Resumen del Plan

Este documento detalla el plan de implementación del sistema de extracción de animaciones de CodePen. El desarrollo se divide en 4 fases principales, comenzando con un MVP funcional.

---

## Fases de Desarrollo

### 🔵 Fase 0: Preparación y Pruebas (1-2 días)

**Objetivo**: Validar viabilidad técnica antes de desarrollar

#### Tareas

- [ ] **0.1** Investigar métodos de extracción de CodePen
  - Probar Debug View manual
  - Documentar estructura HTML
  - Identificar limitaciones

- [ ] **0.2** Configurar entorno de desarrollo
  - Node.js instalado
  - Editor configurado (VS Code)
  - Git inicializado

- [ ] **0.3** Crear estructura base del proyecto
  - Inicializar repositorio Git
  - Crear README inicial

- [ ] **0.4** Documentar hallazgos de CodePen
  - Actualizar Investigación_Profunda
  - Definir estrategia de scraping

---

### 🟢 Fase 1: MVP - Extracción Básica (1 semana)

**Objetivo**: Sistema mínimo que pueda extraer y guardar un Pen

#### Tareas

**Semana 1 - Día 1-2: Estructura del Proyecto**
- [ ] **1.1** Inicializar proyecto con Vite + React
  ```bash
  npm create vite@latest frontend -- --template react-ts
  cd frontend && npm install
  ```

- [ ] **1.2** Inicializar backend with Express
  ```bash
  mkdir backend && cd backend
  npm init -y
  npm install express cors dotenv
  npm install -D typescript @types/node
  ```

- [ ] **1.3** Crear estructura de carpetas
  ```
  codepen-extractor/
  ├── frontend/
  ├── backend/
  ├── proyectos/
  ├── docs/
  └── package.json
  ```

**Semana 1 - Día 3-4: Scraper Básico**
- [ ] **1.4** Instalar Puppeteer
  ```bash
  cd backend
  npm install puppeteer
  ```

  > **Nota para Windows**: Puppeteer puede requerir instalación manual de Chrome.
  > Si la instalación automática falla, ejecutar:
  > ```bash
  > npx puppeteer browsers install chrome
  > ```
  >
  > Alternativa: Usar `puppeteer-core` con una instalación existente de Chrome:
  > ```bash
  > npm install puppeteer-core
  > ```
  > Luego configurar la ruta al ejecutable de Chrome en tu sistema.

  > **Nota para Windows**: Puppeteer puede requerir instalación manual de Chrome. Si la instalación falla, ejecutar:
  > ```bash
  > npx puppeteer browsers install chrome
  > ```
  >
  > Alternativa: usar `puppeteer-core` con una instalación existente de Chrome:
  > ```bash
  > npm install puppeteer-core
  > ```
  > Y configurar la ruta al ejecutable de Chrome en el sistema.

- [ ] **1.5** Crear módulo de scraping
  - `backend/services/scraper/codepen.js`
  - Navegar a Debug View
  - Extraer HTML, CSS, JS

- [ ] **1.5.1** Técnica de Debug View
  Para extraer código limpio de CodePen, usar la URL de Debug View:
  ```
  URL normal:  https://codepen.io/florinpop17/pen/OPyapww
  Debug View:  https://codepen.io/florinpop17/pen/OPyapww/debug
  ```
  - La URL Debug View elimina el overhead de CodePen
  - Permite acceso directo al iframe del Pen
  - Construcción: `https://codepen.io/{username}/pen/{pen_id}/debug`

- [ ] **1.5.2** Snippet de Extracción con Puppeteer
  ```typescript
  // backend/services/scraper/codepen.ts
  import puppeteer, { Browser, Page } from 'puppeteer';
  
  interface ExtractedCode {
    html: string;
    css: string;
    js: string;
    author: string;
    title: string;
  }
  
  export async function extractPen(url: string): Promise<ExtractedCode> {
    // Extraer username y pen_id de la URL
    const match = url.match(/codepen\.io\/([^\/]+)\/pen\/([^\/]+)/);
    if (!match) throw new Error('URL de CodePen inválida');
    
    const [, username, penId] = match;
    const debugUrl = `https://codepen.io/${username}/pen/${penId}/debug`;
    
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      // Configurar user-agent para evitar detección
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      );
      
      // Navegar a Debug View
      await page.goto(debugUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Extraer código del iframe de CodePen
      const code = await page.evaluate(() => {
        // Usamos el iframe de preview porque contiene el código ya compilado
        const iframe = document.querySelector('iframe[title="CodePen Preview"]') as HTMLIFrameElement;
        if (!iframe) throw new Error('Iframe de vista previa no encontrado');

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) throw new Error('No se puede acceder al documento del iframe');

        // Extraer HTML del body
        const html = iframeDoc.body.innerHTML;

        // Extraer CSS de los tags style
        const styles = iframeDoc.querySelectorAll('style');
        const css = Array.from(styles).map(s => s.textContent).join('\n');

        // Extraer JS de los scripts (excluyendo externos)
        const scripts = iframeDoc.querySelectorAll('script:not([src])');
        const js = Array.from(scripts).map(s => s.textContent).join('\n');
        
        return {
          html,
          css,
          js
        };
      });
      
      // Extraer metadatos del documento
      const metadata = await page.evaluate(() => {
        const title = document.title || 'Untitled';
        // El autor puede obtenerse de meta tags o estructura del DOM
        const authorMeta = document.querySelector('meta[name="author"]');
        return {
          title,
          author: authorMeta?.getAttribute('content') || 'Unknown'
        };
      });
      
      return { ...code, ...metadata };
    } finally {
      await browser.close();
    }
  }
  ```

- [ ] **1.5.3** Manejo de Errores de CodePen
  ```
  Errores comunes y su manejo:
  
  | Error | Código | Acción |
  |-------|--------|--------|
  | Forbidden | 403 | Esperar 5 min, usar proxy, cambiar User-Agent |
  | Too Many Requests | 429 | Implementar backoff exponencial (1s, 2s, 4s, 8s) |
  | Not Found | 404 | El Pen no existe o es privado |
  | Timeout | - | Aumentar timeout a 60s, reintentar 1 vez |
  | Iframe vacío | - | La página no cargó completamente, esperar más |
  
  Implementar retry con exponential backoff:
  ```typescript
  async function fetchWithRetry(url: string, retries = 3): Promise<string> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fetch(url);
      } catch (error) {
        if (i === retries - 1) throw error;
        await sleep(Math.pow(2, i) * 1000); // 1s, 2s, 4s
      }
    }
    throw new Error('Max retries exceeded');
  }
  ```
  ```

- [ ] **1.6** Crear endpoint de extracción
  - `POST /api/extract`
  - Validar URL
  - Llamar al scraper

**Semana 1 - Día 5: Sistema de Archivos**
- [ ] **1.7** Crear FileManager
  - `backend/services/storage/fileManager.js`
  - Crear carpetas por proyecto
  - Guardar archivos (HTML, CSS, JS)

- [ ] **1.8** Generar metadata.json
  - ID, nombre, autor, fecha
  - Dependencias detectadas

- [ ] **1.9** Crear LICENSE automático
  - Plantilla MIT
  - Incluir atribución

**Semana 1 - Día 6-7: Integración Frontend**
- [ ] **1.10** Crear UI básico
  - Input de URL
  - Botón de extraer
  - Estado de carga

- [ ] **1.11** Conectar con backend
  - Llamar API extracción
  - Mostrar resultado

- [ ] **1.12** Testing MVP
  - Probar con 3-5 URLs diferentes
  - Documentar errores

---

### 🟡 Fase 2: Galería y Visualización (1 semana)

**Objetivo**: Ver los proyectos guardados en una interfaz

#### Tareas

**Semana 2 - Día 1-2: API de Proyectos**
- [ ] **2.1** Crear endpoint GET /api/projects
  - Listar todos los proyectos
  - Devolver metadata resumida

- [ ] **2.2** Crear endpoint GET /api/projects/:id
  - Obtener detalles de un proyecto
  - Devolver código completo

- [ ] **2.3** Crear endpoint DELETE /api/projects/:id
  - Eliminar proyecto
  - Limpiar archivos

**Semana 2 - Día 3-4: Frontend - Galería**
- [ ] **2.4** Crear componente ProjectCard
  - Thumbnail/preview
  - Nombre del proyecto
  - Autor
  - Fecha de extracción

- [ ] **2.5** Crear componente ProjectGrid
  - Grid responsive
  - Cargar proyectos desde API

- [ ] **2.6** Agregar búsqueda/filtrado
  - Buscar por nombre
  - Filtrar por fecha

**Semana 2 - Día 5-6: Previsualizador**
- [ ] **2.7** Crear IframeViewer
  - Renderizar HTML + CSS + JS
  - Sandbox para seguridad

- [ ] **2.8** Mostrar información del proyecto
  - Código fuente
  - Dependencias
  - Licencia

- [ ] **2.9** Detectar preprocesadores
  - SCSS, LESS, Babel, TypeScript
  - Mostrar en metadata

**Semana 2 - Día 7: Mejoras**
- [ ] **2.10** Validar recursos externos
  - Verificar URLs de CDNs
  - Advertir si hay rotos

- [ ] **2.11** Optimizar rendimiento
  - Cache de thumbnails
  - Carga lazy

---

### 🟠 Fase 3: Integración Claude Code (1 semana)

**Objetivo**: Transformar animaciones usando IA

#### Tareas

**Semana 3 - Día 1-2: Configuración MCP**
- [ ] **3.1** Instalar Claude Code Desktop
  - Descargar desde: https://github.com/anthropics/claude-code/releases
  - Instalar en el sistema
  - Agregar al PATH (en Windows: agregar directorio de instalación a Variables de Entorno)
  - Verificar instalación ejecutando: `claude --version`
  - Configurar API key de Anthropic si es requerido

- [ ] **3.2** Configurar Filesystem MCP
  - Conectar con proyecto
  - Permisos de lectura/escritura

- [ ] **3.3** Configurar Playwright MCP
  - Instalar servidor
  - Probar navegación

- [ ] **3.3.1** Spec de Integración MCP con Backend
  
  La integración usa el protocolo stdio de MCP. El frontend se comunica con Claude Code mediante un proceso hijo, y Claude usa herramientas MCP para operar.
  
  **Arquitectura de Comunicación:**
  ```
  ┌─────────────┐    HTTP/REST    ┌─────────────┐    stdio    ┌─────────────┐
  │   Frontend  │ ◄──────────────► │   Backend   │ ◄─────────► │ Claude Code │
  │   (React)   │                 │  (Express)  │              │   (MCP)     │
  └─────────────┘                 └─────────────┘              └─────────────┘
  ```
  
  **Flujo de Transformación:**
  1. Usuario envía mensaje en frontend
  2. Frontend → Backend: `/api/transform/{projectId}` (guarda el mensaje)
  3. Frontend → Claude Code: ejecuta tool `mcp_server_codepen.transform`
  4. Claude Code → Filesystem MCP: Lee archivos del proyecto
  5. Claude Code → Genera código modificado
  6. Claude Code → Filesystem MCP: Escribe en `variations/{id}/`
  7. Frontend → Backend: `/api/projects/{id}/variations` (obtiene variaciones)
  8. Frontend: Actualiza preview con nueva variación
  
  **Herramientas MCP disponibles:**
  ```json
  {
    "tools": [
      {
        "name": "read_project_files",
        "description": "Lee los archivos HTML, CSS, JS de un proyecto",
        "input": { "projectId": "string" }
      },
      {
        "name": "write_variation", 
        "description": "Escribe una variación del proyecto",
        "input": { "projectId": "string", "variationId": "string", "code": { "html": "string", "css": "string", "js": "string" } }
      },
      {
        "name": "list_variations",
        "description": "Lista todas las variaciones de un proyecto",
        "input": { "projectId": "string" }
      },
      {
        "name": "test_animation",
        "description": "Usa Playwright para probar la animación",
        "input": { "variationId": "string" }
      }
    ]
  }
  ```
  
  **Prompt del Sistema para Claude:**
  ```markdown
  Eres un asistente especializado en modificar animaciones CSS y JavaScript.
  Tienes acceso a los archivos de un proyecto extraído de CodePen.
  
  Responsabilidades:
  1. Analizar el código existente
  2. Proponer modificaciones específicas cuando el usuario lo pida
  3. Explicar los cambios realizados
  4. Respetar la licencia MIT del código original
  
  Comandos disponibles:
  - "cambiar-color #FF0000": Cambia el color principal a rojo
  - "cambiar-velocidad 0.5s": Cambia la duración de animaciones
  - "cambiar-tamaño 200px": Cambia dimensiones
  - "analizar": Explica cómo funciona el código
  
  Restricciones:
  - NO eliminar la atribución al autor original
  - NO cambiar la licencia del código
  - Mantener la estructura de archivos
  ```

**Semana 3 - Día 3-4: Chat de Transformación**
- [ ] **3.4** Crear UI de chat
  - Input de mensajes
  - Historial de conversación
  - Indicador de estado

- [ ] **3.5** Integrar con Claude Code
  - Enviar mensajes
  - Recibir respuestas
  - Ejecutar comandos

- [ ] **3.6** Definir comandos permitidos
  - cambiar-color
  - cambiar-velocidad
  - cambiar-tamaño
  - analizar
  - crear-variacion

**Semana 3 - Día 5-6: Modificación de Código**
- [ ] **3.7** Leer archivos del proyecto
  - Usar filesystem MCP
  - Pasar código a Claude

- [ ] **3.8** Escribir archivos modificados
  - Guardar en variations/
  - Mantener original

- [ ] **3.9** Previsualizar cambios
  - Actualizar iframe
  - Mostrar variación

**Semana 3 - Día 7: Variaciones**
- [ ] **3.10** Gestionar variaciones
  - Listar variaciones
  - Comparar con original
  - Eliminar variación

- [ ] **3.11** Guardar preferred variación
  - Exportar como variación principal

---

### 🔴 Fase 4: Funciones Avanzadas (1 semana)

**Objetivo**: Mejoras finales y polish

#### Tareas

**Semana 4 - Día 1-2: Exportación**
- [ ] **4.1** Crear endpoint de exportación
  - Generar ZIP
  - Incluir LICENSE

- [ ] **4.2** Descarga desde frontend
  - Botón de exportar
  - Progress indicator

- [ ] **4.3** Limpiar código para producción
  - Eliminar comentarios innecesarios
  - Minificar si es necesario

**Semana 4 - Día 3-4: Testing Automatizado**
- [ ] **4.4** Configurar Playwright MCP
  - Probar animaciones
  - Capturar screenshots

- [ ] **4.5** Tests de regresión
  - Verificar extracciones
  - Comparar con baseline

- [ ] **4.6** Validación de recursos
  - Check de CDNs
  - Alertas de recursos rotos

**Semana 4 - Día 5-6: Documentación**
- [ ] **4.7** README completo
  - Instalación
  - Uso
  - Troubleshooting

- [ ] **4.8** Documentar API
  - Endpoints
  - Formatos de request/response

- [ ] **4.9** Guía de contribución

**Semana 4 - Día 7: Deploy y Polish**
- [ ] **4.10** Optimizaciones finales
  - Performance
  - UX

- [ ] **4.11** Limpiar código
  - Eliminar console.logs
  - Comentar código

- [ ] **4.12** Release v1.0
  - Tag en Git
  - Documentar cambios

---

## Timeline Visual

```
Mes 1:
├── Semana 1: Fase 1 (MVP)
├── Semana 2: Fase 2 (Galería)
├── Semana 3: Fase 3 (Claude)
└── Semana 4: Fase 4 (Avanzado)
```

---

## Dependencias entre Fases

```
Fase 0 ──► Fase 1 ──► Fase 2 ──► Fase 3 ──► Fase 4
   │          │          │          │          │
   │          │          │          │          │
   ▼          ▼          ▼          ▼          ▼
Pruebas   Extracción   Galería   IA +      Export
iniciales  básica      +Preview   Chat      +Tests
```

---

## Criterios de Éxito por Fase

### Fase 1 (MVP)
- [ ] Puedo extraer un Pen desde la URL
- [ ] El código se guarda en archivos locales
- [ ] La UI muestra éxito/error

### Fase 2 (Galería)
- [ ] Puedo ver todos los proyectos guardados
- [ ] El previsualizador funciona
- [ ] Puedo eliminar proyectos

### Fase 3 (Claude)
- [ ] Puedo chatear con Claude Code
- [ ] Las modificaciones se guardan
- [ ] Puedo ver variaciones

### Fase 4 (Avanzado)
- [ ] Puedo exportar como ZIP
- [ ] Los tests pasan
- [ ] La documentación está completa

---

## Gestión de Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|-------------|
| CodePen bloquea scraping | Alta | Alto | Usar Debug View, delays, user-agents |
| Problemas con Puppeteer | Media | Medio | Tests exhaustivos, manejo de errores |
| Claude Code no se integra | Baja | Alto | Documentar configuración, fallback manual |
| Dependencias externas rotas | Media | Bajo | Validar URLs, warnear usuario |

---

## Recursos Necesarios

### Humanos
- 1 desarrollador (tú)

### Técnicos
- Node.js 18+
- Claude Code Desktop
- Puppeteer
- React + Express

### Tiempo Estimado
- Total: 4 semanas (1 mes)
- Dedicación: 4-8 horas/día

---

## Siguiente Paso

Una vez aprobada esta fase, comenzar con **Fase 0: Preparación y Pruebas**

¿Hay algo que quieras ajustar del plan antes de comenzar?
