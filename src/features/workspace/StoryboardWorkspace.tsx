import { useState, useCallback } from 'react';
import { createLinxiVideo } from '../video-generation/linxi-create-client';
import { queryLinxiTask } from '../video-generation/linxi-query-client';
import type { GenerationParams } from '../video-generation/generation-schema';

export interface StoryboardShot {
  id: string;
  prompt: string;
  images: string[];
  taskId?: string;
  status?: string;
  videoUrl?: string | null;
  error?: string | null;
}

export interface StoryboardWorkspaceProps {
  apiKey: string;
  model: string;
}

interface ShotGenerationState {
  [shotId: string]: {
    isGenerating: boolean;
    error: string | null;
  };
}

export function StoryboardWorkspace({ apiKey, model }: StoryboardWorkspaceProps) {
  const [shots, setShots] = useState<StoryboardShot[]>([]);
  const [activeShotId, setActiveShotId] = useState<string | null>(null);
  const [generationState, setGenerationState] = useState<ShotGenerationState>({});
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const addShot = useCallback(() => {
    const newShot: StoryboardShot = {
      id: `shot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      prompt: '',
      images: [],
    };
    setShots((prev) => [...prev, newShot]);
    setActiveShotId(newShot.id);
  }, []);

  const removeShot = useCallback((shotId: string) => {
    setShots((prev) => prev.filter((s) => s.id !== shotId));
    if (activeShotId === shotId) {
      setActiveShotId(null);
    }
  }, [activeShotId]);

  const updateShot = useCallback((shotId: string, updates: Partial<StoryboardShot>) => {
    setShots((prev) =>
      prev.map((shot) => (shot.id === shotId ? { ...shot, ...updates } : shot))
    );
  }, []);

  const generateShot = useCallback(
    async (shotId: string, generationParams: GenerationParams) => {
      const shot = shots.find((s) => s.id === shotId);
      if (!shot) return;

      setGenerationState((prev) => ({
        ...prev,
        [shotId]: { isGenerating: true, error: null },
      }));

      try {
        const result = await createLinxiVideo({
          images: shot.images,
          generationParams,
          apiKey,
          model,
        });

        updateShot(shotId, {
          taskId: result.taskId,
          status: result.status,
        });

        // Start polling for this shot
        pollShotStatus(shotId, result.taskId);
      } catch (err) {
        setGenerationState((prev) => ({
          ...prev,
          [shotId]: {
            isGenerating: false,
            error: err instanceof Error ? err.message : 'Failed to generate shot',
          },
        }));
      }
    },
    [shots, apiKey, updateShot]
  );

  const pollShotStatus = useCallback(
    async (shotId: string, taskId: string) => {
      const poll = async () => {
        try {
          const result = await queryLinxiTask({ taskId, apiKey });

          updateShot(shotId, {
            status: result.status,
            videoUrl: result.videoUrl,
            error: result.error,
          });

          if (result.status === 'completed' || result.status === 'failed') {
            setGenerationState((prev) => ({
              ...prev,
              [shotId]: { isGenerating: false, error: result.error || null },
            }));
          } else {
            // Continue polling
            setTimeout(poll, 2000);
          }
        } catch (err) {
          setGenerationState((prev) => ({
            ...prev,
            [shotId]: {
              isGenerating: false,
              error: err instanceof Error ? err.message : 'Polling failed',
            },
          }));
        }
      };

      poll();
    },
    [apiKey, updateShot]
  );

  const generateAllShots = useCallback(
    async (generationParams: GenerationParams) => {
      if (shots.length === 0) {
        setGlobalError('Add at least one shot before generating');
        return;
      }

      setIsGeneratingAll(true);
      setGlobalError(null);

      try {
        // Generate all shots in parallel
        await Promise.all(
          shots.map((shot) =>
            shot.prompt.trim() ? generateShot(shot.id, generationParams) : Promise.resolve()
          )
        );
      } finally {
        setIsGeneratingAll(false);
      }
    },
    [shots, generateShot]
  );

  const activeShot = shots.find((s) => s.id === activeShotId);
  const completedShots = shots.filter((s) => s.status === 'completed').length;
  const totalShots = shots.length;

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
          Multi-Shot Mode
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-slate-900">Storyboard</h2>
          <p className="text-sm text-slate-500">
            Plan and generate multiple shots in sequence. Each shot is generated independently and
            can be assembled into a longer narrative.
          </p>
        </div>
      </div>

      {globalError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {globalError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.9fr)]">
        {/* Shot List */}
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Shot List</h3>
              <p className="text-sm text-slate-500">
                {totalShots === 0
                  ? 'Add shots to build your storyboard'
                  : `${completedShots}/${totalShots} shots completed`}
              </p>
            </div>
            <button
              onClick={addShot}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
            >
              Add Shot
            </button>
          </div>

          {shots.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No shots yet. Click "Add Shot" to start building your storyboard.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {shots.map((shot, index) => (
                <div
                  key={shot.id}
                  onClick={() => setActiveShotId(shot.id)}
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    activeShotId === shot.id
                      ? 'border-slate-900 bg-white'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-slate-900">
                          {shot.prompt.slice(0, 50) || 'Untitled shot'}
                          {shot.prompt.length > 50 ? '...' : ''}
                        </p>
                        <p className="text-xs text-slate-500">
                          {shot.images.length > 0 && `${shot.images.length} image(s) · `}
                          {shot.status === 'completed'
                            ? '✓ Completed'
                            : shot.status === 'failed'
                            ? '✗ Failed'
                            : generationState[shot.id]?.isGenerating
                            ? '⏳ Generating...'
                            : 'Pending'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeShot(shot.id);
                      }}
                      className="text-sm text-slate-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Shot Editor */}
        <div className="flex flex-col gap-6">
          {activeShot ? (
            <>
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-3 flex flex-col gap-1">
                  <h3 className="text-lg font-semibold text-slate-900">Shot Details</h3>
                  <p className="text-sm text-slate-500">
                    Configure the prompt and reference images for this shot.
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold">Prompt</label>
                    <textarea
                      value={activeShot.prompt}
                      onChange={(e) =>
                        updateShot(activeShot.id, { prompt: e.target.value })
                      }
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 p-3 text-sm"
                      placeholder="Describe this shot..."
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold">Image URLs</label>
                    <p className="mb-2 text-xs text-slate-500">
                      Enter public image URLs (one per line) to use as visual references.
                    </p>
                    <textarea
                      value={activeShot.images.join('\n')}
                      onChange={(e) =>
                        updateShot(activeShot.id, {
                          images: e.target.value.split('\n').filter((url) => url.trim()),
                        })
                      }
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 p-3 text-sm font-mono"
                      placeholder="https://example.com/image1.png&#10;https://example.com/image2.png"
                    />
                  </div>

                  {activeShot.videoUrl && (
                    <div>
                      <label className="mb-1 block text-sm font-semibold">Result</label>
                      <video
                        src={activeShot.videoUrl}
                        controls
                        className="w-full rounded-lg"
                        style={{ maxHeight: '200px' }}
                      />
                    </div>
                  )}

                  {generationState[activeShot.id]?.error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {generationState[activeShot.id].error}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-3 flex flex-col gap-1">
                  <h3 className="text-lg font-semibold text-slate-900">Generate This Shot</h3>
                  <p className="text-sm text-slate-500">
                    Use the settings below to generate this individual shot.
                  </p>
                </div>

                <ShotGenerationForm
                  onSubmit={(params) => generateShot(activeShot.id, params)}
                  isGenerating={generationState[activeShot.id]?.isGenerating || false}
                />
              </section>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-sm text-slate-500">
                Select a shot from the list to edit its details.
              </p>
            </div>
          )}

          {/* Global Generation */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="mb-3 flex flex-col gap-1">
              <h3 className="text-lg font-semibold text-slate-900">Generate All Shots</h3>
              <p className="text-sm text-slate-500">
                Generate all pending shots at once with the same settings.
              </p>
            </div>

            <ShotGenerationForm
              onSubmit={generateAllShots}
              isGenerating={isGeneratingAll}
              buttonText={`Generate All ${shots.length > 0 ? `(${shots.length})` : ''}`}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

interface ShotGenerationFormProps {
  onSubmit: (params: GenerationParams) => void;
  isGenerating: boolean;
  buttonText?: string;
}

function ShotGenerationForm({
  onSubmit,
  isGenerating,
  buttonText = 'Generate Shot',
}: ShotGenerationFormProps) {
  const [params, setParams] = useState<GenerationParams>({
    prompt: '',
    size: '1280x720',
    seconds: 4,
    watermark: false,
    private: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(params);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold">Size</label>
          <select
            value={params.size}
            onChange={(e) =>
              setParams((p) => ({ ...p, size: e.target.value as GenerationParams['size'] }))
            }
            className="w-full rounded-lg border border-slate-300 p-2 text-sm"
          >
            <option value="720x1280">720x1280 (Portrait)</option>
            <option value="1280x720">1280x720 (Landscape)</option>
            <option value="1024x1792">1024x1792 (Portrait Pro)</option>
            <option value="1792x1024">1792x1024 (Landscape Pro)</option>
          </select>
        </div>

        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold">Duration</label>
          <select
            value={params.seconds}
            onChange={(e) => setParams((p) => ({ ...p, seconds: Number(e.target.value) as 4 | 8 | 12 }))}
            className="w-full rounded-lg border border-slate-300 p-2 text-sm"
          >
            <option value={4}>4s</option>
            <option value={8}>8s</option>
            <option value={12}>12s</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={params.watermark}
            onChange={(e) => setParams((p) => ({ ...p, watermark: e.target.checked }))}
          />
          Watermark
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={params.private}
            onChange={(e) => setParams((p) => ({ ...p, private: e.target.checked }))}
          />
          Private
        </label>
      </div>

      <button
        type="submit"
        disabled={isGenerating}
        className="mt-2 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? 'Generating...' : buttonText}
      </button>
    </form>
  );
}

