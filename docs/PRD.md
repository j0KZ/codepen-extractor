# PRD - Product Requirements Document

## CodePen Animations Extractor

### 1. Visión del Producto

**Descripción del Producto:**
Sistema web para extraer, almacenar y transformar animaciones de CodePen, integrado con Claude Code Desktop mediante MCP para modificar y crear nuevas animaciones.

**Problema que Resuelve:**
- Los desarrolladores desean reutilizar animaciones de CodePen en sus proyectos
- Necesitan una forma automatizada de extraer y guardar el código
- Quieren modificar las animaciones con ayuda de IA

**Usuarios Objetivo:**
- Desarrolladores web que usan CodePen como fuente de inspiración
- Diseñadores que quieren modificar animaciones existentes
- Creadores de contenido educativo sobre animaciones CSS/JS

---

### 2. Funcionalidades del Producto

#### 2.1 Extracción de Código
- [ ] 输入URL de Pen de CodePen
- [ ] Extraer código HTML, CSS y JavaScript
- [ ] Detectar preprocesadores (SCSS, LESS, Babel, TypeScript)
- [ ] Identificar dependencias externas (CDNs, fuentes, imágenes)
- [ ] Guardar código en sistema de archivos local
- [ ] Generar archivo metadata.json con información del Pen

#### 2.2 Almacenamiento Local
- [ ] Estructura de carpetas por proyecto
- [ ] Archivo LICENSE con atribución automática
- [ ] Índice de proyectos en formato JSON
- [ ] Validar integridad de recursos externos

#### 2.3 Galería y Visualización
- [ ] Lista de proyectos guardados
- [ ] Previsualizador de animaciones (iframe)
- [ ] Información del autor y fecha
- [ ] Mostrar licencia detectada
- [ ] Buscar/filtrar proyectos

#### 2.4 Transformación con IA
- [ ] Integración con Claude Code Desktop
- [ ] Panel de chat para solicitar modificaciones
- [ ] Cambiar colores, tamaños, velocidades
- [ ] Previsualizar cambios en tiempo real
- [ ] Guardar variaciones

#### 2.5 Exportación
- [ ] Descargar como ZIP
- [ ] Incluir LICENSE con atribución
- [ ] Limpiar código para producción

---

### 3. Métricas de Éxito

| Métrica | Objetivo |
|---------|----------|
| Extracciones exitosas | > 90% de URLs válidas |
| Tiempo de extracción | < 30 segundos por Pen |
| Proyectos guardados | Capacidad para 100+ proyectos |
| Integración Claude | Funcional en 100% de intentos |

---

### 4. Dependencias Técnicas

- **Frontend**: React 18+
- **Backend**: Node.js 18+, Express
- **Scraping**: Puppeteer
- **Almacenamiento**: Sistema de archivos (JSON)
- **IA**: Claude Code Desktop (MCP)
- **Testing**: Playwright MCP

---

### 5. Licencias y Legal

- Los Pens públicos de CodePen tienen licencia MIT por defecto
- El sistema debe incluir atribución automática
- Advertir sobre Pens privados o con licencias especiales
- Respetar términos de servicio de CodePen

---

### 6. Limitaciones Conocidas

- CodePen puede bloquear requests automáticos
- Algunos Pens dependen de recursos externos que pueden estar rotos
- Preprocesadores pueden añadir complejidad en la extracción
- Sin acceso a API oficial de CodePen

---

### 7. Roadmap

**Fase 1 (MVP):**
- Extracción básica de Pens
- Guardado en sistema de archivos
- Interfaz simple

**Fase 2:**
- Galería completa
- Previsualizador
- Metadata y licencias

**Fase 3:**
- Integración Claude Code
- Chat de transformaciones

**Fase 4:**
- Exportación ZIP
- Pruebas automatizadas
- Mejoras de rendimiento
