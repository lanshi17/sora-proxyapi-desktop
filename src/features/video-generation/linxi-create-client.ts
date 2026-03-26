import type { GenerationParams } from './generation-schema';
import type { LinxiTaskMetadata, LinxiCreateResponse } from './linxi-types';

export interface CreateLinxiVideoParams {
  images: string[];
  generationParams: GenerationParams;
  apiKey: string;
  model: string;
}

export interface CreateLinxiVideoWithFilesParams {
  files: (File | { path: string; name: string })[];
  generationParams: GenerationParams;
  apiKey: string;
  model: string;
}

const LINXI_CREATE_ENDPOINT = 'https://linxi.chat/v1/videos';

export async function createLinxiVideoWithFiles(params: CreateLinxiVideoWithFilesParams): Promise<LinxiTaskMetadata> {
  const { files, generationParams, apiKey, model } = params;

  const isNodeEnvironment =
    typeof process !== 'undefined' &&
    process.versions?.node !== undefined;

  if (isNodeEnvironment) {
    const FormData = (await import('form-data')).default;
    const { createReadStream } = await import('fs');

    const formData = new FormData();

    for (const file of files) {
      if ('path' in file) {
        formData.append('input_reference', createReadStream(file.path), file.name);
      }
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

    try {
      const result = await new Promise<LinxiTaskMetadata>((resolve, reject) => {
        formData.submit(
          {
            host: 'linxi.chat',
            path: '/v1/videos',
            protocol: 'https:',
            headers: {
              'Authorization': `Bearer ${apiKey}`
            }
          },
          (err, res) => {
            if (err) {
              reject(err);
              return;
            }

            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () => {
              const body = Buffer.concat(chunks).toString('utf-8');

              if (res.statusCode && res.statusCode >= 400) {
                reject(new Error(`Linxi create request failed: ${res.statusCode} ${res.statusMessage} - ${body}`));
                return;
              }

              try {
                const data: unknown = JSON.parse(body);

                if (!isValidCreateResponse(data)) {
                  reject(new Error('Invalid response: missing required task metadata'));
                  return;
                }

                resolve({
                  taskId: data.id,
                  status: data.status,
                  object: data.object,
                  model: data.model,
                  progress: data.progress,
                  createdAt: data.created_at,
                  seconds: data.seconds,
                  size: data.size
                });
              } catch (parseError) {
                reject(new Error(`Failed to parse response: ${body}`));
              }
            });
            res.on('error', reject);
          }
        );
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  const formData = new FormData();

  for (const file of files) {
    if (file instanceof File) {
      formData.append('input_reference', file);
      continue;
    }

    const tauriFile = await readTauriPathAsFile(file.path, file.name);
    formData.append('input_reference', tauriFile);
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

async function readTauriPathAsFile(path: string, name: string): Promise<File> {
  const { isTauri } = await import('@tauri-apps/api/core');

  if (!isTauri()) {
    throw new Error('File object required in browser mode. Ensure images are selected via file input.');
  }

  const { readFile } = await import('@tauri-apps/plugin-fs');
  const bytes = await readFile(path);

  return new File([bytes], name, {
    type: getMimeType(name)
  });
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

export async function createLinxiVideo(params: CreateLinxiVideoParams): Promise<LinxiTaskMetadata> {
  const { images, generationParams, apiKey, model } = params;

  const formData = new FormData();

  for (const imageUrl of images) {
    formData.append('input_reference', normalizePublicImageUrl(imageUrl));
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

function normalizePublicImageUrl(imageUrl: string): string {
  const normalized = imageUrl.trim();
  if (normalized.length === 0) {
    throw new Error('Image URL cannot be empty');
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Invalid image URL protocol: ${normalized}`);
    }
    return parsed.toString();
  } catch {
    throw new Error(`Invalid image URL: ${imageUrl}`);
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
