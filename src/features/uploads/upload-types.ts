export interface ImageUploadMetadata {
  path: string;
  name: string;
  file?: File;
}

export interface UploadResult {
  originalPath: string;
  originalName: string;
  publicUrl: string;
}

export interface UploadApiResponse {
  url: string;
}
