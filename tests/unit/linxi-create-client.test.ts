import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createLinxiVideo } from '../../src/features/video-generation/linxi-create-client';
import type { GenerationParams } from '../../src/features/video-generation/generation-schema';

describe('createLinxiVideo', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  test('builds create payload with uploaded URLs and generation params', async () => {
    const uploadedUrls = ['https://cdn.example.com/img1.jpg', 'https://cdn.example.com/img2.jpg'];
    const generationParams: GenerationParams = {
      prompt: 'A beautiful sunset over mountains',
      size: '1280x720',
      seconds: 8,
      style: undefined,
      watermark: false,
      private: false
    };
    const apiKey = 'test-api-key';
    const model = 'sora-v1';

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['image1'], { type: 'image/jpeg' })
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['image2'], { type: 'image/jpeg' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'task-123',
          object: 'video.generation',
          model: 'sora-v1',
          progress: 0,
          status: 'pending',
          created_at: Date.now()
        })
      });

    const result = await createLinxiVideo({
      images: uploadedUrls,
      generationParams,
      apiKey,
      model
    });

    expect(mockFetch).toHaveBeenCalledTimes(3);
    
    const createCall = mockFetch.mock.calls[2];
    expect(createCall[0]).toBe('https://linxi.chat/v1/videos');
    expect(createCall[1].method).toBe('POST');
    expect(createCall[1].headers['Authorization']).toBe(`Bearer ${apiKey}`);
    expect(createCall[1].body instanceof FormData).toBe(true);

    expect(result.taskId).toBe('task-123');
    expect(result.status).toBe('pending');
  });

  test('throws error when API returns non-ok response', async () => {
    const uploadedUrls = ['https://cdn.example.com/img1.jpg'];
    const generationParams: GenerationParams = {
      prompt: 'A cat playing',
      size: '720x1280',
      seconds: 4,
      style: undefined,
      watermark: true,
      private: true
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['image1'], { type: 'image/jpeg' })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Unauthorized access'
      });

    await expect(
      createLinxiVideo({
        images: uploadedUrls,
        generationParams,
        apiKey: 'bad-key',
        model: 'sora-v1'
      })
    ).rejects.toThrow('Linxi create request failed: 401 Unauthorized');
  });

  test('validates response contains required task metadata', async () => {
    const uploadedUrls = ['https://cdn.example.com/img1.jpg'];
    const generationParams: GenerationParams = {
      prompt: 'Test prompt',
      size: '1280x720',
      seconds: 8,
      style: undefined,
      watermark: false,
      private: false
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['image1'], { type: 'image/jpeg' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'pending'
        })
      });

    await expect(
      createLinxiVideo({
        images: uploadedUrls,
        generationParams,
        apiKey: 'test-key',
        model: 'sora-v1'
      })
    ).rejects.toThrow('Invalid response: missing required task metadata');
  });

  test('rejects response when status is missing', async () => {
    const uploadedUrls = ['https://cdn.example.com/img1.jpg'];
    const generationParams: GenerationParams = {
      prompt: 'Test prompt',
      size: '1280x720',
      seconds: 8,
      style: undefined,
      watermark: false,
      private: false
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['image1'], { type: 'image/jpeg' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'task-123'
        })
      });

    await expect(
      createLinxiVideo({
        images: uploadedUrls,
        generationParams,
        apiKey: 'test-key',
        model: 'sora-v1'
      })
    ).rejects.toThrow('Invalid response: missing required task metadata');
  });

  test('fetches images and sends as files', async () => {
    const uploadedUrls = ['https://cdn.example.com/img1.jpg', 'https://cdn.example.com/img2.png'];
    const generationParams: GenerationParams = {
      prompt: 'Test with multiple images',
      size: '1280x720',
      seconds: 8,
      style: undefined,
      watermark: false,
      private: false
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['image1'], { type: 'image/jpeg' })
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['image2'], { type: 'image/png' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'task-456',
          object: 'video.generation',
          model: 'sora-v1',
          progress: 0,
          status: 'pending',
          created_at: Date.now()
        })
      });

    await createLinxiVideo({
      images: uploadedUrls,
      generationParams,
      apiKey: 'test-key',
      model: 'sora-v1'
    });

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch.mock.calls[2][0]).toBe('https://linxi.chat/v1/videos');
  });
});
