# SPEC - ClaudeContext

> Especificación para implementar el Context de integración con Claude Code

## Propósito

Proveer estado global y funciones para la integración con Claude Code (transformaciones de proyectos via MCP).

## Ubicación

```
frontend/src/context/ClaudeContext.tsx
```

## Interfaz

```typescript
interface ClaudeMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface ClaudeState {
  isConnected: boolean;
  isProcessing: boolean;
  messages: ClaudeMessage[];
  error?: string;
}

interface ClaudeContextValue extends ClaudeState {
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}
```

## API Requerida

### sendMessage(content: string): Promise<void>

1. Agregar mensaje del usuario a `messages` con role 'user'
2. Llamar a `POST /api/transform/:projectId` con el mensaje
3. Iniciar polling de estado
4. Agregar respuesta de Claude a `messages` cuando complete
5. Manejar errores y actualizar `error` state

### clearMessages(): void

1. Limpiar array de mensajes
2. Resetear estados de procesamiento

## Integración con Providers

El `ClaudeProvider` debe envolver la aplicación junto con los otros providers:

```typescript
// frontend/src/main.tsx (actualizar)
<BrowserRouter>
  <ProjectProvider>
    <ExtractionProvider>
      <ClaudeProvider>
        <App />
      </ClaudeProvider>
    </ExtractionProvider>
  </ProjectProvider>
</BrowserRouter>
```

## Estados de Conexión

| Estado | Condición |
|--------|-----------|
| `disconnected` | Inicial - Claude no disponible |
| `connecting` | Intentando conectar |
| `connected` | Listo para enviar mensajes |
| `error` | Error de conexión |

## Hook de Acceso

```typescript
// Usage
import { useClaude } from '../context/ClaudeContext';

function MyComponent() {
  const { isConnected, messages, sendMessage, clearMessages } = useClaude();
  // ...
}
```

## Errores Comunes

| Código | Mensaje | Acción |
|--------|---------|--------|
| CLAUDE_NOT_CONFIGURED | "Claude Code no está disponible" | Mostrar setup guide |
| TRANSFORM_FAILED | "Error al procesar transformación" | Permitir retry |
| TIMEOUT | "Tiempo de transformación agotado" | Ofrecer reintentar |

## Dependencias

- `useTransformPolling` hook para status de transformaciones
- API: `POST /api/transform/:id`
- API: `GET /api/transform/:id/status/:conversationId`

## Test Cases

1. Provider provee valores por defecto correctos
2. `sendMessage` agrega mensaje de usuario
3. `sendMessage` maneja errores de API
4. `clearMessages` resetea todo el estado
5. Error state se limpia después de exitoso envío

---

**Referencia**: Architecture.md sección 2.3, IMPLEMENTATION-SPEC.md sección 2.3
