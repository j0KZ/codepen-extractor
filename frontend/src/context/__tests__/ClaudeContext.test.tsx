import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ClaudeProvider, useClaude } from '../ClaudeContext';
import type { ReactNode } from 'react';

function wrapper({ children }: { children: ReactNode }) {
  return <ClaudeProvider>{children}</ClaudeProvider>;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('ClaudeContext', () => {
  it('provides correct default values', () => {
    const { result } = renderHook(() => useClaude(), { wrapper });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBeUndefined();
  });

  it('sendMessage adds user message to state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ conversationId: 'conv-1', status: 'processing' }),
      })
    );

    const { result } = renderHook(() => useClaude(), { wrapper });

    await act(async () => {
      await result.current.sendMessage('proj-1', 'Cambia el color a rojo');
    });

    expect(result.current.messages.length).toBeGreaterThanOrEqual(1);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[0].content).toBe('Cambia el color a rojo');
  });

  it('sendMessage handles API errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network failure'))
    );

    const { result } = renderHook(() => useClaude(), { wrapper });

    await act(async () => {
      await result.current.sendMessage('proj-1', 'test');
    });

    expect(result.current.error).toBe('Network failure');
    expect(result.current.isProcessing).toBe(false);
  });

  it('clearMessages resets all state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ conversationId: 'conv-1' }),
      })
    );

    const { result } = renderHook(() => useClaude(), { wrapper });

    await act(async () => {
      await result.current.sendMessage('proj-1', 'test');
    });

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBeUndefined();
  });

  it('error state clears after successful send', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ conversationId: 'conv-2' }),
        })
    );

    const { result } = renderHook(() => useClaude(), { wrapper });

    await act(async () => {
      await result.current.sendMessage('proj-1', 'first');
    });

    expect(result.current.error).toBe('fail');

    await act(async () => {
      await result.current.sendMessage('proj-1', 'second');
    });

    expect(result.current.error).toBeUndefined();
  });

  it('cancelTransform stops polling and updates state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ conversationId: 'conv-1' }),
      })
    );

    const { result } = renderHook(() => useClaude(), { wrapper });

    await act(async () => {
      await result.current.sendMessage('proj-1', 'test');
    });

    act(() => {
      result.current.cancelTransform();
    });

    expect(result.current.isProcessing).toBe(false);
    const systemMsg = result.current.messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toBe('Transformación cancelada');
  });

  it('sendMessage rejects if isProcessing is true', async () => {
    let resolveFirst: (v: unknown) => void;
    const firstCallPromise = new Promise((r) => {
      resolveFirst = r;
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        () =>
          firstCallPromise.then(() => ({
            ok: true,
            json: () => Promise.resolve({ conversationId: 'conv-1' }),
          }))
      )
    );

    const { result } = renderHook(() => useClaude(), { wrapper });

    act(() => {
      result.current.sendMessage('proj-1', 'first');
    });

    await expect(
      act(async () => {
        await result.current.sendMessage('proj-1', 'second');
      })
    ).rejects.toThrow('Ya hay una transformación en proceso');

    resolveFirst!(undefined);
  });

  it('throws when useClaude is used outside provider', () => {
    expect(() => {
      renderHook(() => useClaude());
    }).toThrow('useClaude must be used within a ClaudeProvider');
  });
});
