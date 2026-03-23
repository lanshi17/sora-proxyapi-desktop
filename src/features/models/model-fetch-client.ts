export interface ModelInfo {
  id: string;
  object: string;
}

export interface ModelsResponse {
  data: ModelInfo[];
}

const MODELS_ENDPOINT = 'https://linxi.chat/v1/models';

export async function fetchModels(apiKey: string): Promise<ModelInfo[]> {
  const response = await fetch(MODELS_ENDPOINT, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
  }

  const data: ModelsResponse = await response.json();
  
  // Filter for video generation models (sora models)
  return data.data.filter(model => model.id.includes('sora'));
}
