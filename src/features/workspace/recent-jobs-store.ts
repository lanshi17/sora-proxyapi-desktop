import { RecentJob } from './recent-job-types';

const STORE_KEY = 'recent-video-jobs';
const MAX_HISTORY_ITEMS = 50;

export const recentJobsStore = {
  load(): RecentJob[] {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map(normalizeRecentJob)
        .filter((job): job is RecentJob => job !== null)
        .slice(0, MAX_HISTORY_ITEMS);
    } catch (error) {
      console.warn('Failed to parse recent jobs from local storage.', error);
      return [];
    }
  },

  save(jobs: RecentJob[]): void {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify(jobs.slice(0, MAX_HISTORY_ITEMS))
    );
  }
};

function normalizeRecentJob(value: unknown): RecentJob | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.taskId !== 'string' ||
    typeof value.prompt !== 'string' ||
    typeof value.model !== 'string' ||
    typeof value.status !== 'string'
  ) {
    return null;
  }

  const createdAt = typeof value.createdAt === 'number' ? value.createdAt : Date.now();
  const updatedAt = typeof value.updatedAt === 'number' ? value.updatedAt : createdAt;

  return {
    taskId: value.taskId,
    prompt: value.prompt,
    model: value.model,
    status: value.status,
    createdAt,
    updatedAt,
    videoUrl: typeof value.videoUrl === 'string' ? value.videoUrl : null,
    error: typeof value.error === 'string' ? value.error : null
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
