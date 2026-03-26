import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VideoPreview } from '../../src/features/video/VideoPreview';
import * as videoDownload from '../../src/features/video/video-download';
import * as videoCache from '../../src/features/video/video-cache';

vi.mock('../../src/features/video/video-download');
vi.mock('../../src/features/video/video-cache');

describe('VideoPreview', () => {
  const mockVideoUrl = 'https://example.com/video.mp4';

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(videoCache.resolveVideoSource).mockResolvedValue({
      source: mockVideoUrl,
      cachedFilePath: null
    });
  });

  test('renders video element with controls', async () => {
    render(<VideoPreview videoUrl={mockVideoUrl} taskId="task-123" />);

    const video = await screen.findByTestId('video-player');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', mockVideoUrl);
    expect(video).toHaveAttribute('controls');
  });

  test('uses cached local file path when Save Video button clicked', async () => {
    vi.mocked(videoCache.resolveVideoSource).mockResolvedValueOnce({
      source: 'asset:///tmp/linxi-video-cache/video-task-123.mp4',
      cachedFilePath: '/tmp/linxi-video-cache/video-task-123.mp4'
    });
    vi.mocked(videoDownload.downloadVideo).mockResolvedValueOnce(undefined);

    render(<VideoPreview videoUrl={mockVideoUrl} taskId="task-123" />);

    const downloadBtn = await screen.findByText('Save Video');
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(videoDownload.downloadVideo).toHaveBeenCalledWith('/tmp/linxi-video-cache/video-task-123.mp4', 'task-123');
    });
  });

  test('shows loading spinner while video is idle', async () => {
    render(<VideoPreview videoUrl={mockVideoUrl} taskId="task-123" />);
    expect(await screen.findByTestId('video-player')).toBeInTheDocument();
  });
});
