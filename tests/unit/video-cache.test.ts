import { beforeEach, describe, expect, test, vi } from 'vitest';
import { resolveVideoSource } from '../../src/features/video/video-cache';

const mockIsTauri = vi.hoisted(() => vi.fn(() => false));
const mockConvertFileSrc = vi.hoisted(() => vi.fn((path: string) => `asset://${path}`));
const mockExists = vi.fn();
const mockMkdir = vi.fn();
const mockWriteFile = vi.fn();
const mockTempDir = vi.fn();
const mockJoin = vi.fn();
const mockHttpFetch = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: mockIsTauri,
  convertFileSrc: mockConvertFileSrc
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  BaseDirectory: { Temp: 12 },
  exists: (...args: unknown[]) => mockExists(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args)
}));

vi.mock('@tauri-apps/api/path', () => ({
  tempDir: (...args: unknown[]) => mockTempDir(...args),
  join: (...args: unknown[]) => mockJoin(...args)
}));

vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: (...args: unknown[]) => mockHttpFetch(...args)
}));

describe('resolveVideoSource', () => {
  beforeEach(() => {
    mockIsTauri.mockReset();
    mockConvertFileSrc.mockReset();
    mockExists.mockReset();
    mockMkdir.mockReset();
    mockWriteFile.mockReset();
    mockTempDir.mockReset();
    mockJoin.mockReset();
    mockHttpFetch.mockReset();

    mockIsTauri.mockReturnValue(false);
    mockConvertFileSrc.mockImplementation((path: string) => `asset://${path}`);
    mockTempDir.mockResolvedValue('/tmp');
    mockJoin.mockImplementation(async (...parts: string[]) => parts.join('/').replace(/\/+/g, '/'));
  });

  test('returns original remote URL in browser mode', async () => {
    const result = await resolveVideoSource({
      videoUrl: 'https://example.com/video.mp4',
      taskId: 'task-123'
    });

    expect(result).toEqual({
      source: 'https://example.com/video.mp4',
      cachedFilePath: null
    });
    expect(mockMkdir).not.toHaveBeenCalled();
    expect(mockHttpFetch).not.toHaveBeenCalled();
  });

  test('returns local converted source when video URL is already local in tauri mode', async () => {
    mockIsTauri.mockReturnValue(true);

    const result = await resolveVideoSource({
      videoUrl: '/tmp/videos/video-task-123.mp4',
      taskId: 'task-123'
    });

    expect(result).toEqual({
      source: 'asset:///tmp/videos/video-task-123.mp4',
      cachedFilePath: '/tmp/videos/video-task-123.mp4'
    });
    expect(mockMkdir).not.toHaveBeenCalled();
    expect(mockHttpFetch).not.toHaveBeenCalled();
  });

  test('downloads remote video into temp cache in tauri mode', async () => {
    mockIsTauri.mockReturnValue(true);
    mockExists.mockResolvedValueOnce(false);

    const bytes = new Uint8Array([7, 8, 9]);
    mockHttpFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      arrayBuffer: async () => bytes.buffer
    });

    const result = await resolveVideoSource({
      videoUrl: 'https://example.com/video.mp4',
      taskId: 'task-123'
    });

    expect(mockMkdir).toHaveBeenCalledWith('linxi-video-cache', {
      baseDir: 12,
      recursive: true
    });
    expect(mockExists).toHaveBeenCalledWith('linxi-video-cache/video-task-123.mp4', {
      baseDir: 12
    });
    expect(mockHttpFetch).toHaveBeenCalledWith('https://example.com/video.mp4', {
      method: 'GET'
    });
    expect(mockWriteFile).toHaveBeenCalledWith(
      'linxi-video-cache/video-task-123.mp4',
      new Uint8Array([7, 8, 9]),
      { baseDir: 12 }
    );

    expect(result).toEqual({
      source: 'asset:///tmp/linxi-video-cache/video-task-123.mp4',
      cachedFilePath: '/tmp/linxi-video-cache/video-task-123.mp4'
    });
  });

  test('reuses temp cache file without network request when cached file exists', async () => {
    mockIsTauri.mockReturnValue(true);
    mockExists.mockResolvedValueOnce(true);

    const result = await resolveVideoSource({
      videoUrl: 'https://example.com/video.mp4',
      taskId: 'task-123'
    });

    expect(mockHttpFetch).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(result).toEqual({
      source: 'asset:///tmp/linxi-video-cache/video-task-123.mp4',
      cachedFilePath: '/tmp/linxi-video-cache/video-task-123.mp4'
    });
  });
});
