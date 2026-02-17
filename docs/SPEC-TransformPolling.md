# SPEC - useTransformPolling

> Especificación para implementar el hook de polling de transformaciones

## Propósito

Manejar el estado y ciclo de vida del polling para obtener el estado de una transformación de proyecto en proceso.

## Ubicación

```
frontend/src/hooks/useTransformPolling.ts
```

## Interfaz

```typescript
interface TransformStatus {
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  result?: {
    variationId: string;
    description: string;
  };
  error?: string;
}

interface UseTransformPollingOptions {
  onProgress?: (progress: number) => void;
  onComplete?: (result: TransformStatus['result']) => void;
  onError?: (error: string) => void;
}

interface UseTransformPollingReturn {
  status: TransformStatus | null;
  isPolling: boolean;
  startPolling: (projectId: string, conversationId: string) => void;
  stopPolling: () => void;
}
```

## Configuración

```typescript
const POLLING_CONFIG = {
  intervalMs: 2000,      // Intervalo entre polls
  timeoutMs: 300000,    // Timeout total (5 minutos)
};
```

## Comportamiento

### startPolling(projectId, conversationId)

1. Set `isPolling = true`
2. Set `status = { status: 'processing', progress: 0 }`
3. Registrar `startTime = Date.now()`
4. Iniciar ciclo de polling

### Ciclo de Polling

1. Calcular tiempo transcurrido
2. Si `elapsed > timeoutMs`:
   - Set `status = { status: 'failed', error: '...' }`
   - Set `isPolling = false`
   - Llamar `onError()`
   - Terminar
3. Llamar `GET /api/transform/:projectId/status/:conversationId`
4. Si respuesta tiene `progress`:
   - Set `status.progress = response.progress`
   - Llamar `onProgress(response.progress)`
5. Si `status === 'completed'`:
   - Set `status = response`
   - Set `isPolling = false`
   - Llamar `onComplete(response.result)`
6. Si `status === 'failed'`:
   - Set `status = response`
   - Set `isPolling = false`
   - Llamar `onError(response.error)`
7. Si `status === 'processing'`:
   - Esperar `intervalMs`
   - Repetir ciclo

### stopPolling()

1. Limpiar timeout activo
2. Set `isPolling = false`
3. NO modificar status (permite ver último estado)

## Ejemplo de Uso

```typescript
import { useTransformPolling } from './hooks/useTransformPolling';

function TransformPanel({ projectId }: { projectId: string }) {
  const { status, isPolling, startPolling, stopPolling } = useTransformPolling({
    onProgress: (progress) => console.log('Progreso:', progress),
    onComplete: (result) => console.log('Variación:', result.variationId),
    onError: (error) => console.error('Error:', error),
  });

  const handleTransform = async () => {
    // 1. Enviar mensaje a API
    const response = await api.post(`/transform/${projectId}`, {
      message: 'Cambia el color a azul'
    });

    // 2. Iniciar polling con conversationId
    startPolling(projectId, response.data.conversationId);
  };

  return (
    <div>
      {isPolling && <ProgressBar value={status?.progress || 0} />}
      {status?.status === 'completed' && (
        <p>Variación creada: {status.result.variationId}</p>
      )}
    </div>
  );
}
```

## Manejo de Errores

| Error | Handling |
|-------|----------|
| Network error | Retry automático, luego fallback a error |
| 404 (not found) | Set failed, conversationId inválido |
| 5xx | Retry con backoff |
| Timeout | Set failed con mensaje descriptivo |

## Cleanup

El hook debe limpiar el timeout en:
- unmount del componente
- llamada a `stopPolling()`
- cuando el status sea `completed` o `failed`

---

**Referencia**: IMPLEMENTATION-SPEC.md sección 2.2 (polling config)
