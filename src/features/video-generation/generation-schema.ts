export interface GenerationParams {
  prompt: string;
  seconds: 4 | 8 | 12;
  size: '720x1280' | '1280x720' | '1024x1792' | '1792x1024';
  watermark?: boolean;
  private?: boolean;
  style?: 'thanksgiving' | 'comic' | 'news' | 'selfie' | 'nostalgic' | 'anime';
}

export const defaultGenerationParams: GenerationParams = {
  prompt: '',
  seconds: 4,
  size: '1280x720',
};

export function getDimensionsFromSize(size: GenerationParams['size']): { width: number; height: number } {
  const [width, height] = size.split('x').map(Number);
  return { width, height };
}

export function isPortrait(size: GenerationParams['size']): boolean {
  const { width, height } = getDimensionsFromSize(size);
  return height > width;
}
