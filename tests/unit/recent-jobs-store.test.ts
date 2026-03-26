import { beforeEach, describe, expect, test } from 'vitest';
import { recentJobsStore } from '../../src/features/workspace/recent-jobs-store';
import type { RecentJob } from '../../src/features/workspace/recent-job-types';

describe('recentJobsStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('returns empty list when store is empty', () => {
    expect(recentJobsStore.load()).toEqual([]);
  });

  test('saves and loads jobs', () => {
    const jobs: RecentJob[] = [
      {
        taskId: 'task-1',
        prompt: 'Prompt 1',
        model: 'sora-2',
        status: 'completed',
        createdAt: 1,
        updatedAt: 2,
        videoUrl: 'https://example.com/video-1.mp4',
        error: null
      }
    ];

    recentJobsStore.save(jobs);

    expect(recentJobsStore.load()).toEqual(jobs);
  });

  test('normalizes legacy records without updatedAt/videoUrl', () => {
    localStorage.setItem(
      'recent-video-jobs',
      JSON.stringify([
        {
          taskId: 'legacy-task',
          prompt: 'Legacy prompt',
          model: 'sora-2',
          status: 'pending',
          createdAt: 1700000000000
        }
      ])
    );

    const jobs = recentJobsStore.load();

    expect(jobs).toHaveLength(1);
    expect(jobs[0].taskId).toBe('legacy-task');
    expect(jobs[0].updatedAt).toBe(1700000000000);
    expect(jobs[0].videoUrl).toBeNull();
    expect(jobs[0].error).toBeNull();
  });
});
