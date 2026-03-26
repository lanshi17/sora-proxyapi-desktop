import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/app/App';
import type { GenerationParams } from '../../src/features/video-generation/generation-schema';

const mockCreateLinxiVideoWithFiles = vi.fn();
const mockUseGenerationJob = vi.fn();
const mockLoadSettings = vi.fn();

vi.mock('../../src/features/config/SettingsForm', () => ({
  SettingsForm: ({ onSettingsSaved }: { onSettingsSaved?: (settings: { apiKey: string; model: string }) => void }) => (
    <div>
      <div>Settings Form</div>
      <button
        type="button"
        onClick={() =>
          onSettingsSaved?.({
            apiKey: 'updated-api-key',
            model: 'sora-2-pro'
          })
        }
      >
        Apply Updated Settings
      </button>
    </div>
  )
}));

vi.mock('../../src/features/uploads/ImagePicker', () => ({
  ImagePicker: ({ onImagesSelected }: { onImagesSelected: (images: Array<{ id: string; path: string; name: string; previewUrl: string; file?: File }>) => void }) => (
    <button
      type="button"
      onClick={() =>
        onImagesSelected([
          {
            id: 'img-1',
            path: '/tmp/example.png',
            name: 'example.png',
            previewUrl: 'asset://example.png'
          }
        ])
      }
    >
      Pick Mock Images
    </button>
  )
}));

vi.mock('../../src/features/video-generation/GenerationForm', () => ({
  GenerationForm: ({ onSubmit }: { onSubmit: (params: GenerationParams) => void }) => (
    <button
      type="button"
      onClick={() =>
        onSubmit({
          prompt: 'A cinematic waterfall shot',
          size: '1280x720',
          seconds: 8,
          watermark: false,
          private: false
        })
      }
    >
      Submit Generation
    </button>
  )
}));

vi.mock('../../src/features/config/settings-store', () => ({
  settingsStore: {
    load: () => mockLoadSettings()
  }
}));

vi.mock('../../src/features/video-generation/linxi-create-client', () => ({
  createLinxiVideoWithFiles: (...args: unknown[]) => mockCreateLinxiVideoWithFiles(...args)
}));

vi.mock('../../src/features/video-generation/useGenerationJob', () => ({
  useGenerationJob: (...args: unknown[]) => mockUseGenerationJob(...args)
}));

describe('App workflow', () => {
  beforeEach(() => {
    localStorage.clear();
    mockLoadSettings.mockReset();
    mockCreateLinxiVideoWithFiles.mockReset();
    mockUseGenerationJob.mockReset();

    mockLoadSettings.mockReturnValue({
      apiKey: 'linxi-api-key',
      model: 'sora-turbo'
    });
    mockCreateLinxiVideoWithFiles.mockResolvedValue({
      taskId: 'task-123',
      status: 'pending'
    });
    mockUseGenerationJob.mockReturnValue({
      state: 'idle',
      status: null,
      videoUrl: null,
      error: null
    });
  });

  it('renders a productized generate workspace with clear section structure', () => {
    render(<App />);

    expect(screen.getByTestId('generate-workspace')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Reference Images' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Generation Settings' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Live Output' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pick Mock Images' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Generation' })).toBeInTheDocument();
    expect(screen.getByText(/settings form/i)).toBeInTheDocument();
  });

  it('shows polished empty states before generation starts', () => {
    render(<App />);

    expect(screen.getByText(/no active generation/i)).toBeInTheDocument();
    expect(screen.getByText(/recent jobs in this session/i)).toBeInTheDocument();
  });

  it('shows polished live output and session history cues before generation starts', () => {
    render(<App />);

    expect(screen.getByText('Live Output')).toBeInTheDocument();
    expect(screen.getByText('Session History')).toBeInTheDocument();
  });

  it('shows a validation error when generation starts without selected images', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit Generation' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Select at least one image before generating.');
    expect(mockCreateLinxiVideoWithFiles).not.toHaveBeenCalled();
  });

  it('submits selected local files directly to linxi create endpoint', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Pick Mock Images' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Generation' }));

    await waitFor(() => {
      expect(mockCreateLinxiVideoWithFiles).toHaveBeenCalledWith({
        files: [
          {
            path: '/tmp/example.png',
            name: 'example.png'
          }
        ],
        generationParams: {
          prompt: 'A cinematic waterfall shot',
          size: '1280x720',
          seconds: 8,
          watermark: false,
          private: false
        },
        apiKey: 'linxi-api-key',
        model: 'sora-turbo'
      });
    });

    expect(screen.getAllByText('task-123').length).toBeGreaterThan(0);
  });

  it('uses updated saved settings for file-based generation without restart', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Apply Updated Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pick Mock Images' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Generation' }));

    await waitFor(() => {
      expect(mockCreateLinxiVideoWithFiles).toHaveBeenCalledWith({
        files: [
          {
            path: '/tmp/example.png',
            name: 'example.png'
          }
        ],
        generationParams: {
          prompt: 'A cinematic waterfall shot',
          size: '1280x720',
          seconds: 8,
          watermark: false,
          private: false
        },
        apiKey: 'updated-api-key',
        model: 'sora-2-pro'
      });
    });
  });

  it('shows recent jobs after generation starts', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Pick Mock Images' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Generation' }));

    const recentJobsSection = await screen.findByTestId('recent-jobs');
    expect(within(recentJobsSection).getByRole('heading', { name: /session history/i })).toBeInTheDocument();
    expect(within(recentJobsSection).getByText('task-123')).toBeInTheDocument();
    expect(within(recentJobsSection).getByText(/a cinematic waterfall shot/i)).toBeInTheDocument();
  });

  it('surfaces generation errors instead of leaving rejected promises unhandled', async () => {
    mockCreateLinxiVideoWithFiles.mockRejectedValueOnce(new Error('Linxi create request failed: 401 Unauthorized'));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Pick Mock Images' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Generation' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Linxi create request failed: 401 Unauthorized');
    });
  });

  it('renders completed video state from the polling hook', async () => {
    mockUseGenerationJob.mockReturnValue({
      state: 'completed',
      status: 'completed',
      videoUrl: 'https://cdn.linxi.chat/video.mp4',
      error: null
    });

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Pick Mock Images' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Generation' }));

    await waitFor(() => {
      expect(screen.getByText('completed')).toBeInTheDocument();
    });

    expect(screen.getByTestId('video-player')).toHaveAttribute('src', 'https://cdn.linxi.chat/video.mp4');
  });

  it('allows replay and download from history page after completion', async () => {
    mockUseGenerationJob.mockReturnValue({
      state: 'completed',
      status: 'completed',
      videoUrl: 'https://cdn.linxi.chat/history-video.mp4',
      error: null
    });

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Pick Mock Images' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Generation' }));

    await waitFor(() => {
      expect(screen.getByText('completed')).toBeInTheDocument();
    }, { timeout: 10000 });

    fireEvent.click(screen.getByRole('tab', { name: /history/i }));

    const historyPanel = await screen.findByRole('tabpanel', { name: /history/i });
    expect(within(historyPanel).getByText('task-123')).toBeInTheDocument();
    expect(within(historyPanel).getByTestId('video-player')).toHaveAttribute('src', 'https://cdn.linxi.chat/history-video.mp4');
    expect(within(historyPanel).getByRole('button', { name: /save video/i })).toBeInTheDocument();
  }, 15000);

  it('opens selected task in history when clicking Open from session history', async () => {
    mockUseGenerationJob.mockReturnValue({
      state: 'completed',
      status: 'completed',
      videoUrl: 'https://cdn.linxi.chat/selected-from-open.mp4',
      error: null
    });

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Pick Mock Images' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Generation' }));

    await waitFor(() => {
      expect(screen.getByText('completed')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open in History' }));

    const historyPanel = await screen.findByRole('tabpanel', { name: /history/i });
    expect(within(historyPanel).getByTestId('video-player')).toHaveAttribute(
      'src',
      'https://cdn.linxi.chat/selected-from-open.mp4'
    );
  }, 15000);
});
