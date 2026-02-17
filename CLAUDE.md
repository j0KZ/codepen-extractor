# CLAUDE.md - CodePen Extractor

> Este archivo contiene instrucciones específicas para Claude Code en este proyecto.

## Fuente de Verdad

La documentación definitiva para implementar es **[docs/IMPLEMENTATION-SPEC.md](./docs/IMPLEMENTATION-SPEC.md)**. Todo lo que necesitas para codificar está ahí.

## Estructura del Proyecto

```
codepen_extractor/
├── docs/                    # Documentación (LEER PRIMERO)
│   ├── IMPLEMENTATION-SPEC.md   # ⭐ FUENTE DE VERDAD
│   ├── Architecture.md          # Arquitectura técnica
│   ├── Rules.md                 # Reglas y convenciones
│   ├── SPEC-*.md                # Especificaciones detalladas
│   └── README.md                # Índice de documentación
├── src/                     # Frontend (React + Vite)
├── backend/                # Backend (Express + Puppeteer)
└── proyectos/              # Proyectos extraídos (generado)
```

## Reglas del Proyecto

1. **Antes de implementar**: Leer `docs/IMPLEMENTATION-SPEC.md` - tiene TODA la especificación
2. **Errores**: Validar con el schema definido en IMPLEMENTATION-SPEC.md
3. **API**: Usar los endpoints documentados, NO inventar nuevos
4. **Componentes**: Seguir los nombres y estructura en Architecture.md
5. **Tipos**: Usar SharedTypes documentados en SPEC-SharedTypes.md
6. **MCP**: Si agregas herramientas, documentar en SPEC-CustomMCP (por crear)

## Workflow

| Fase | Docs Clave |
|------|------------|
| Implementar | IMPLEMENTATION-SPEC.md |
| Arquitectura | Architecture.md |
| Reglas | Rules.md |
| UI/UX | SPEC-CodeEditor.md |
| Context | SPEC-Context.md |
| Variaciones | SPEC-Variations.md |
| Polling | SPEC-TransformPolling.md |

## Stack

- **Frontend**: React 18 + Vite + TypeScript
- **Backend**: Express + Puppeteer
- **Integración**: MCP (Claude Code)
- **Storage**: JSON + archivos locales

## Comandos

```bash
# Desarrollo
npm run dev          # Frontend
npm run backend      # Backend

# Build
npm run build        # Frontend
```
