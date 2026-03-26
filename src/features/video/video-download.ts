import { isTauri } from '@tauri-apps/api/core';

export async function downloadVideo(
  videoSource: string,
  taskId: string
): Promise<void> {
  if (isTauri()) {
    await downloadViaTauri(videoSource, taskId);
  } else {
    await downloadViaBrowser(videoSource, taskId);
  }
}

async function downloadViaTauri(
  videoSource: string,
  taskId: string
): Promise<void> {
  const { save } = await import('@tauri-apps/plugin-dialog');
  const filePath = await save({
    defaultPath: `video-${taskId}.mp4`,
    filters: [{ name: 'MP4', extensions: ['mp4'] }]
  });

  if (!filePath) {
    return;
  }

  const fs = await import('@tauri-apps/plugin-fs');

  if (!isRemoteSource(videoSource)) {
    await fs.copyFile(videoSource, filePath);
    return;
  }

  const { fetch } = await import('@tauri-apps/plugin-http');
  const response = await fetch(videoSource, {
    method: 'GET'
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Video download request failed: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  await fs.writeFile(filePath, new Uint8Array(await response.arrayBuffer()));
}

async function downloadViaBrowser(videoSource: string, taskId: string): Promise<void> {
  const a = document.createElement('a');
  a.href = videoSource;
  a.download = `video-${taskId}.mp4`;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function isRemoteSource(videoSource: string): boolean {
  return /^https?:\/\//i.test(videoSource);
}
