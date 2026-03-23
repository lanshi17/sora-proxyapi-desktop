import type { LinxiTaskMetadata } from './linxi-types';

export interface RemixVideoParams {
  videoId: string;
  prompt: string;
  size?: string;
  apiKey: string;
}

export interface LinxiRemixResponse {
  task_id: string;
  status: string;
  remixed_from_video_id?: string;
}

const LINXI_REMIX_ENDPOINT = 'https://api.linxi.chat/v1/videos';

export async function remixVideo(params: RemixVideoParams): Promise<LinxiTaskMetadata> {
  const { videoId, prompt, size, apiKey } = params;

  const payload: { prompt: string; size?: string } = { prompt };
  if (size) {
    payload.size = size;
  }

  const response = await fetch(`${LINXI_REMIX_ENDPOINT}/${videoId}/remix`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Linxi remix request failed: ${response.status} ${response.statusText}`);
  }

  const data: unknown = await response.json();

  if (!isValidRemixResponse(data)) {
    throw new Error('Invalid response: missing required task metadata');
  }

  return {
    taskId: data.task_id,
    status: data.status
  };
}

function isValidRemixResponse(data: unknown): data is LinxiRemixResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'task_id' in data &&
    typeof (data as LinxiRemixResponse).task_id === 'string' &&
    'status' in data &&
    typeof (data as LinxiRemixResponse).status === 'string'
  );
}
