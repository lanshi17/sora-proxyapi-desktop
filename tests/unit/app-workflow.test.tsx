import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/app/App';

const mockUploadImages = vi.fn();
const mockCreateLinxiVideo = vi.fn();
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
  ImagePicker: ({ onImagesSelected }: { onImagesSelected: (images: Array<{ id: string; path: string; name: string; previewUrl: string }>) => void }) => (
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
  GenerationForm: ({ onSubmit }: { onSubmit: (params: { prompt: string; orientation: 'landscape' | 'portrait'; size: 'small' | 'large'; duration: 10 | 15 | 25; watermark: boolean; private: boolean }) => void }) => (
    <button
      type="button"
      onClick={() =>
        onSubmit({
          prompt: 'A cinematic waterfall shot',
          orientation: 'landscape',
          size: 'large',
          duration: 15,
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

vi.mock('../../src/features/uploads/upload-client', () => ({
  uploadImages: (...args: unknown[]) => mockUploadImages(...args)
}));

vi.mock('../../src/features/video-generation/linxi-create-client', () => ({
  createLinxiVideo: (...args: unknown[]) => mockCreateLinxiVideo(...args)
}));

vi.mock('../../src/features/video-generation/useGenerationJob', () => ({
  useGenerationJob: (...args: unknown[]) => mockUseGenerationJob(...args)
}));

describe('App workflow', () => {
  beforeEach(() => {
    mockLoadSettings.mockReset();
    mockUploadImages.mockReset();
    mockCreateLinxiVideo.mockReset();
    mockUseGenerationJob.mockReset();

    mockLoadSettings.mockReturnValue({
      apiKey: 'linxi-api-key',
      model: 'sora-turbo'
    });
    mockUploadImages.mockResolvedValue([
      {
        originalPath: '/tmp/example.png',
        originalName: 'example.png',
        publicUrl: 'https://png.cm/uploads/example.png'
      }
    ]);
    mockCreateLinxiVideo.mockResolvedValue({
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

    expect(screen.getByText(/no active generation yet/i)).toBeInTheDocument();
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
    expect(mockUploadImages).not.toHaveBeenCalled();
    expect(mockCreateLinxiVideo).not.toHaveBeenCalled();
  });

  it('uploads selected images and creates a linxi job', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Pick Mock Images' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Generation' }));

    await waitFor(() => {
      expect(mockUploadImages).toHaveBeenCalledWith({
        images: [
          {
            path: '/tmp/example.png',
            name: 'example.png'
          }
        ],
        endpoint: 'https://img.linxi.icu/api/index.php',
        token: '1c17b11693cb5ec63859b091c5b9c1b2'
      });
    });

    await waitFor(() => {
      expect(mockCreateLinxiVideo).toHaveBeenCalledWith({
        images: ['https://png.cm/uploads/example.png'],
        generationParams: {
          prompt: 'A cinematic waterfall shot',
          orientation: 'landscape',
          size: 'large',
          duration: 15,
          watermark: false,
          private: false
        },
        apiKey: 'linxi-api-key',
        model: 'sora-turbo'
      });
    });

    expect(screen.getAllByText('task-123').length).toBeGreaterThan(0);
  });

  it('uses updated saved settings for upload and generation without restart', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Apply Updated Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pick Mock Images' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Generation' }));

    await waitFor(() => {
      expect(mockUploadImages).toHaveBeenCalledWith({
        images: [
          {
            path: '/tmp/example.png',
            name: 'example.png'
          }
        ],
        endpoint: 'https://img.linxi.icu/api/index.php',
        token: '1c17b11693cb5ec63859b091c5b9c1b2'
      });
    });

    await waitFor(() => {
      expect(mockCreateLinxiVideo).toHaveBeenCalledWith({
        images: ['https://png.cm/uploads/example.png'],
        generationParams: {
          prompt: 'A cinematic waterfall shot',
          orientation: 'landscape',
          size: 'large',
          duration: 15,
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
    expect(screen.getByRole('link', { name: 'Open generated video' })).toHaveAttribute(
      'href',
      'https://cdn.linxi.chat/video.mp4'
    );
});

});
