import { EventEmitter } from 'events';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createLinxiVideo, createLinxiVideoWithFiles } from '../../src/features/video-generation/linxi-create-client';
import type { GenerationParams } from '../../src/features/video-generation/generation-schema';

const mockFetch = vi.fn();
const mockCreateReadStream = vi.fn((path: string) => ({ sourcePath: path }));

interface SubmitResult {
  statusCode: number;
  statusMessage: string;
  body: string;
  error?: Error;
}

let submitResult: SubmitResult;
let lastSubmitOptions: { host: string; path: string; protocol: string; headers: Record<string, string> } | null = null;

class MockNodeFormData {
  entries: Array<{ key: string; value: unknown; filename?: string }> = [];

  append(key: string, value: unknown, filename?: string): void {
    this.entries.push({ key, value, filename });
  }

  submit(
    options: { host: string; path: string; protocol: string; headers: Record<string, string> },
    callback: (err: Error | null, response?: EventEmitter & { statusCode?: number; statusMessage?: string }) => void
  ): void {
    lastSubmitOptions = options;

    if (submitResult.error) {
      callback(submitResult.error);
      return;
    }

    const response = new EventEmitter() as EventEmitter & { statusCode?: number; statusMessage?: string };
    response.statusCode = submitResult.statusCode;
    response.statusMessage = submitResult.statusMessage;

    callback(null, response);

    queueMicrotask(() => {
      response.emit('data', Buffer.from(submitResult.body, 'utf-8'));
      response.emit('end');
    });
  }
}

vi.mock('form-data', () => ({
  default: MockNodeFormData
}));

vi.mock('fs', () => ({
  createReadStream: (path: string) => mockCreateReadStream(path)
}));

const defaultGenerationParams: GenerationParams = {
  prompt: 'A beautiful sunset over mountains',
  size: '1280x720',
  seconds: 8,
  style: undefined,
  watermark: false,
  private: false
};

describe('linxi-create-client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
    mockCreateReadStream.mockClear();
    lastSubmitOptions = null;
    submitResult = {
      statusCode: 200,
      statusMessage: 'OK',
      body: JSON.stringify({
        id: 'task-123',
        object: 'video.generation',
        model: 'sora-v1',
        progress: 0,
        status: 'pending',
        created_at: Date.now(),
        seconds: '8',
        size: '1280x720'
      })
    };
  });

  describe('createLinxiVideo (URL-based references)', () => {
    test('builds create payload with uploaded URLs and generation params', async () => {
      const uploadedUrls = ['https://cdn.example.com/img1.jpg', 'https://cdn.example.com/img2.jpg'];

      mockFetch.mockResolvedValueOnce({
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
        generationParams: defaultGenerationParams,
        apiKey: 'test-api-key',
        model: 'sora-v1'
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe('https://linxi.chat/v1/videos');
      expect(mockFetch.mock.calls[0][1].method).toBe('POST');
      expect(mockFetch.mock.calls[0][1].headers['Authorization']).toBe('Bearer test-api-key');
      expect(mockFetch.mock.calls[0][1].body.getAll('input_reference')).toEqual(uploadedUrls);
      expect(mockFetch.mock.calls[0][1].body.get('model')).toBe('sora-v1');
      expect(mockFetch.mock.calls[0][1].body.get('prompt')).toBe(defaultGenerationParams.prompt);
      expect(mockFetch.mock.calls[0][1].body.get('seconds')).toBe(String(defaultGenerationParams.seconds));
      expect(mockFetch.mock.calls[0][1].body.get('size')).toBe(defaultGenerationParams.size);
      expect(result.taskId).toBe('task-123');
      expect(result.status).toBe('pending');
    });

    test('throws error when API returns non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Unauthorized access'
      });

      await expect(
        createLinxiVideo({
          images: ['https://cdn.example.com/img1.jpg'],
          generationParams: defaultGenerationParams,
          apiKey: 'bad-key',
          model: 'sora-v1'
        })
      ).rejects.toThrow('Linxi create request failed: 401 Unauthorized');
    });

    test('throws validation error for non-http image URLs', async () => {
      await expect(
        createLinxiVideo({
          images: ['ftp://cdn.example.com/not-allowed.png'],
          generationParams: defaultGenerationParams,
          apiKey: 'test-key',
          model: 'sora-v1'
        })
      ).rejects.toThrow('Invalid image URL: ftp://cdn.example.com/not-allowed.png');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('appends model-specific fields for *-all models', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'task-789',
          object: 'video.generation',
          model: 'sora-v1-all',
          progress: 0,
          status: 'pending',
          created_at: Date.now()
        })
      });

      await createLinxiVideo({
        images: ['https://cdn.example.com/img1.jpg'],
        generationParams: {
          ...defaultGenerationParams,
          style: 'comic',
          watermark: true,
          private: true
        },
        apiKey: 'test-key',
        model: 'sora-v1-all'
      });

      const formData = mockFetch.mock.calls[0][1].body as FormData;
      expect(formData.get('watermark')).toBe('true');
      expect(formData.get('private')).toBe('true');
      expect(formData.get('style')).toBe('comic');
    });
  });

  describe('createLinxiVideoWithFiles (node multipart submit path)', () => {
    test('sends local file paths via form-data submit and includes create fields', async () => {
      const result = await createLinxiVideoWithFiles({
        files: [
          { path: '/tmp/image-1.jpg', name: 'image-1.jpg' },
          { path: '/tmp/image-2.png', name: 'image-2.png' }
        ],
        generationParams: defaultGenerationParams,
        apiKey: 'node-key',
        model: 'sora-2'
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockCreateReadStream).toHaveBeenNthCalledWith(1, '/tmp/image-1.jpg');
      expect(mockCreateReadStream).toHaveBeenNthCalledWith(2, '/tmp/image-2.png');
      expect(lastSubmitOptions).toEqual({
        host: 'linxi.chat',
        path: '/v1/videos',
        protocol: 'https:',
        headers: {
          Authorization: 'Bearer node-key'
        }
      });
      expect(result.taskId).toBe('task-123');
      expect(result.status).toBe('pending');
    });

    test('supports text-only generation without file references', async () => {
      const result = await createLinxiVideoWithFiles({
        files: [],
        generationParams: defaultGenerationParams,
        apiKey: 'node-key',
        model: 'sora-2'
      });

      expect(mockCreateReadStream).not.toHaveBeenCalled();
      expect(result.taskId).toBe('task-123');
    });

    test('throws error for non-ok submit response', async () => {
      submitResult = {
        statusCode: 429,
        statusMessage: 'Too Many Requests',
        body: 'rate limit exceeded'
      };

      await expect(
        createLinxiVideoWithFiles({
          files: [{ path: '/tmp/image-1.jpg', name: 'image-1.jpg' }],
          generationParams: defaultGenerationParams,
          apiKey: 'node-key',
          model: 'sora-2'
        })
      ).rejects.toThrow('Linxi create request failed: 429 Too Many Requests - rate limit exceeded');
    });

    test('throws error when response json is invalid', async () => {
      submitResult = {
        statusCode: 200,
        statusMessage: 'OK',
        body: '{not-json'
      };

      await expect(
        createLinxiVideoWithFiles({
          files: [{ path: '/tmp/image-1.jpg', name: 'image-1.jpg' }],
          generationParams: defaultGenerationParams,
          apiKey: 'node-key',
          model: 'sora-2'
        })
      ).rejects.toThrow('Failed to parse response: {not-json');
    });

    test('throws validation error when metadata fields are missing', async () => {
      submitResult = {
        statusCode: 200,
        statusMessage: 'OK',
        body: JSON.stringify({ status: 'pending' })
      };

      await expect(
        createLinxiVideoWithFiles({
          files: [{ path: '/tmp/image-1.jpg', name: 'image-1.jpg' }],
          generationParams: defaultGenerationParams,
          apiKey: 'node-key',
          model: 'sora-2'
        })
      ).rejects.toThrow('Invalid response: missing required task metadata');
    });
  });
});
