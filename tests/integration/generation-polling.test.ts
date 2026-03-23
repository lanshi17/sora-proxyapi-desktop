import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGenerationJob } from '../../src/features/video-generation/useGenerationJob';
import { queryLinxiTask } from '../../src/features/video-generation/linxi-query-client';

vi.mock('../../src/features/video-generation/linxi-query-client');

describe('Generation Polling Integration', () => {
  const mockQueryLinxiTask = vi.mocked(queryLinxiTask);

  beforeEach(() => {
    mockQueryLinxiTask.mockReset();
  });

  test('full lifecycle: pending -> processing -> completed', async () => {
    mockQueryLinxiTask
      .mockResolvedValueOnce({
        taskId: 'task-full-cycle',
        status: 'pending',
        videoUrl: null,
        error: null
      })
      .mockResolvedValueOnce({
        taskId: 'task-full-cycle',
        status: 'processing',
        videoUrl: null,
        error: null
      })
      .mockResolvedValueOnce({
        taskId: 'task-full-cycle',
        status: 'completed',
        videoUrl: 'https://cdn.linxi.chat/final-video.mp4',
        error: null
      });

    const { result } = renderHook(() =>
      useGenerationJob({
        taskId: 'task-full-cycle',
        apiKey: 'integration-test-key',
        pollingInterval: 50
      })
    );

    expect(result.current.state).toBe('polling');

    await waitFor(() => {
      expect(result.current.state).toBe('polling');
      expect(result.current.status).toBe('pending');
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
      expect(result.current.status).toBe('completed');
      expect(result.current.videoUrl).toBe('https://cdn.linxi.chat/final-video.mp4');
      expect(result.current.error).toBeNull();
    });

    expect(mockQueryLinxiTask).toHaveBeenCalledTimes(3);
    expect(mockQueryLinxiTask).toHaveBeenCalledWith({
      taskId: 'task-full-cycle',
      apiKey: 'integration-test-key'
    });
  });

  test('full lifecycle: pending -> failed with error message', async () => {
    mockQueryLinxiTask
      .mockResolvedValueOnce({
        taskId: 'task-failure',
        status: 'pending',
        videoUrl: null,
        error: null
      })
      .mockResolvedValueOnce({
        taskId: 'task-failure',
        status: 'failed',
        videoUrl: null,
        error: 'Insufficient credits'
      });

    const { result } = renderHook(() =>
      useGenerationJob({
        taskId: 'task-failure',
        apiKey: 'integration-test-key',
        pollingInterval: 50
      })
    );

    await waitFor(() => {
      expect(result.current.status).toBe('pending');
    });

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
      expect(result.current.error).toBe('Insufficient credits');
    });

    expect(mockQueryLinxiTask).toHaveBeenCalledTimes(2);
  });

  test('network error handling during polling', async () => {
    mockQueryLinxiTask.mockRejectedValue(new Error('Failed to fetch'));

    const { result } = renderHook(() =>
      useGenerationJob({
        taskId: 'task-network-error',
        apiKey: 'integration-test-key',
        pollingInterval: 50
      })
    );

    await waitFor(() => {
      expect(result.current.state).toBe('error');
      expect(result.current.error).toBe('Failed to fetch');
    });
  });

  test('timeout handling for long-running jobs', async () => {
    mockQueryLinxiTask.mockResolvedValue({
      taskId: 'task-long-running',
      status: 'processing',
      videoUrl: null,
      error: null
    });

    const { result } = renderHook(() =>
      useGenerationJob({
        taskId: 'task-long-running',
        apiKey: 'integration-test-key',
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

  test('switching tasks mid-polling', async () => {
    mockQueryLinxiTask.mockResolvedValue({
      taskId: 'task-1',
      status: 'processing',
      videoUrl: null,
      error: null
    });

    const { result, rerender } = renderHook(
      ({ taskId }: { taskId: string | null }) =>
        useGenerationJob({
          taskId,
          apiKey: 'integration-test-key',
          pollingInterval: 50
        }),
      { initialProps: { taskId: 'task-1' } }
    );

    await waitFor(() => {
      expect(result.current.status).toBe('processing');
    });

    mockQueryLinxiTask.mockResolvedValue({
      taskId: 'task-2',
      status: 'completed',
      videoUrl: 'https://cdn.linxi.chat/task-2.mp4',
      error: null
    });

    rerender({ taskId: 'task-2' });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
      expect(result.current.status).toBe('completed');
      expect(result.current.videoUrl).toBe('https://cdn.linxi.chat/task-2.mp4');
    });
  });

  test('canceling job by setting taskId to null', async () => {
    mockQueryLinxiTask.mockResolvedValue({
      taskId: 'task-cancel',
      status: 'processing',
      videoUrl: null,
      error: null
    });

    const { result, rerender } = renderHook(
      ({ taskId }: { taskId: string | null }) =>
        useGenerationJob({
          taskId,
          apiKey: 'integration-test-key',
          pollingInterval: 50
        }),
      { initialProps: { taskId: 'task-cancel' as string | null } }
    );

    await waitFor(() => {
      expect(result.current.state).toBe('polling');
    });

    const callCountBeforeCancel = mockQueryLinxiTask.mock.calls.length;

    rerender({ taskId: null });

    expect(result.current.state).toBe('idle');
    expect(result.current.status).toBeNull();
    expect(result.current.videoUrl).toBeNull();
    expect(result.current.error).toBeNull();

    await new Promise(resolve => setTimeout(resolve, 200));

    expect(mockQueryLinxiTask.mock.calls.length).toBe(callCountBeforeCancel);
  });
});
