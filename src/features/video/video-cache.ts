import { convertFileSrc, isTauri } from '@tauri-apps/api/core';
import { BaseDirectory, exists, mkdir, writeFile } from '@tauri-apps/plugin-fs';

const VIDEO_CACHE_DIR = 'linxi-video-cache';

interface ResolveVideoSourceParams {
  videoUrl: string;
  taskId: string;
}

interface ResolveVideoSourceResult {
  source: string;
  cachedFilePath: string | null;
}

export async function resolveVideoSource(
  params: ResolveVideoSourceParams
): Promise<ResolveVideoSourceResult> {
  const { videoUrl, taskId } = params;

  if (!isTauri()) {
    return {
      source: videoUrl,
      cachedFilePath: null
    };
  }

  if (!isRemoteUrl(videoUrl)) {
    return {
      source: convertFileSrc(videoUrl),
      cachedFilePath: videoUrl
    };
  }

  const cachedFileName = `video-${taskId}.mp4`;

  await mkdir(VIDEO_CACHE_DIR, {
    baseDir: BaseDirectory.Temp,
    recursive: true
  });

  const relativeCachePath = `${VIDEO_CACHE_DIR}/${cachedFileName}`;
  const hasCache = await exists(relativeCachePath, {
    baseDir: BaseDirectory.Temp
  });

  if (!hasCache) {
    const { fetch } = await import('@tauri-apps/plugin-http');
    const response = await fetch(videoUrl, {
      method: 'GET'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Video cache request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    await writeFile(relativeCachePath, new Uint8Array(await response.arrayBuffer()), {
      baseDir: BaseDirectory.Temp
    });
  }

  const { tempDir, join } = await import('@tauri-apps/api/path');
  const cacheAbsolutePath = await join(await tempDir(), VIDEO_CACHE_DIR, cachedFileName);

  return {
    source: convertFileSrc(cacheAbsolutePath),
    cachedFilePath: cacheAbsolutePath
  };
}

function isRemoteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}
