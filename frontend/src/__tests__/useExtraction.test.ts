import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExtraction } from '../hooks/useExtraction.js';
import * as api from '../services/api.js';
import type { ExtractResponse, ProjectSummary } from '../../../shared/types/index.js';

vi.mock('../services/api.js', () => ({
  extractPen: vi.fn(),
}));

const mockProject: ProjectSummary = {
  id: 'abc123',
  name: 'Test Pen',
  url: 'https://codepen.io/user/pen/abc123',
  author: 'user',
  extractedAt: '2026-01-01T00:00:00Z',
  license: 'MIT',
  hasCode: true,
  hasVariations: false,
  status: 'complete',
};

const VALID_URL = 'https://codepen.io/user/pen/abc123';
const INVALID_URL = 'https://example.com/not-a-pen';

describe('useExtraction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // --- Estado inicial ---

  it('inicia en estado idle sin resultado ni error', () => {
    const { result } = renderHook(() => useExtraction());

    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  // --- Validación de URL ---

  it('pasa a error con URL inválida', async () => {
    const { result } = renderHook(() => useExtraction());

    await act(async () => {
      await result.current.extract(INVALID_URL);
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('URL de CodePen invalida');
    expect(result.current.result).toBeNull();
    expect(api.extractPen).not.toHaveBeenCalled();
  });

  it('rechaza URL sin protocolo https', async () => {
    const { result } = renderHook(() => useExtraction());

    await act(async () => {
      await result.current.extract('http://codepen.io/user/pen/abc123');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('URL de CodePen invalida');
  });

  it('rechaza URL vacía', async () => {
    const { result } = renderHook(() => useExtraction());

    await act(async () => {
      await result.current.extract('');
    });

    expect(result.current.status).toBe('error');
  });

  it('acepta URL válida con www', async () => {
    vi.mocked(api.extractPen).mockResolvedValue({ success: true, project: mockProject });
    const { result } = renderHook(() => useExtraction());

    await act(async () => {
      await result.current.extract('https://www.codepen.io/user/pen/abc123');
    });

    expect(result.current.status).toBe('success');
  });

  // --- Extracción exitosa ---

  it('transiciona idle -> extracting -> success', async () => {
    let resolveExtract!: (value: ExtractResponse) => void;
    const pending = new Promise<ExtractResponse>((resolve) => {
      resolveExtract = resolve;
    });
    vi.mocked(api.extractPen).mockReturnValue(pending);

    const { result } = renderHook(() => useExtraction());
    expect(result.current.status).toBe('idle');

    await act(async () => {
      void result.current.extract(VALID_URL);
    });
    expect(result.current.status).toBe('extracting');

    await act(async () => {
      resolveExtract({ success: true, project: mockProject } as ExtractResponse);
      await pending;
    });

    expect(result.current.status).toBe('success');
    expect(result.current.result).toEqual(mockProject);
    expect(result.current.error).toBeNull();
  });

  it('llama a extractPen con la URL correcta', async () => {
    vi.mocked(api.extractPen).mockResolvedValue({ success: true, project: mockProject });
    const { result } = renderHook(() => useExtraction());

    await act(async () => {
      await result.current.extract(VALID_URL);
    });

    expect(api.extractPen).toHaveBeenCalledWith(VALID_URL);
    expect(api.extractPen).toHaveBeenCalledTimes(1);
  });

  // --- Errores de red y servidor ---

  it('maneja error de red genérico', async () => {
    vi.mocked(api.extractPen).mockRejectedValue(new Error('Network Error'));
    const { result } = renderHook(() => useExtraction());

    await act(async () => {
      await result.current.extract(VALID_URL);
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Error al extraer el Pen. Intenta de nuevo.');
    expect(result.current.result).toBeNull();
  });

  it('maneja error de servidor con mensaje de la API (AxiosError)', async () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          error: {
            code: 'INVALID_PEN',
            message: 'El Pen no existe o es privado',
          },
        },
      },
    };
    // Hacemos que axios.isAxiosError retorne true para este objeto
    const axios = await import('axios');
    vi.spyOn(axios.default, 'isAxiosError').mockReturnValue(true);

    vi.mocked(api.extractPen).mockRejectedValue(axiosError);
    const { result } = renderHook(() => useExtraction());

    await act(async () => {
      await result.current.extract(VALID_URL);
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('El Pen no existe o es privado');
  });

  it('usa mensaje genérico si AxiosError no tiene error.message', async () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 500,
        data: {},
      },
    };
    const axios = await import('axios');
    vi.spyOn(axios.default, 'isAxiosError').mockReturnValue(true);

    vi.mocked(api.extractPen).mockRejectedValue(axiosError);
    const { result } = renderHook(() => useExtraction());

    await act(async () => {
      await result.current.extract(VALID_URL);
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Error al extraer el Pen. Intenta de nuevo.');
  });

  // --- Reset ---

  it('reset vuelve al estado idle', async () => {
    vi.mocked(api.extractPen).mockResolvedValue({ success: true, project: mockProject });
    const { result } = renderHook(() => useExtraction());

    await act(async () => {
      await result.current.extract(VALID_URL);
    });
    expect(result.current.status).toBe('success');

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('reset limpia estado de error', async () => {
    const { result } = renderHook(() => useExtraction());

    await act(async () => {
      await result.current.extract(INVALID_URL);
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  // --- Extracciones sucesivas ---

  it('una nueva extracción limpia el resultado anterior', async () => {
    vi.mocked(api.extractPen).mockResolvedValue({ success: true, project: mockProject });
    const { result } = renderHook(() => useExtraction());

    await act(async () => {
      await result.current.extract(VALID_URL);
    });
    expect(result.current.result).toEqual(mockProject);

    vi.mocked(api.extractPen).mockRejectedValue(new Error('fail'));
    await act(async () => {
      await result.current.extract(VALID_URL);
    });

    expect(result.current.result).toBeNull();
    expect(result.current.status).toBe('error');
  });

  it('una nueva extracción limpia el error anterior', async () => {
    const { result } = renderHook(() => useExtraction());

    await act(async () => {
      await result.current.extract(INVALID_URL);
    });
    expect(result.current.error).not.toBeNull();

    vi.mocked(api.extractPen).mockResolvedValue({ success: true, project: mockProject });
    await act(async () => {
      await result.current.extract(VALID_URL);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.status).toBe('success');
  });
});
