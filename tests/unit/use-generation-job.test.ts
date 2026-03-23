import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGenerationJob } from '../../src/features/video-generation/useGenerationJob';
import * as queryClient from '../../src/features/video-generation/linxi-query-client';
import type { QueryTaskResult } from '../../src/features/video-generation/linxi-query-client';

vi.mock('../../src/features/video-generation/linxi-query-client');

describe('useGenerationJob', () => {
  const mockQueryLinxiTask = vi.mocked(queryClient.queryLinxiTask);

  beforeEach(() => {
    mockQueryLinxiTask.mockReset();
  });

  test('starts in idle state', () => {
    const { result } = renderHook(() =>
      useGenerationJob({
        taskId: null,
        apiKey: 'test-key',
        pollingInterval: 2000
      })
    );

    expect(result.current.state).toBe('idle');
    expect(result.current.status).toBeNull();
    expect(result.current.videoUrl).toBeNull();
    expect(result.current.error).toBeNull();
  });

  test('transitions to polling state when taskId provided', async () => {
    mockQueryLinxiTask.mockResolvedValue({
      taskId: 'task-123',
      status: 'processing',
      videoUrl: null,
      error: null
    });

    const { result } = renderHook(() =>
      useGenerationJob({
        taskId: 'task-123',
        apiKey: 'test-key',
        pollingInterval: 100
      })
    );

    await waitFor(() => {
      expect(result.current.state).toBe('polling');
      expect(result.current.status).toBe('processing');
    });

    expect(mockQueryLinxiTask).toHaveBeenCalledWith({
      taskId: 'task-123',
      apiKey: 'test-key'
    });
  });

  test('polls repeatedly until terminal status', async () => {
    let callCount = 0;
    mockQueryLinxiTask.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          taskId: 'task-123',
          status: 'pending',
          videoUrl: null,
          error: null
        };
      }
      if (callCount === 2) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          taskId: 'task-123',
          status: 'processing',
          videoUrl: null,
          error: null
        };
      }
      return {
        taskId: 'task-123',
        status: 'completed',
        videoUrl: 'https://cdn.linxi.chat/video.mp4',
        error: null
      };
    });

    const { result } = renderHook(() =>
      useGenerationJob({
        taskId: 'task-123',
        apiKey: 'test-key',
        pollingInterval: 50
      })
    );

    await waitFor(() => {
      expect(result.current.status).toBe('pending');
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
      expect(result.current.status).toBe('completed');
      expect(result.current.videoUrl).toBe('https://cdn.linxi.chat/video.mp4');
    });

    expect(callCount).toBe(3);
  });

  test('stops polling when status is completed', async () => {
    mockQueryLinxiTask.mockResolvedValue({
      taskId: 'task-456',
      status: 'completed',
      videoUrl: 'https://cdn.linxi.chat/video-456.mp4',
      error: null
    });

    const { result } = renderHook(() =>
      useGenerationJob({
        taskId: 'task-456',
        apiKey: 'test-key',
        pollingInterval: 100
      })
    );

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    const callCount = mockQueryLinxiTask.mock.calls.length;

    await new Promise(resolve => setTimeout(resolve, 300));

    expect(mockQueryLinxiTask).toHaveBeenCalledTimes(callCount);
  });

  test('stops polling when status is failed', async () => {
    mockQueryLinxiTask.mockResolvedValue({
      taskId: 'task-789',
      status: 'failed',
      videoUrl: null,
      error: 'Generation timeout'
    });

    const { result } = renderHook(() =>
      useGenerationJob({
        taskId: 'task-789',
        apiKey: 'test-key',
        pollingInterval: 100
      })
    );

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
      expect(result.current.error).toBe('Generation timeout');
    });

    const callCount = mockQueryLinxiTask.mock.calls.length;

    await new Promise(resolve => setTimeout(resolve, 300));

    expect(mockQueryLinxiTask).toHaveBeenCalledTimes(callCount);
  });

  test('transitions to error state when query fails', async () => {
    mockQueryLinxiTask.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useGenerationJob({
        taskId: 'task-error',
        apiKey: 'test-key',
        pollingInterval: 100
      })
    );

    await waitFor(() => {
      expect(result.current.state).toBe('error');
      expect(result.current.error).toBe('Network error');
    });
  });

  test('stops polling after timeout', async () => {
    mockQueryLinxiTask.mockResolvedValue({
      taskId: 'task-timeout',
      status: 'processing',
      videoUrl: null,
      error: null
    });

    const { result } = renderHook(() =>
      useGenerationJob({
        taskId: 'task-timeout',
        apiKey: 'test-key',
        pollingInterval: 50,
        timeoutMs: 200
      })
    );

    await waitFor(() => {
      expect(result.current.state).toBe('polling');
    });

    await waitFor(
      () => {
        expect(result.current.state).toBe('timeout');
        expect(result.current.error).toBe('Generation timeout exceeded');
      },
      { timeout: 500 }
    );
  });

  test('returns to idle when taskId becomes null', async () => {
    mockQueryLinxiTask.mockResolvedValue({
      taskId: 'task-123',
      status: 'processing',
      videoUrl: null,
      error: null
    });

    const { result, rerender } = renderHook(
      ({ taskId }: { taskId: string | null }) =>
        useGenerationJob({
          taskId,
          apiKey: 'test-key',
          pollingInterval: 100
        }),
      { initialProps: { taskId: 'task-123' as string | null } }
    );

    await waitFor(() => {
      expect(result.current.state).toBe('polling');
    });

    rerender({ taskId: null });

    await waitFor(() => {
      expect(result.current.state).toBe('idle');
    });
  });

  test('ignores stale result after taskId changes before prior request resolves', async () => {
    let resolveFirstRequest: ((value: QueryTaskResult) => void) | undefined;

    mockQueryLinxiTask
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstRequest = resolve;
          })
      )
      .mockResolvedValueOnce({
        taskId: 'task-2',
        status: 'completed',
        videoUrl: 'https://cdn.linxi.chat/task-2.mp4',
        thumbnailUrl: 'https://cdn.linxi.chat/task-2.jpg',
        error: null
      });

    const { result, rerender } = renderHook(
      ({ taskId }: { taskId: string | null }) =>
        useGenerationJob({
          taskId,
          apiKey: 'test-key',
          pollingInterval: 100
        }),
      { initialProps: { taskId: 'task-1',
      model: 'sora-v1' as string | null } }
    );

    await waitFor(() => {
      expect(mockQueryLinxiTask).toHaveBeenCalledWith({
        taskId: 'task-1',
        apiKey: 'test-key'
      });
    });

    rerender({ taskId: 'task-2',
      model: 'sora-v1' });

    await waitFor(() => {
      expect(mockQueryLinxiTask).toHaveBeenCalledWith({
        taskId: 'task-2',
        apiKey: 'test-key'
      });
    });

    resolveFirstRequest?.({
      taskId: 'task-1',
      status: 'completed',
      videoUrl: 'https://cdn.linxi.chat/task-1.mp4',
      thumbnailUrl: 'https://cdn.linxi.chat/task-1.jpg',
      error: null
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
      expect(result.current.status).toBe('completed');
      expect(result.current.videoUrl).toBe('https://cdn.linxi.chat/task-2.mp4');
    });

    expect(result.current.videoUrl).not.toBe('https://cdn.linxi.chat/task-1.mp4');
  });

  test('ignores rejected stale request after taskId reset to null', async () => {
    let rejectFirstRequest: ((reason?: unknown) => void) | undefined;

    mockQueryLinxiTask.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectFirstRequest = reject;
        })
    );

    const { result, rerender } = renderHook(
      ({ taskId }: { taskId: string | null }) =>
        useGenerationJob({
          taskId,
          apiKey: 'test-key',
          pollingInterval: 100
        }),
      { initialProps: { taskId: 'task-stale' as string | null } }
    );

    await waitFor(() => {
      expect(mockQueryLinxiTask).toHaveBeenCalledWith({
        taskId: 'task-stale',
        apiKey: 'test-key'
      });
    });

    rerender({ taskId: null });

    rejectFirstRequest?.(new Error('stale failure'));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result.current.state).toBe('idle');
    expect(result.current.status).toBeNull();
    expect(result.current.videoUrl).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
