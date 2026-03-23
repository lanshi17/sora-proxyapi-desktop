import { ModelCapability, ModelId } from './model-types';

export const modelCatalog: Record<ModelId, ModelCapability> = {
  // OpenAI Sora
  'sora-2': {
    id: 'sora-2',
    label: 'Sora 2',
    provider: 'openai',
    available: true,
    supportedDurations: [10, 15],
    supportedSizes: ['small', 'large'],
    supportsPrivate: true,
    supportsWatermark: true,
    supportsRemix: true,
    description: "OpenAI's advanced video generation model",
  },
  'sora-2-pro': {
    id: 'sora-2-pro',
    label: 'Sora 2 Pro',
    provider: 'openai',
    available: true,
    supportedDurations: [15, 25],
    supportedSizes: ['small', 'large'],
    supportsPrivate: true,
    supportsWatermark: true,
    supportsRemix: true,
    description: 'Premium Sora model with extended duration',
  },

  // Grok
  'grok-video-3': {
    id: 'grok-video-3',
    label: 'Grok Video 3',
    provider: 'grok',
    available: true,
    supportedDurations: [5, 10],
    supportedSizes: ['small', 'large'],
    supportedAspectRatios: ['2:3', '3:2', '1:1'],
    supportsPrivate: true,
    supportsWatermark: false,
    maxResolution: '720P',
    description: "Grok's video generation model with flexible aspect ratios",
  },

  // Luma Dream Machine
  'ray-v1': {
    id: 'ray-v1',
    label: 'Luma Ray v1',
    provider: 'luma',
    available: true,
    supportedDurations: [5],
    supportedSizes: ['small', 'large'],
    supportsPrivate: false,
    supportsWatermark: true,
    supportsExtend: true,
    maxResolution: '720p',
    description: "Luma's first-gen video generation model",
  },
  'ray-v2': {
    id: 'ray-v2',
    label: 'Luma Ray v2',
    provider: 'luma',
    available: true,
    supportedDurations: [5],
    supportedSizes: ['small', 'large'],
    supportsPrivate: false,
    supportsWatermark: true,
    supportsExtend: true,
    maxResolution: '1080p',
    description: "Luma's enhanced video generation with higher quality",
  },

  // Kling AI
  'kling-v1': {
    id: 'kling-v1',
    label: 'Kling v1',
    provider: 'kling',
    available: true,
    supportedDurations: [5, 10],
    supportedSizes: ['small', 'large'],
    supportsPrivate: true,
    supportsWatermark: true,
    description: "Kling's first-generation video model",
  },
  'kling-v1-6': {
    id: 'kling-v1-6',
    label: 'Kling v1.6',
    provider: 'kling',
    available: true,
    supportedDurations: [5, 10],
    supportedSizes: ['small', 'large'],
    supportsPrivate: true,
    supportsWatermark: true,
    description: 'Enhanced Kling v1.6 with improved quality',
  },
  'kling-v2': {
    id: 'kling-v2',
    label: 'Kling v2',
    provider: 'kling',
    available: true,
    supportedDurations: [5, 10],
    supportedSizes: ['small', 'large'],
    supportsPrivate: true,
    supportsWatermark: true,
    description: "Kling's second-generation video model",
  },
  'kling-v2-6': {
    id: 'kling-v2-6',
    label: 'Kling v2.6',
    provider: 'kling',
    available: true,
    supportedDurations: [5, 10],
    supportedSizes: ['small', 'large'],
    supportsPrivate: true,
    supportsWatermark: true,
    description: 'Latest Kling v2.6 with best-in-class quality',
  },

  // Runway
  'gen4_turbo': {
    id: 'gen4_turbo',
    label: 'Runway Gen-4 Turbo',
    provider: 'runway',
    available: true,
    supportedDurations: [5, 10],
    supportedSizes: ['small', 'large'],
    supportsPrivate: true,
    supportsWatermark: true,
    description: "Runway's Gen-4 Turbo for fast generation",
  },
  'gen3a_turbo': {
    id: 'gen3a_turbo',
    label: 'Runway Gen-3 Alpha Turbo',
    provider: 'runway',
    available: true,
    supportedDurations: [5, 10],
    supportedSizes: ['small', 'large'],
    supportsPrivate: true,
    supportsWatermark: true,
    description: "Runway's Gen-3 Alpha Turbo model",
  },

  // Future models (not yet available)
  'veo': {
    id: 'veo',
    label: 'Veo (Coming Soon)',
    provider: 'future',
    available: false,
    supportedDurations: [10, 15],
    supportedSizes: ['small', 'large'],
    supportsPrivate: true,
    supportsWatermark: true,
    description: "Google's Veo video generation model (future)",
  },
  'seedance': {
    id: 'seedance',
    label: 'Seedance (Coming Soon)',
    provider: 'future',
    available: false,
    supportedDurations: [10, 15],
    supportedSizes: ['small', 'large'],
    supportsPrivate: true,
    supportsWatermark: true,
    description: 'ByteDance Seedance video generation model (future)',
  },
};

export function getModelsByProvider(provider: ModelCapability['provider']): ModelCapability[] {
  return Object.values(modelCatalog).filter(m => m.provider === provider);
}

export function getAvailableModels(): ModelCapability[] {
  return Object.values(modelCatalog).filter(m => m.available);
}

export function supportsRemix(modelId: ModelId): boolean {
  return modelCatalog[modelId]?.supportsRemix ?? false;
}

export function supportsExtend(modelId: ModelId): boolean {
  return modelCatalog[modelId]?.supportsExtend ?? false;
}

export function getModelById(modelId: ModelId): ModelCapability | undefined {
  return modelCatalog[modelId];
}
