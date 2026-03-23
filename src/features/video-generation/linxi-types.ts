export interface LinxiCreateRequest {
  images: string[];
  model: string;
  prompt: string;
  seconds: 4 | 8 | 12;
  size: '720x1280' | '1280x720' | '1024x1792' | '1792x1024';
  watermark: boolean;
  private: boolean;
  style?: 'thanksgiving' | 'comic' | 'news' | 'selfie' | 'nostalgic' | 'anime';
}

export interface LinxiCreateResponse {
  id: string;
  object: string;
  model: string;
  status: string;
  progress: number;
  created_at: number;
  seconds: string;
  size: string;
}

export interface LinxiTaskMetadata {
  taskId: string;
  status: string;
  object?: string;
  model?: string;
  progress?: number;
  createdAt?: number;
  seconds?: string;
  size?: string;
}

export interface LinxiQueryResponse {
  id: string;
  status: string;
  video_url: string | null;
  thumbnail_url?: string;
  error?: string;
  enhanced_prompt?: string;
  status_update_time?: number;
  detail?: {
    progress_pct?: number;
    status?: string;
  };
}
