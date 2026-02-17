# Rules - Reglas y Convenciones del Proyecto

## 1. Reglas de Código

### 1.1 Estándares de Código

| Aspecto | Regla |
|---------|-------|
| Lenguaje | TypeScript (strongly recommended) o JavaScript moderno (ES6+) |
| Linting | ESLint con configuración Prettier |
| Formatting | Prettier con 2 espacios |
| Testing | Vitest para backend, React Testing Library para frontend |

### 1.2 Convenciones de Nombres

```
// Archivos JavaScript: kebab-case
mi-archivo.js

// Archivos TypeScript: kebab-case
mi-archivo.ts
mi-helper.ts

// Componentes React: PascalCase
MiComponente.tsx
ProjectCard.tsx

// Funciones: camelCase
function obtenerProyectos() {}
const guardarProyecto = () => {}

// Constantes: UPPER_SNAKE_CASE
const MAX_EXTRACTION_TIME = 60000;
const API_BASE_URL = '/api';

// Clases: PascalCase
class GestorProyectos {}
```

### 1.3 Estructura de Commits

```
<tipo>(<alcance>): <descripción>

Tipos:
- feat: Nueva funcionalidad
- fix: Corrección de bug
- docs: Documentación
- style: Formateo
- refactor: Refactorización
- test: Pruebas
- chore: Mantenimiento

Ejemplos:
feat(extractor): agregar soporte para preprocesadores SCSS
fix(galeria): corregir renderizado de thumbnails
docs(readme): actualizar instrucciones de instalación
```

---

## 2. Reglas de Git

### 2.1 Ramas (Branching Strategy)

```
main (producción)
  │
  ├── develop (desarrollo)
  │    │
  │    ├── feature/nombre-rama
  │    ├── bugfix/nombre-rama
  │    └── refactor/nombre-rama
  │
  └── hotfix/nombre-rama (emergencias)
```

### 2.2 Protección de Ramas

| Rama | Reglas |
|------|--------|
| main | Merge solo via Pull Request, 2 aprobaciones |
| develop | Merge después de tests pasando |
| feature/* | Merge a develop después de PR |

### 2.3 Archivos Ignorados (.gitignore)

```
node_modules/
dist/
build/
.env
.env.local
*.log
.DS_Store
proyectos/
.cache/
```

---

## 3. Reglas de Arquitectura

### 3.1 Patrones de Diseño

**Frontend (React):**
- Componentes funcionales con Hooks
- Context API para estado global
- Custom Hooks para lógica reutilizable
- Atomic Design para estructura de componentes

**Backend (Node.js):**
- Patrón MVC simplificado
- Middlewares para cross-cutting concerns
- Servicios para lógica de negocio
- Repository pattern para acceso a datos

### 3.2 Dependencias

```
PROHIBIDO:
- jQuery (usar React o vanilla JS)
- Bibliotecas obsoletas (>2 años sin update)
- Bibliotecas sin TypeScript support

PREFERIDO:
- Estado: React Context o Zustand
- HTTP: Axios o Fetch API
- CSS: CSS Modules o Tailwind
- Testing: Vitest o Jest
```

---

## 4. Reglas de Extracción

### 4.1 Validación de URLs

```javascript
// Regex válido para URLs de CodePen (soporta /debug y query params)
// Nota: [a-zA-Z0-9_-] es más explícito que [\w-] para evitar confusiones
const CODEPEN_URL_REGEX = /^https:\/\/(www\.)?codepen\.io\/[a-zA-Z0-9_-]+\/pen\/[a-zA-Z0-9]+(\/debug)?(\?.*)?$/;

function isValidCodePenUrl(url) {
  return CODEPEN_URL_REGEX.test(url);
}
```

### 4.2 Rate Limiting

| Operación | Límite |
|-----------|--------|
| Extracciones por IP | 10/minuto |
| Extracciones por usuario | 50/hora |
| Tamaño máximo de código | 1MB por archivo |

### 4.3 Manejo de Errores

```javascript
// Tipos de errores permitidos
class ExtractionError extends Error {
  constructor(message, code, details) {
    super(message);
    this.code = code; // 'INVALID_URL', 'NETWORK_ERROR', etc.
    this.details = details;
  }
}

// Siempre manejar errores así
try {
  await extraerPen(url);
} catch (error) {
  if (error instanceof ExtractionError) {
    // Manejar error conocido
    console.error(error.code, error.message);
  } else {
    // Error inesperado
    console.error('Error inesperado:', error);
  }
}
```

---

## 5. Reglas de Almacenamiento

### 5.1 Estructura de Proyectos

```
proyectos/
├── [pen-id]/
│   ├── index.html        (OBLIGATORIO)
│   ├── style.css        (OBLIGATORIO si existe)
│   ├── script.js        (OBLIGATORIO si existe)
│   ├── metadata.json    (OBLIGATORIO)
│   ├── LICENSE          (OBLIGATORIO)
│   ├── resources.json   (OPCIONAL)
│   └── variations/       (OPCIONAL)
│       └── [variation-id]/
│           ├── index.html
│           ├── style.css
│           └── script.js
└── index.json           (OBLIGATORIO - índice)
```

### 5.2 Validación de Archivos

| Campo | Validación |
|-------|------------|
| id | Solo letras, números, guiones |
| nombre | Max 100 caracteres |
| código | Max 1MB por archivo |
| dependencias | Max 20 URLs |

---

## 6. Reglas de Licencia

### 6.1 Atribución Automática

Todo proyecto extraído debe incluir:

```text
LICENSE
=======
Código extraído de: [URL del Pen]
Autor: [Nombre del autor]
Licencia: MIT

MIT License

Copyright (c) [año] [Nombre del autor]

[Texto completo de licencia MIT]
```

### 6.2 Detección de Licencias

```
1. Por defecto: MIT (CodePen default)
2. Si el Pen indica otra licencia: usar esa
3. Si es privado: Advertir al usuario
4. Si tiene dependencias: Incluir sus licencias
```

---

## 7. Reglas de Integración Claude Code

### 7.1 Prompts del Sistema

```markdown
Eres un asistente de IA especializado en modificar animaciones CSS y JavaScript.
Tienes acceso a los archivos de un proyecto extraído de CodePen.

Tus responsabilidades:
1. Analizar el código existente
2. Proponer modificaciones específicas
3. Explicar los cambios realizados
4. Respetar la licencia MIT del código original

No puedes:
1. Eliminar la atribución al autor original
2. Usar código de fuentes no confiables
3. Modificar la licencia del código original
```

### 7.2 Comandos Permitidos

| Comando | Descripción |
|---------|-------------|
| cambiar-color | Modificar colores CSS |
| cambiar-velocidad | Ajustar duración de animaciones |
| cambiar-tamaño | Modificar dimensiones |
| analizar | Explicar cómo funciona el código |
| crear-variacion | Generar una nueva versión |

---

## 8. Reglas de Seguridad

### 8.1 Validación de Entrada

```javascript
// NUNCA confiar en input del usuario
function sanitizeInput(input) {
  // Eliminar caracteres peligrosos
  return input
    .replace(/[<>]/g, '')
    .trim()
    .substring(0, 1000);
}

// Validar URLs antes de usarlas
function isSafeUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
```

### 8.2 Protección contra XSS

```
- NUNCA usar innerHTML con código del usuario
- Usar textContent o funciones de sanitización
- En el preview: sandbox del iframe
- CSP headers en producción
```

---

## 9. Reglas de Documentación

### 9.1 Documentación de Código

```javascript
/**
 * Extrae el código de un Pen de CodePen
 * @param {string} url - URL completa del Pen
 * @returns {Promise<ExtractedProject>} Proyecto extraído
 * @throws {ExtractionError} Si la URL es inválida o la extracción falla
 *
 * @example
 * const proyecto = await extractPen('https://codepen.io/user/pen/abc123');
 * console.log(proyecto.html);
 */
async function extractPen(url) {
  // implementación
}
```

### 9.2 README del Proyecto

Cada nuevo feature debe incluir:
- Descripción breve
- Uso con ejemplo
- Dependencies nuevas (si hay)
- Tests relacionados

---

## 10. Reglas de Testing

### 10.1 Cobertura Mínima

| Tipo | Cobertura Mínima |
|------|-------------------|
| Backend | 80% |
| Frontend (lógica) | 70% |
| Componentes | 50% |

### 10.2 Tipos de Tests

```
- Unit Tests: Funciones individuales
- Integration Tests: APIs y flujos
- E2E Tests: Via Playwright MCP
- Visual Tests: Capturas de pantalla
```

---

## 11. Reglas de Deployment

### 11.1 Environments

```
development:
  - Debug enabled
  - Hot reload
  - localhost

production:
  - Minified
  - Optimized
  - HTTPS required
```

### 11.2 Variables de Entorno Requeridas

```
NODE_ENV=production|development
PORT=number
PROJECTS_DIR=path
```

---

## 12. Reglas de Contribución

### 12.1 Pull Request

- [ ] Tests pasando
- [ ] Documentación actualizada
- [ ] No hay warnings de lint
- [ ] Código revisado por 1 persona
- [ ] Branch actualizado con develop

### 12.2 Code Review

- Revisar style guide
- Verificar tests
- Asegurar documentación
- Probar manualmente si es necesario
