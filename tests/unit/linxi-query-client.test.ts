import { describe, test, expect, beforeEach, vi } from 'vitest';
import { queryLinxiTask } from '../../src/features/video-generation/linxi-query-client';

describe('queryLinxiTask', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  test('queries task status with id query parameter and returns metadata', async () => {
    const taskId = 'task-123';
    const apiKey = 'test-api-key';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'task-123',
        object: 'video.generation',
        taskId,
        progress: 50,
        status: 'processing',
        created_at: Date.now()
      })
    });

    const result = await queryLinxiTask({       taskId,
      apiKey });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://linxi.chat/v1/videos/task-123',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    expect(result.taskId).toBe('task-123');
    expect(result.status).toBe('processing');
    expect(result.videoUrl).toBeUndefined();
    expect(result.thumbnailUrl).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  test('returns video_url and thumbnail_url when task is completed', async () => {
    const taskId = 'task-456';
    const apiKey = 'test-api-key';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'task-456',
        object: 'video.generation',
        taskId,
        progress: 100,
        status: 'completed',
        video_url: 'https://cdn.linxi.chat/video-456.mp4',
        thumbnail_url: 'https://cdn.linxi.chat/video-456.jpg',
        created_at: Date.now()
      })
    });

    const result = await queryLinxiTask({       taskId,
      apiKey });

    expect(result.taskId).toBe('task-456');
    expect(result.status).toBe('completed');
    expect(result.videoUrl).toBe('https://cdn.linxi.chat/video-456.mp4');
    expect(result.thumbnailUrl).toBe('https://cdn.linxi.chat/video-456.jpg');
    expect(result.error).toBeUndefined();
  });

  test('returns error message when task failed', async () => {
    const taskId = 'task-789';
    const apiKey = 'test-api-key';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'task-789',
        object: 'video.generation',
        taskId,
        progress: 0,
        status: 'failed',
        error: 'Generation timeout',
        created_at: Date.now()
      })
    });

    const result = await queryLinxiTask({       taskId,
      apiKey });

    expect(result.taskId).toBe('task-789');
    expect(result.status).toBe('failed');
    expect(result.videoUrl).toBeUndefined();
    expect(result.thumbnailUrl).toBeUndefined();
    expect(result.error).toBe('Generation timeout');
  });

  test('throws error when API returns non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    await expect(
      queryLinxiTask({
        taskId: 'task-unknown',
        apiKey: 'test-key'
      })
    ).rejects.toThrow('Linxi query request failed: 404 Not Found');
  });

  test('validates response contains required id field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'processing'
      })
    });

    await expect(
      queryLinxiTask({
        taskId: 'task-123',
        apiKey: 'test-key'
      })
    ).rejects.toThrow('Invalid response: missing required task metadata');
  });

  test('validates response contains required status field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'task-123'
      })
    });

    await expect(
      queryLinxiTask({
        taskId: 'task-123',
        apiKey: 'test-key'
      })
    ).rejects.toThrow('Invalid response: missing required task metadata');
  });
});
