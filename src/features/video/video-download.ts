import { isTauri } from '@tauri-apps/api/core';

export async function downloadVideo(
  videoUrl: string,
  taskId: string
): Promise<void> {
  if (isTauri()) {
    await downloadViaTauri(videoUrl, taskId);
  } else {
    await downloadViaBrowser(videoUrl, taskId);
  }
}

async function downloadViaTauri(
  videoUrl: string,
  taskId: string
): Promise<void> {
  const response = await fetch(videoUrl);
  const blob = await response.blob();
  
  const { save } = await import('@tauri-apps/plugin-dialog');
  const filePath = await save({
    defaultPath: `video-${taskId}.mp4`,
    filters: [{ name: 'MP4', extensions: ['mp4'] }]
  });
  
  if (filePath) {
    const fs = await import('@tauri-apps/plugin-fs');
    await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
  }
}

async function downloadViaBrowser(videoUrl: string, taskId: string): Promise<void> {
  const response = await fetch(videoUrl);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `video-${taskId}.mp4`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
}
