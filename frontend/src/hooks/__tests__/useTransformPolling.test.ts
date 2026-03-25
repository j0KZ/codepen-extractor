import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTransformPolling } from '../useTransformPolling';

beforeEach(() => {
  vi.useFakeTimers();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useTransformPolling', () => {
  it('completes full polling cycle (processing -> completed)', async () => {
    const onComplete = vi.fn();
    const result1 = { variationId: 'v-1', description: 'Done' };

    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'processing', progress: 50 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'completed', result: result1 }),
        })
    );

    const { result } = renderHook(() =>
      useTransformPolling({ onComplete })
    );

    await act(async () => {
      result.current.startPolling('proj-1', 'conv-1');
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(onComplete).toHaveBeenCalledWith(result1);
    expect(result.current.isPolling).toBe(false);
    expect(result.current.status?.status).toBe('completed');
  });

  it('times out after exceeding max time', async () => {
    const onError = vi.fn();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'processing', progress: 10 }),
      })
    );

    const { result } = renderHook(() =>
      useTransformPolling({ onError })
    );

    await act(async () => {
      result.current.startPolling('proj-1', 'conv-1');
      await vi.runAllTimersAsync();
    });

    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 301000);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(onError).toHaveBeenCalledWith('Tiempo de transformación agotado');
    expect(result.current.isPolling).toBe(false);
    expect(result.current.status?.status).toBe('failed');
  });

  it('stopPolling stops cycle without modifying status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'processing', progress: 30 }),
      })
    );

    const { result } = renderHook(() => useTransformPolling());

    await act(async () => {
      result.current.startPolling('proj-1', 'conv-1');
      await vi.runAllTimersAsync();
    });

    const statusBefore = result.current.status;

    act(() => {
      result.current.stopPolling();
    });

    expect(result.current.isPolling).toBe(false);
    expect(result.current.status).toEqual(statusBefore);
  });

  it('cleans up on unmount', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'processing', progress: 10 }),
      })
    );

    const { result, unmount } = renderHook(() => useTransformPolling());

    await act(async () => {
      result.current.startPolling('proj-1', 'conv-1');
      await vi.runAllTimersAsync();
    });

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on network error then falls back to error on timeout', async () => {
    const onError = vi.fn();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error'))
    );

    const { result } = renderHook(() =>
      useTransformPolling({ onError })
    );

    await act(async () => {
      result.current.startPolling('proj-1', 'conv-1');
      await vi.runAllTimersAsync();
    });

    // First call fails, schedules retry with backoff (4000ms)
    expect(result.current.isPolling).toBe(true);

    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 301000);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(onError).toHaveBeenCalledWith('Tiempo de transformación agotado');
    expect(result.current.status?.status).toBe('failed');
  });

  it('sets failed on 404 response', async () => {
    const onError = vi.fn();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({}),
      })
    );

    const { result } = renderHook(() =>
      useTransformPolling({ onError })
    );

    await act(async () => {
      result.current.startPolling('proj-1', 'conv-1');
      await vi.runAllTimersAsync();
    });

    expect(onError).toHaveBeenCalledWith('Transformación no encontrada');
    expect(result.current.status?.status).toBe('failed');
    expect(result.current.isPolling).toBe(false);
  });

  it('retries with backoff on 5xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'completed',
              result: { variationId: 'v-1', description: 'Ok' },
            }),
        })
    );

    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useTransformPolling({ onComplete })
    );

    await act(async () => {
      result.current.startPolling('proj-1', 'conv-1');
      await vi.runAllTimersAsync();
    });

    // 5xx triggers retry with double interval (4000ms)
    expect(result.current.isPolling).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(onComplete).toHaveBeenCalled();
    expect(result.current.status?.status).toBe('completed');
  });
});
