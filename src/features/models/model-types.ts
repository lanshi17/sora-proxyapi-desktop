// Supported video generation models from the Linxi API
export type ModelId =
  // OpenAI Sora
  | 'sora-2'
  | 'sora-2-pro'
  // Grok
  | 'grok-video-3'
  // Luma Dream Machine
  | 'ray-v1'
  | 'ray-v2'
  // Kling AI
  | 'kling-v1'
  | 'kling-v1-6'
  | 'kling-v2'
  | 'kling-v2-6'
  // Runway
  | 'gen4_turbo'
  | 'gen3a_turbo'
  // Future models
  | 'veo'
  | 'seedance';

export type ModelSize = 'small' | 'large';

export interface ModelCapability {
  id: ModelId;
  label: string;
  provider: 'openai' | 'grok' | 'luma' | 'kling' | 'runway' | 'future';
  available: boolean;
  supportedDurations: number[]; // in seconds
  supportedSizes: ModelSize[];
  supportedAspectRatios?: string[];
  supportsPrivate: boolean;
  supportsWatermark: boolean;
  supportsRemix?: boolean;
  supportsExtend?: boolean;
  maxResolution?: string;
  description?: string;
}
