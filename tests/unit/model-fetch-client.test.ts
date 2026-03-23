import { describe, test, expect, vi, beforeEach } from 'vitest';
import { fetchModels } from '../../src/features/models/model-fetch-client';

describe('fetchModels', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  test('fetches models from Linxi API', async () => {
    const apiKey = 'test-api-key';
    const mockResponse = {
      data: [
        { id: 'sora-2', object: 'model' },
        { id: 'sora-2-pro', object: 'model' }
      ]
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const models = await fetchModels(apiKey);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://linxi.chat/v1/models',
      {
        headers: {
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json'
        }
      }
    );
    expect(models).toHaveLength(2);
    expect(models[0].id).toBe('sora-2');
  });

  test('throws error when API fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    });

    await expect(fetchModels('invalid-key')).rejects.toThrow('Failed to fetch models');
  });

  test('filters video generation models only', async () => {
    const mockResponse = {
      data: [
        { id: 'sora-2', object: 'model' },
        { id: 'gpt-4', object: 'model' },
        { id: 'sora-2-pro', object: 'model' }
      ]
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const models = await fetchModels('test-key');
    
    expect(models.every(m => m.id.includes('sora'))).toBe(true);
  });
});
