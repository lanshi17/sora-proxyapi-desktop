import { describe, test, expect, beforeEach, vi } from 'vitest';
import { uploadImages } from '../../src/features/uploads/upload-client';
import type { ImageUploadMetadata } from '../../src/features/uploads/upload-types';

const mockReadFile = vi.fn();
const mockTauriFetch = vi.fn();
const mockIsTauri = vi.hoisted(() => vi.fn(() => true));

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: mockIsTauri
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args)
}));

vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: (...args: unknown[]) => mockTauriFetch(...args)
}));

describe('uploadImages', () => {
  const mockBrowserFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockBrowserFetch);
    mockBrowserFetch.mockReset();
    mockReadFile.mockReset();
    mockTauriFetch.mockReset();
    mockIsTauri.mockReturnValue(true);
  });

  test('uploads single Tauri image with multipart form data and token', async () => {
    const images: ImageUploadMetadata[] = [
      { path: '/path/to/image1.jpg', name: 'image1.jpg' }
    ];
    const endpoint = 'https://png.cm/api/index.php';
    const token = '1c17b11693cb5ec63859b091c5b9c1b2';

    mockReadFile.mockResolvedValueOnce(new Uint8Array([1, 2, 3, 4]));
    mockTauriFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({
        url: 'https://png.cm/uploads/abc123.jpg'
      })
    });

    const results = await uploadImages({ images, endpoint, token });

    expect(mockTauriFetch).toHaveBeenCalledTimes(1);

    const [callUrl, callOptions] = mockTauriFetch.mock.calls[0];
    expect(callUrl).toBe(endpoint);
    expect(callOptions.method).toBe('POST');
    expect(mockReadFile).toHaveBeenCalledWith('/path/to/image1.jpg');

    const formData = callOptions.body;
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('token')).toBe(token);
    expect(formData.get('image')).toBeInstanceOf(File);

    const imageFile = formData.get('image') as File;
    expect(imageFile.name).toBe('image1.jpg');
    expect(imageFile.type).toBe('image/jpeg');
    expect(imageFile.size).toBe(4);

    expect(results).toEqual([
      {
        originalPath: '/path/to/image1.jpg',
        originalName: 'image1.jpg',
        publicUrl: 'https://png.cm/uploads/abc123.jpg'
      }
    ]);
  });

  test('uploads browser-selected image using provided File without plugin-fs', async () => {
    mockIsTauri.mockReturnValue(false);

    const browserFile = new File(['hello'], 'browser.png', { type: 'image/png' });
    const images: ImageUploadMetadata[] = [
      { path: 'browser.png', name: 'browser.png', file: browserFile }
    ];
    const endpoint = 'https://png.cm/api/index.php';
    const token = 'browser-token';

    mockBrowserFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({
        url: 'https://png.cm/uploads/browser.png'
      })
    });

    const results = await uploadImages({ images, endpoint, token });

    expect(mockReadFile).not.toHaveBeenCalled();
    expect(mockTauriFetch).not.toHaveBeenCalled();
    expect(mockBrowserFetch).toHaveBeenCalledTimes(1);

    const [, callOptions] = mockBrowserFetch.mock.calls[0];
    const formData = callOptions.body;
    const imageFile = formData.get('image') as File;

    expect(imageFile).toBe(browserFile);
    expect(imageFile.name).toBe('browser.png');
    expect(imageFile.type).toBe('image/png');
    expect(results).toEqual([
      {
        originalPath: 'browser.png',
        originalName: 'browser.png',
        publicUrl: 'https://png.cm/uploads/browser.png'
      }
    ]);
  });

  test('uploads multiple images sequentially', async () => {
    const images: ImageUploadMetadata[] = [
      { path: '/path/to/image1.jpg', name: 'image1.jpg' },
      { path: '/path/to/image2.png', name: 'image2.png' }
    ];
    const endpoint = 'https://png.cm/api/index.php';
    const token = 'test-token';

    mockReadFile
      .mockResolvedValueOnce(new Uint8Array([1, 2, 3]))
      .mockResolvedValueOnce(new Uint8Array([4, 5]));

    mockTauriFetch
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ url: 'https://png.cm/uploads/abc123.jpg' })
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ url: 'https://png.cm/uploads/def456.png' })
      });

    const results = await uploadImages({ images, endpoint, token });

    expect(mockTauriFetch).toHaveBeenCalledTimes(2);
    expect(mockReadFile).toHaveBeenNthCalledWith(1, '/path/to/image1.jpg');
    expect(mockReadFile).toHaveBeenNthCalledWith(2, '/path/to/image2.png');
    expect(results).toHaveLength(2);
    expect(results[0].publicUrl).toBe('https://png.cm/uploads/abc123.jpg');
    expect(results[1].publicUrl).toBe('https://png.cm/uploads/def456.png');
    expect(results[0].originalName).toBe('image1.jpg');
    expect(results[1].originalName).toBe('image2.png');
  });

  test('throws error when API returns non-ok response', async () => {
    const images: ImageUploadMetadata[] = [
      { path: '/path/to/image1.jpg', name: 'image1.jpg' }
    ];
    const endpoint = 'https://png.cm/api/index.php';
    const token = 'invalid-token';

    mockReadFile.mockResolvedValueOnce(new Uint8Array([1]));
    mockTauriFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => '',
      status: 403,
      statusText: 'Forbidden',
    });

    await expect(
      uploadImages({ images, endpoint, token })
    ).rejects.toThrow('Upload request failed: 403 Forbidden');
  });

  test('validates response contains required url field', async () => {
    const images: ImageUploadMetadata[] = [
      { path: '/path/to/image1.jpg', name: 'image1.jpg' }
    ];
    const endpoint = 'https://png.cm/api/index.php';
    const token = 'test-token';

    mockReadFile.mockResolvedValueOnce(new Uint8Array([1]));
    mockTauriFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({
        success: true
      })
    });

    await expect(
      uploadImages({ images, endpoint, token })
    ).rejects.toThrow('Invalid response: missing required url field');
  });

  test('rejects response when url is not a string', async () => {
    const images: ImageUploadMetadata[] = [
      { path: '/path/to/image1.jpg', name: 'image1.jpg' }
    ];
    const endpoint = 'https://png.cm/api/index.php';
    const token = 'test-token';

    mockReadFile.mockResolvedValueOnce(new Uint8Array([1]));
    mockTauriFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({
        url: 12345
      })
    });

    await expect(
      uploadImages({ images, endpoint, token })
    ).rejects.toThrow('Invalid response: missing required url field');
  });

  test('returns empty array when no images provided', async () => {
    const images: ImageUploadMetadata[] = [];
    const endpoint = 'https://png.cm/api/index.php';
    const token = 'test-token';

    const results = await uploadImages({ images, endpoint, token });

    expect(mockTauriFetch).not.toHaveBeenCalled();
    expect(mockReadFile).not.toHaveBeenCalled();
    expect(results).toEqual([]);
  });

  test('stops and throws on first upload failure', async () => {
    const images: ImageUploadMetadata[] = [
      { path: '/path/to/image1.jpg', name: 'image1.jpg' },
      { path: '/path/to/image2.png', name: 'image2.png' },
      { path: '/path/to/image3.jpg', name: 'image3.jpg' }
    ];
    const endpoint = 'https://png.cm/api/index.php';
    const token = 'test-token';

    mockReadFile
      .mockResolvedValueOnce(new Uint8Array([1, 2, 3]))
      .mockResolvedValueOnce(new Uint8Array([4, 5, 6]));

    mockTauriFetch
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ url: 'https://png.cm/uploads/abc123.jpg' })
      })
      .mockResolvedValueOnce({
        ok: false,
        text: async () => '',
        status: 500,
        statusText: 'Internal Server Error',
      });

    await expect(
      uploadImages({ images, endpoint, token })
    ).rejects.toThrow('Upload request failed: 500 Internal Server Error');

    expect(mockTauriFetch).toHaveBeenCalledTimes(2);
    expect(mockReadFile).toHaveBeenCalledTimes(2);
  });
});
