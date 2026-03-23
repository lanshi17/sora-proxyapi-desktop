import type { LinxiQueryResponse } from './linxi-types';

export interface QueryLinxiTaskParams {
  taskId: string;
  apiKey: string;
}

export interface QueryTaskResult {
  taskId: string;
  status: string;
  videoUrl: string | null;
  thumbnailUrl?: string;
  error?: string | null;
  enhancedPrompt?: string;
  progress?: number;
}

const LINXI_QUERY_ENDPOINT = 'https://linxi.chat/v1/videos';

export async function queryLinxiTask(params: QueryLinxiTaskParams): Promise<QueryTaskResult> {
  const { taskId, apiKey } = params;

  const response = await fetch(`${LINXI_QUERY_ENDPOINT}/${encodeURIComponent(taskId)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Linxi query request failed: ${response.status} ${response.statusText}`);
  }

  const data: unknown = await response.json();

  if (!isValidQueryResponse(data)) {
    throw new Error('Invalid response: missing required task metadata');
  }

  return {
    taskId: data.id,
    status: data.status,
    videoUrl: data.video_url,
    thumbnailUrl: data.thumbnail_url,
    error: data.error,
    enhancedPrompt: data.enhanced_prompt,
    progress: data.detail?.progress_pct
  };
}

function isValidQueryResponse(data: unknown): data is LinxiQueryResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    typeof (data as LinxiQueryResponse).id === 'string' &&
    'status' in data &&
    typeof (data as LinxiQueryResponse).status === 'string'
  );
}
