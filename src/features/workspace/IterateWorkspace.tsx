import { useState, FormEvent } from 'react';
import { useRemixJob } from '../video-generation/useRemixJob';
import { remixVideo } from '../video-generation/linxi-remix-client';
import { RecentJob } from './recent-job-types';

export interface IterateWorkspaceProps {
  recentJobs: RecentJob[];
  apiKey: string;
}

interface RemixFormData {
  prompt: string;
  size?: string;
}

export function IterateWorkspace({ recentJobs, apiKey }: IterateWorkspaceProps) {
  const [selectedJob, setSelectedJob] = useState<RecentJob | null>(null);
  const [remixTaskId, setRemixTaskId] = useState<string | null>(null);
  const [remixError, setRemixError] = useState<string | null>(null);
  const [formData, setFormData] = useState<RemixFormData>({ prompt: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const remixJob = useRemixJob({
    taskId: remixTaskId,
    apiKey,
    pollingInterval: 1000,
    timeoutMs: 900000
  });

  const completedJobs = recentJobs.filter(job => job.status === 'completed');
  const hasResult = Boolean(remixTaskId || remixJob.videoUrl || remixJob.error);

  const handleSelectJob = (job: RecentJob) => {
    setSelectedJob(job);
    setRemixTaskId(null);
    setRemixError(null);
    setFormData({ prompt: '' });
  };

  const handleSubmitRemix = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!selectedJob) {
      setRemixError('Please select a video to remix');
      return;
    }

    if (!formData.prompt.trim()) {
      setRemixError('Please enter a remix prompt');
      return;
    }

    setIsSubmitting(true);
    setRemixError(null);

    try {
      const result = await remixVideo({
        videoId: selectedJob.taskId,
        prompt: formData.prompt,
        size: formData.size,
        apiKey
      });

      setRemixTaskId(result.taskId);
    } catch (err) {
      setRemixError(err instanceof Error ? err.message : 'Remix request failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div data-testid="iterate-workspace" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold text-slate-900">Iterate</h2>
          <span className="inline-flex w-fit items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
            Live
          </span>
        </div>
        <p className="text-sm text-slate-500">
          Select a completed video from your session history and create a remix with a new prompt.
        </p>
      </div>

      {remixError ? (
        <div role="alert" className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-700">
          {remixError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-1">
              <h3 className="text-lg font-semibold text-slate-900">Select Source Video</h3>
              <p className="text-sm text-slate-500">
                Choose a completed video from your recent jobs to use as the base for remixing.
              </p>
            </div>

            {completedJobs.length > 0 ? (
              <ul className="flex flex-col gap-3" data-testid="completed-jobs-list">
                {completedJobs.map((job) => (
                  <li 
                    key={job.taskId} 
                    className={`cursor-pointer rounded-xl border p-4 transition ${
                      selectedJob?.taskId === job.taskId
                        ? 'border-cyan-400 bg-cyan-50'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                    onClick={() => handleSelectJob(job)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectJob(job);
                      }
                    }}
                    data-testid={`job-item-${job.taskId}`}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Task ID</span>
                      <p className="font-medium text-slate-900">{job.taskId}</p>
                    </div>
                    <p className="mt-3 text-sm text-slate-700">{job.prompt}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>Model: {job.model}</span>
                      <span>Status: {job.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                <p className="font-medium text-slate-900">No completed videos available.</p>
                <p className="mt-2">Complete a generation in the Generate tab first, then return here to remix it.</p>
              </div>
            )}
          </section>

          {selectedJob && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-1">
                <h3 className="text-lg font-semibold text-slate-900">Remix Configuration</h3>
                <p className="text-sm text-slate-500">
                  Describe how you want to modify the selected video. The original video will be used as a reference.
                </p>
              </div>

              <form onSubmit={handleSubmitRemix} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="remix-prompt" className="text-sm font-medium text-slate-700">
                    Remix Prompt
                  </label>
                  <textarea
                    id="remix-prompt"
                    value={formData.prompt}
                    onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                    placeholder="e.g., Make it more cinematic, add slow motion, change the lighting to golden hour..."
                    className="min-h-[100px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    disabled={isSubmitting}
                    data-testid="remix-prompt-input"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="remix-size" className="text-sm font-medium text-slate-700">
                    Size (optional)
                  </label>
                  <select
                    id="remix-size"
                    value={formData.size || ''}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value || undefined })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    disabled={isSubmitting}
                    data-testid="remix-size-select"
                  >
                    <option value="">Default</option>
                    <option value="1080x1920">1080x1920 (Portrait)</option>
                    <option value="1920x1080">1920x1080 (Landscape)</option>
                    <option value="1080x1080">1080x1080 (Square)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !formData.prompt.trim()}
                  className="inline-flex w-fit items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="remix-submit-button"
                >
                  {isSubmitting ? 'Submitting...' : 'Create Remix'}
                </button>
              </form>
            </section>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold text-slate-900">Remix Output</h3>
                <p className="text-sm text-slate-500">
                  Follow the remix task progress and access the remixed video when complete.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-700">
                Live Status
              </span>
            </div>

            {hasResult ? (
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
                {remixTaskId ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Remix Task ID</span>
                    <p className="font-medium text-slate-900">{remixTaskId}</p>
                  </div>
                ) : null}

                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</span>
                  <p className="font-medium text-slate-900">{remixJob.status ?? remixJob.state}</p>
                </div>

                {remixJob.error ? (
                  <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {remixJob.error}
                  </p>
                ) : null}

                {remixJob.videoUrl ? (
                  <a
                    href={remixJob.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                  >
                    Open remixed video
                  </a>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                <p className="font-medium text-slate-900">No active remix yet.</p>
                <p className="mt-2">Select a video and submit a remix request to see live progress here.</p>
              </div>
            )}
          </section>

          {selectedJob && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-1">
                <h3 className="text-lg font-semibold text-slate-900">Selected Source</h3>
                <p className="text-sm text-slate-500">
                  The video currently selected for remixing.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" data-testid="selected-source-preview">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Task ID</span>
                  <p className="font-medium text-slate-900">{selectedJob.taskId}</p>
                </div>
                <p className="mt-3 text-sm text-slate-700">{selectedJob.prompt}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>Model: {selectedJob.model}</span>
                  <span>Status: {selectedJob.status}</span>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
