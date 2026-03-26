export interface RecentJob {
  taskId: string;
  prompt: string;
  model: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  videoUrl: string | null;
  error?: string | null;
}
