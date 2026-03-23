import { isTauri } from '@tauri-apps/api/core';
import type { ImageUploadMetadata, UploadResult, UploadApiResponse } from './upload-types';

export interface UploadImagesParams {
  images: ImageUploadMetadata[];
  endpoint: string;
  token: string;
}

export async function uploadImages(params: UploadImagesParams): Promise<UploadResult[]> {
  const { images, endpoint, token } = params;

  if (images.length === 0) {
    return [];
  }

  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    throw new Error(`Invalid upload endpoint: ${endpoint}. Endpoint must be an absolute URL starting with http:// or https://`);
  }

  const results: UploadResult[] = [];

  for (const image of images) {
    const file = isTauri()
      ? await readTauriFile(image)
      : await readBrowserFile(image);

    const formData = new FormData();
    formData.append('token', token);
    formData.append('image', file);

    const response = isTauri()
      ? await uploadViaTauri(endpoint, formData)
      : await uploadViaBrowser(endpoint, formData);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload failed:', response.status, errorText);
      throw new Error(`Upload request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const responseText = await response.text();
    console.log('Upload response:', responseText);

    let data: unknown;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JSON response:', responseText);
      throw new Error(`Invalid JSON response from server: ${responseText.substring(0, 200)}`);
    }

    if (!isValidUploadResponse(data)) {
      console.error('Invalid response structure:', data);
      throw new Error('Invalid response: missing required url field');
    }

    results.push({
      originalPath: image.path,
      originalName: image.name,
      publicUrl: data.url
    });
  }

  return results;
}

async function readTauriFile(image: ImageUploadMetadata): Promise<File> {
  const { readFile } = await import('@tauri-apps/plugin-fs');
  return image.file ?? new File([await readFile(image.path)], image.name, {
    type: getMimeType(image.name)
  });
}

async function readBrowserFile(image: ImageUploadMetadata): Promise<File> {
  if (image.file) {
    return image.file;
  }
  throw new Error('File object required in browser mode. Ensure images are selected via file input.');
}

async function uploadViaTauri(endpoint: string, formData: FormData): Promise<Response> {
  const { fetch } = await import('@tauri-apps/plugin-http');
  return fetch(endpoint, {
    method: 'POST',
    body: formData
  });
}

async function uploadViaBrowser(endpoint: string, formData: FormData): Promise<Response> {
  return window.fetch(endpoint, {
    method: 'POST',
    body: formData
  });
}

function isValidUploadResponse(data: unknown): data is UploadApiResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'url' in data &&
    typeof (data as UploadApiResponse).url === 'string'
  );
}

function getMimeType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}
