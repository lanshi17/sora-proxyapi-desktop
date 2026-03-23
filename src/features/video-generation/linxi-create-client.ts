import type { GenerationParams } from './generation-schema';
import type { LinxiTaskMetadata, LinxiCreateResponse } from './linxi-types';
import { isTauri } from '@tauri-apps/api/core';

export interface CreateLinxiVideoParams {
  images: string[];
  generationParams: GenerationParams;
  apiKey: string;
  model: string;
}

const LINXI_CREATE_ENDPOINT = 'https://linxi.chat/v1/videos';

export async function createLinxiVideo(params: CreateLinxiVideoParams): Promise<LinxiTaskMetadata> {
  const { images, generationParams, apiKey, model } = params;

  const formData = new FormData();
  
  for (const url of images) {
    const blob = await fetchImageWithCORS(url);
    const filename = getFilenameFromUrl(url);
    const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
    formData.append('input_reference', file);
  }
  
  formData.append('model', model);
  formData.append('prompt', generationParams.prompt);
  formData.append('seconds', String(generationParams.seconds));
  formData.append('size', generationParams.size);
  
  if (model.endsWith('-all')) {
    if (generationParams.watermark !== undefined) {
      formData.append('watermark', String(generationParams.watermark));
    }
    if (generationParams.private !== undefined) {
      formData.append('private', String(generationParams.private));
    }
    if (generationParams.style) {
      formData.append('style', generationParams.style);
    }
  }

  const response = await fetch(LINXI_CREATE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Linxi create request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data: unknown = await response.json();

  if (!isValidCreateResponse(data)) {
    throw new Error('Invalid response: missing required task metadata');
  }

  return {
    taskId: data.id,
    status: data.status,
    object: data.object,
    model: data.model,
    progress: data.progress,
    createdAt: data.created_at,
    seconds: data.seconds,
    size: data.size
  };
}

async function fetchImageWithCORS(url: string): Promise<Blob> {
  if (isTauri()) {
    const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
    const response = await tauriFetch(url, {
      method: 'GET'
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch image from ${url}: ${response.status}`);
    }
    return await response.blob();
  } else {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from ${url}: ${response.status}`);
    }
    return await response.blob();
  }
}

function getFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop();
    return filename || 'image.jpg';
  } catch {
    return 'image.jpg';
  }
}

function isValidCreateResponse(data: unknown): data is LinxiCreateResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    typeof (data as LinxiCreateResponse).id === 'string' &&
    'status' in data &&
    typeof (data as LinxiCreateResponse).status === 'string'
  );
}
