import { useState, useRef, useCallback, useEffect } from 'react';

export interface TransformStatus {
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  result?: { variationId: string; description: string };
  error?: string;
}

export interface UseTransformPollingOptions {
  onProgress?: (progress: number) => void;
  onComplete?: (result: TransformStatus['result']) => void;
  onError?: (error: string) => void;
}

export interface UseTransformPollingReturn {
  status: TransformStatus | null;
  isPolling: boolean;
  startPolling: (projectId: string, conversationId: string) => void;
  stopPolling: () => void;
}

const POLLING_CONFIG = {
  intervalMs: 2000,
  timeoutMs: 300000,
  maxAttempts: 150,
};

export function useTransformPolling(
  options: UseTransformPollingOptions = {}
): UseTransformPollingReturn {
  const [status, setStatus] = useState<TransformStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const attemptRef = useRef<number>(0);
  const stoppedRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const stopPolling = useCallback(() => {
    stoppedRef.current = true;
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const poll = useCallback(
    async (projectId: string, conversationId: string) => {
      if (stoppedRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;
      attemptRef.current++;

      if (elapsed > POLLING_CONFIG.timeoutMs || attemptRef.current > POLLING_CONFIG.maxAttempts) {
        const errorMsg = 'Tiempo de transformación agotado';
        setStatus({ status: 'failed', error: errorMsg });
        setIsPolling(false);
        optionsRef.current.onError?.(errorMsg);
        return;
      }

      try {
        const res = await fetch(
          `/api/transform/${projectId}/status/${conversationId}`
        );

        if (!res.ok) {
          if (res.status === 404) {
            const errorMsg = 'Transformación no encontrada';
            setStatus({ status: 'failed', error: errorMsg });
            setIsPolling(false);
            optionsRef.current.onError?.(errorMsg);
            return;
          }
          if (res.status >= 500) {
            timeoutRef.current = setTimeout(
              () => poll(projectId, conversationId),
              POLLING_CONFIG.intervalMs * 2
            );
            return;
          }
        }

        const data: TransformStatus = await res.json();

        if (stoppedRef.current) return;

        if (data.progress !== undefined) {
          optionsRef.current.onProgress?.(data.progress);
        }

        if (data.status === 'completed') {
          setStatus(data);
          setIsPolling(false);
          optionsRef.current.onComplete?.(data.result);
          return;
        }

        if (data.status === 'failed') {
          setStatus(data);
          setIsPolling(false);
          optionsRef.current.onError?.(data.error || 'Error desconocido');
          return;
        }

        setStatus(data);
        timeoutRef.current = setTimeout(
          () => poll(projectId, conversationId),
          POLLING_CONFIG.intervalMs
        );
      } catch {
        if (stoppedRef.current) return;
        timeoutRef.current = setTimeout(
          () => poll(projectId, conversationId),
          POLLING_CONFIG.intervalMs * 2
        );
      }
    },
    []
  );

  const startPolling = useCallback(
    (projectId: string, conversationId: string) => {
      stoppedRef.current = false;
      startTimeRef.current = Date.now();
      attemptRef.current = 0;
      setIsPolling(true);
      setStatus({ status: 'processing', progress: 0 });
      poll(projectId, conversationId);
    },
    [poll]
  );

  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { status, isPolling, startPolling, stopPolling };
}
