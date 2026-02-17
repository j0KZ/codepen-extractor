# SPEC - CodeEditor

> Especificación para implementar el componente CodeEditor

## Propósito

Componente para visualizar y opcionalmente editar código HTML, CSS y JS con tabs.

## Ubicación

```
frontend/src/components/Transformation/CodeEditor.tsx
```

## Interfaz

```typescript
type CodeEditorTab = 'html' | 'css' | 'js';

interface CodeEditorProps {
  code: {
    html: string;
    css?: string;
    js?: string;
  };
  onChange?: (code: CodeEditorProps['code']) => void;
  readOnly?: boolean;
}
```

## Estados Internos

```typescript
interface CodeEditorState {
  activeTab: CodeEditorTab;
  isEditing: boolean;
}
```

## Comportamiento

### Renderizado de Tabs

1. Mostrar 3 tabs: HTML, CSS, JS
2. El tab activo debe tener estilo visual diferente
3. Click en tab cambia `activeTab`
4. Cada tab muestra el código correspondiente

### Mostrar Código

1. Obtener código según `activeTab`
2. Mostrar en textarea de solo lectura (si `readOnly = true`)
3. Resaltar sintaxis (opcional - ver nota abajo)

### Editar Código

1. Si `readOnly = false` y `onChange` definido:
   - Habilitar textarea para edición
   - OnChange llama a `onChange` con código actualizado
2. Actualizar el campo correspondiente según tab activo

## Estructura Visual

```
┌──────────────────────────────────────┐
│  [HTML]  [CSS]  [JS]                │  ← Tabs
├──────────────────────────────────────┤
│                                      │
│  <textarea>                         │  ← Editor
│    código actual...                  │
│    ...                               │
│                                      │
└──────────────────────────────────────┘
```

## Props Detalladas

| Prop | Tipo | Requerido | Default | Descripción |
|------|------|-----------|---------|-------------|
| code | object | Sí | - | Objeto con html, css, js |
| onChange | function | No | - | Callback cuando cambia código |
| readOnly | boolean | No | false | Modo solo lectura |

## Ejemplo de Uso

```tsx
import { CodeEditor } from './components/Transformation/CodeEditor';

// Solo lectura
<CodeEditor
  code={{ html: '<div>...</div>', css: 'body { ... }' }}
  readOnly
/>

// Editable
<CodeEditor
  code={projectCode}
  onChange={(newCode) => setProjectCode(newCode)}
/>
```

## Notas de Implementación

### Resaltado de Sintaxis (Opcional)

Para resaltado básico, usar un tokenizer simple:

```typescript
// Ejemplo básico sin dependencias
function highlightCode(code: string, language: string): string {
  // Para MVP: return code
  // Para mejor UX: integrar Prism.js o highlight.js
  return code;
}
```

### Seguridad

- Sanitizar entrada antes de guardar
- Si `readOnly = true`, usar `readOnly` attribute en textarea
- Considerar usar CodeMirror o Monaco para mejor experiencia

## Dependencias

Ninguna requerida para MVP. Opcionales:
- `prismjs`: Resaltado de sintaxis
- `@monaco-editor/react`: Editor completo

---

**Referencia**: Architecture.md sección Componentes
