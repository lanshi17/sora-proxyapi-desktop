import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRemixJob, UseRemixJobParams } from '../../src/features/video-generation/useRemixJob';

describe('useRemixJob', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns idle state when no taskId is provided', () => {
    const params: UseRemixJobParams = {
      taskId: null,
      apiKey: 'test-key',
      pollingInterval: 1000
    };

    const { result } = renderHook(() => useRemixJob(params));

    expect(result.current.state).toBe('idle');
    expect(result.current.status).toBeNull();
    expect(result.current.videoUrl).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('transitions to polling state when taskId is provided', () => {
    const params: UseRemixJobParams = {
      taskId: 'task-123',
      apiKey: 'test-key',
      pollingInterval: 1000
    };

    const { result } = renderHook(() => useRemixJob(params));

    expect(result.current.state).toBe('polling');
  });

  it('polls task status and returns completed state with videoUrl', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          id: 'task-123', 
          object: 'video.generation',
          progress: 50,
          status: 'processing',
          created_at: Date.now()
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          id: 'task-123', 
          object: 'video.generation',
          progress: 100,
          status: 'completed',
          video_url: 'https://example.com/video.mp4',
          created_at: Date.now()
        })
      });
    
    global.fetch = mockFetch;

    const params: UseRemixJobParams = {
      taskId: 'task-123',
      apiKey: 'test-key',
      pollingInterval: 500
    };

    const { result } = renderHook(() => useRemixJob(params));

    expect(result.current.state).toBe('polling');

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    }, { timeout: 2000 });

    expect(result.current.videoUrl).toBe('https://example.com/video.mp4');
    expect(result.current.status).toBe('completed');
    
    global.fetch = vi.fn();
  });

  it('handles failed task status', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          id: 'task-123', 
          object: 'video.generation',
          progress: 0,
          status: 'failed',
          error: 'Remix failed due to invalid input',
          created_at: Date.now()
        })
      });
    
    global.fetch = mockFetch;

    const params: UseRemixJobParams = {
      taskId: 'task-123',
      apiKey: 'test-key',
      pollingInterval: 500
    };

    const { result } = renderHook(() => useRemixJob(params));

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    }, { timeout: 2000 });

    expect(result.current.error).toBe('Remix failed due to invalid input');
    
    global.fetch = vi.fn();
  });

  it('handles API errors during polling', async () => {
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'));
    
    global.fetch = mockFetch;

    const params: UseRemixJobParams = {
      taskId: 'task-123',
      apiKey: 'test-key',
      pollingInterval: 500
    };

    const { result } = renderHook(() => useRemixJob(params));

    await waitFor(() => {
      expect(result.current.state).toBe('error');
    }, { timeout: 2000 });

    expect(result.current.error).toBe('Network error');
    
    global.fetch = vi.fn();
  });

  it('handles timeout when task takes too long', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ 
          id: 'task-123', 
          object: 'video.generation',
          progress: 50,
          status: 'processing',
          created_at: Date.now()
        })
      });
    
    global.fetch = mockFetch;

    const params: UseRemixJobParams = {
      taskId: 'task-123',
      apiKey: 'test-key',
      pollingInterval: 500,
      timeoutMs: 1000
    };

    const { result } = renderHook(() => useRemixJob(params));

    await waitFor(() => {
      expect(result.current.state).toBe('timeout');
    }, { timeout: 3000 });

    expect(result.current.error).toBe('Remix timeout exceeded');
    
    global.fetch = vi.fn();
  });

  it('resets state when taskId changes', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ 
          id: 'task-123', 
          object: 'video.generation',
          progress: 100,
          status: 'completed',
          video_url: 'https://example.com/video.mp4',
          created_at: Date.now()
        })
      });
    
    global.fetch = mockFetch;

    const params: UseRemixJobParams = {
      taskId: 'task-123',
      apiKey: 'test-key',
      pollingInterval: 500
    };

    const { result, rerender } = renderHook(
      (props: UseRemixJobParams) => useRemixJob(props),
      { initialProps: params }
    );

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    }, { timeout: 2000 });

    rerender({ ...params, taskId: 'task-456' });

    expect(result.current.state).toBe('polling');
    expect(result.current.videoUrl).toBeNull();
    
    global.fetch = vi.fn();
  });
});
