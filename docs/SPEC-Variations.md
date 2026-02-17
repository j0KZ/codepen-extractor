# SPEC - Variaciones

> Especificación para implementar el servicio de variaciones en el backend

## Propósito

Manejar el CRUD completo de variaciones de proyectos: listar, obtener, guardar y eliminar.

## Ubicación

```
backend/src/services/storage/variations.ts
```

## Interfaz Principal

```typescript
interface Variation {
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

interface VariationSummary {
  id: string;
  name: string;
  createdAt: string;
  description?: string;
}
```

## Funciones Exportadas

### listVariations(projectsDir, projectId): Promise<VariationSummary[]>

**Propósito**: Lista todas las variaciones de un proyecto

**Pasos**:
1. Construir path: `projectsDir/projectId/variations/`
2. Verificar que el directorio existe
3. Leer subdirectorios
4. Para cada subdirectorio:
   - Leer `metadata.json`
   - Extraer summary fields
5. Retornar array ordenado por `createdAt` descendente

**Manejo de Errores**:
- Si directorio no existe: retornar `[]`
- Si metadata corrupta: skip esa variación

---

### getVariation(projectsDir, projectId, variationId): Promise<Variation | null>

**Propósito**: Obtener una variación específica con su código

**Pasos**:
1. Construir path: `projectsDir/projectId/variations/variationId/`
2. Leer `metadata.json`
3. Leer `index.html`, `style.css`, `script.js` (si existen)
4. Retornar Variation object

**Manejo de Errores**:
- Si no existe: retornar `null`
- Si algún archivo falta: retornar con campos undefined

---

### saveVariation(projectsDir, projectId, variationData): Promise<string>

**Propósito**: Crear una nueva variación

**Input**:
```typescript
{
  name: string;
  description?: string;
  code: {
    html: string;
    css?: string;
    js?: string;
  };
  isPreferred?: boolean;
}
```

**Pasos**:
1. Generar ID: `${projectId}_v${Date.now()}`
2. Crear directorio: `projectsDir/projectId/variations/{id}/`
3. Escribir archivos:
   - `index.html`
   - `style.css` (si existe)
   - `script.js` (si existe)
   - `metadata.json`
4. Retornar ID generado

---

### deleteVariation(projectsDir, projectId, variationId): Promise<boolean>

**Propósito**: Eliminar una variación

**Pasos**:
1. Construir path: `projectsDir/projectId/variations/variationId/`
2. Eliminar directorio recursivamente
3. Retornar true/false

---

### setPreferredVariation(projectsDir, projectId, variationId): Promise<void>

**Propósito**: Marcar una variación como "preferida" (reemplaza el código original)

**Pasos**:
1. Obtener variación: `getVariation(projectsDir, projectId, variationId)`
2. Copiar archivos de variación a proyecto principal:
   - `variationId/index.html` → `projectId/index.html`
   - `variationId/style.css` → `projectId/style.css`
   - `variationId/script.js` → `projectId/script.js`
3. Actualizar metadata del proyecto para marcar variación como preferred

**Nota**: Esta es la implementación recomendada (Opción A en IMPLEMENTATION-SPEC.md).

---

## Estructura de Archivos

```
proyectos/
└── pen_abc123/
    ├── index.html           # Código original
    ├── style.css
    ├── script.js
    ├── metadata.json
    └── variations/
        ├── pen_abc123_v1708099200/
        │   ├── index.html   # Copia completa
        │   ├── style.css
        │   ├── script.js
        │   └── metadata.json
        └── pen_abc123_v1708100000/
            └── ...
```

## Formato de metadata.json de Variación

```json
{
  "id": "pen_abc123_v1708099200",
  "projectId": "pen_abc123",
  "name": "Versión azul",
  "createdAt": "2026-02-16T12:00:00Z",
  "description": "Color principal cambiado a azul",
  "isPreferred": false
}
```

## Integración con Routes

```typescript
// backend/src/routes/variations.ts

router.get('/:id/variations', async (req, res) => {
  const variations = await listVariations(projectsDir, req.params.id);
  res.json({ variations });
});

router.get('/:id/variations/:variationId', async (req, res) => {
  const variation = await getVariation(projectsDir, req.params.id, req.params.variationId);
  if (!variation) {
    return res.status(404).json({ error: 'Variación no encontrada' });
  }
  res.json({ variation });
});

router.delete('/:id/variations/:variationId', async (req, res) => {
  await deleteVariation(projectsDir, req.params.id, req.params.variationId);
  res.json({ success: true });
});

router.post('/:id/variations/:variationId/prefer', async (req, res) => {
  await setPreferredVariation(projectsDir, req.params.id, req.params.variationId);
  res.json({ success: true });
});
```

---

**Referencia**: IMPLEMENTATION-SPEC.md sección 8, Architecture.md sección 3
