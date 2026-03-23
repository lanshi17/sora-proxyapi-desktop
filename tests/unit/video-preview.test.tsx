import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VideoPreview } from '../../src/features/video/VideoPreview';
import * as videoDownload from '../../src/features/video/video-download';

vi.mock('../../src/features/video/video-download');

describe('VideoPreview', () => {
  const mockVideoUrl = 'https://example.com/video.mp4';

  test('renders video element with controls', () => {
    render(<VideoPreview videoUrl={mockVideoUrl} taskId="task-123" />);
    
    const video = screen.getByTestId('video-player');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', mockVideoUrl);
    expect(video).toHaveAttribute('controls');
  });

  test('calls download function when download button clicked', async () => {
    const mockDownload = vi.mocked(videoDownload.downloadVideo).mockResolvedValueOnce(undefined);
    
    render(<VideoPreview videoUrl={mockVideoUrl} taskId="task-123" />);
    
    const downloadBtn = screen.getByText('Download Video');
    fireEvent.click(downloadBtn);
    
    await waitFor(() => {
      expect(mockDownload).toHaveBeenCalledWith(mockVideoUrl, 'task-123');
    });
  });
});
