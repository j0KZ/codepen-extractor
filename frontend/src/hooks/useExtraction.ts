import { useState, useCallback } from 'react';
import type { ProjectSummary, ExtractionStatus } from '../../../shared/types/index.js';
import { CODEPEN_URL_REGEX } from '../../../shared/constants.js';
import { extractPen } from '../services/api.js';
import axios from 'axios';

interface UseExtractionReturn {
  status: ExtractionStatus;
  result: ProjectSummary | null;
  error: string | null;
  extract: (url: string) => Promise<void>;
  reset: () => void;
}

export function useExtraction(): UseExtractionReturn {
  const [status, setStatus] = useState<ExtractionStatus>('idle');
  const [result, setResult] = useState<ProjectSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const extract = useCallback(async (url: string) => {
    setStatus('validating');
    setError(null);
    setResult(null);

    if (!CODEPEN_URL_REGEX.test(url)) {
      setStatus('error');
      setError('URL de CodePen invalida. Formato esperado: https://codepen.io/usuario/pen/id');
      return;
    }

    setStatus('extracting');

    try {
      const response = await extractPen(url);
      setResult(response.project);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error.message);
      } else {
        setError('Error al extraer el Pen. Intenta de nuevo.');
      }
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, extract, reset };
}
