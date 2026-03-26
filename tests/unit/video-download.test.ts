import { beforeEach, describe, expect, test, vi } from 'vitest';
import { downloadVideo } from '../../src/features/video/video-download';

const mockIsTauri = vi.hoisted(() => vi.fn(() => false));
const mockSave = vi.fn();
const mockWriteFile = vi.fn();
const mockCopyFile = vi.fn();
const mockTauriFetch = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: mockIsTauri
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: (...args: unknown[]) => mockSave(...args)
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  copyFile: (...args: unknown[]) => mockCopyFile(...args)
}));

vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: (...args: unknown[]) => mockTauriFetch(...args)
}));

describe('downloadVideo', () => {
  const mockBrowserFetch = vi.fn();

  beforeEach(() => {
    mockIsTauri.mockReset();
    mockIsTauri.mockReturnValue(false);
    mockSave.mockReset();
    mockWriteFile.mockReset();
    mockCopyFile.mockReset();
    mockTauriFetch.mockReset();
    mockBrowserFetch.mockReset();
    vi.stubGlobal('fetch', mockBrowserFetch);
  });

  test('browser mode triggers direct link download without fetch', async () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await downloadVideo('https://example.com/video.mp4', 'task-123');

    expect(mockBrowserFetch).not.toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalledTimes(1);

    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.tagName).toBe('A');
    expect(anchor.getAttribute('href')).toBe('https://example.com/video.mp4');
    expect(anchor.getAttribute('download')).toBe('video-task-123.mp4');
    expect(anchor.getAttribute('target')).toBe('_blank');
    expect(anchor.getAttribute('rel')).toBe('noopener noreferrer');

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith(anchor);

    clickSpy.mockRestore();
  });

  test('tauri mode copies local cache file directly when source is local path', async () => {
    mockIsTauri.mockReturnValue(true);
    mockSave.mockResolvedValueOnce('/tmp/video-task-123-saved.mp4');

    await downloadVideo('/tmp/linxi-video-cache/video-task-123.mp4', 'task-123');

    expect(mockCopyFile).toHaveBeenCalledWith(
      '/tmp/linxi-video-cache/video-task-123.mp4',
      '/tmp/video-task-123-saved.mp4'
    );
    expect(mockTauriFetch).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  test('tauri mode downloads through plugin-http and writes selected file for remote source', async () => {
    mockIsTauri.mockReturnValue(true);
    mockSave.mockResolvedValueOnce('/tmp/video-task-123.mp4');

    const bytes = new Uint8Array([1, 2, 3, 4]);
    mockTauriFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      arrayBuffer: async () => bytes.buffer
    });

    await downloadVideo('https://example.com/video.mp4', 'task-123');

    expect(mockSave).toHaveBeenCalledWith({
      defaultPath: 'video-task-123.mp4',
      filters: [{ name: 'MP4', extensions: ['mp4'] }]
    });
    expect(mockTauriFetch).toHaveBeenCalledWith('https://example.com/video.mp4', {
      method: 'GET'
    });
    expect(mockWriteFile).toHaveBeenCalledWith('/tmp/video-task-123.mp4', new Uint8Array([1, 2, 3, 4]));
    expect(mockCopyFile).not.toHaveBeenCalled();
  });

  test('tauri mode stops when user cancels save dialog', async () => {
    mockIsTauri.mockReturnValue(true);
    mockSave.mockResolvedValueOnce(null);

    await downloadVideo('https://example.com/video.mp4', 'task-123');

    expect(mockTauriFetch).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(mockCopyFile).not.toHaveBeenCalled();
  });

  test('tauri mode throws detailed error for non-ok download response', async () => {
    mockIsTauri.mockReturnValue(true);
    mockSave.mockResolvedValueOnce('/tmp/video-task-123.mp4');
    mockTauriFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: async () => 'CORS rejected'
    });

    await expect(
      downloadVideo('https://example.com/video.mp4', 'task-123')
    ).rejects.toThrow('Video download request failed: 403 Forbidden - CORS rejected');

    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(mockCopyFile).not.toHaveBeenCalled();
  });
});
