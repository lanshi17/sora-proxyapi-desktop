import { describe, test, expect, beforeEach, vi } from 'vitest';
import { remixVideo } from '../../src/features/video-generation/linxi-remix-client';

describe('remixVideo', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  test('sends remix request to correct endpoint with video id', async () => {
    const videoId = 'video_099c5197-abfd-4e16-88ff-1e162f2a5c77';
    const prompt = 'Make the scene more dramatic';
    const apiKey = 'test-api-key';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        task_id: 'task-remix-123',
        status: 'pending',
        remixed_from_video_id: videoId
      })
    });

    const result = await remixVideo({
      videoId,
      prompt,
      apiKey
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.linxi.chat/v1/videos/${videoId}/remix`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ prompt })
      }
    );

    expect(result).toEqual({
      taskId: 'task-remix-123',
      status: 'pending'
    });
  });

  test('includes optional size parameter when provided', async () => {
    const videoId = 'video_abc123';
    const prompt = 'Increase quality';
    const size = '1280x720';
    const apiKey = 'test-api-key';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        task_id: 'task-remix-456',
        status: 'pending'
      })
    });

    await remixVideo({
      videoId,
      prompt,
      size,
      apiKey
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ prompt, size })
      })
    );
  });

  test('throws error when API returns non-ok response', async () => {
    const videoId = 'video_abc123';
    const prompt = 'Test prompt';
    const apiKey = 'bad-key';

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    });

    await expect(
      remixVideo({ videoId, prompt, apiKey })
    ).rejects.toThrow('Linxi remix request failed: 401 Unauthorized');
  });

  test('validates response contains required task metadata', async () => {
    const videoId = 'video_abc123';
    const prompt = 'Test prompt';
    const apiKey = 'test-key';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        // Missing task_id
        status: 'pending'
      })
    });

    await expect(
      remixVideo({ videoId, prompt, apiKey })
    ).rejects.toThrow('Invalid response: missing required task metadata');
  });

  test('rejects response when status is missing', async () => {
    const videoId = 'video_abc123';
    const prompt = 'Test prompt';
    const apiKey = 'test-key';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        task_id: 'task-remix-789'
      })
    });

    await expect(
      remixVideo({ videoId, prompt, apiKey })
    ).rejects.toThrow('Invalid response: missing required task metadata');
  });
});