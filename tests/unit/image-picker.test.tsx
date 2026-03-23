import { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImagePicker } from '../../src/features/uploads/ImagePicker';
import { ImagePreview } from '../../src/features/uploads/image-preview';

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: vi.fn((path: string) => `asset://${path}`),
  isTauri: vi.fn(() => true),
}));

import { open } from '@tauri-apps/plugin-dialog';
import { isTauri } from '@tauri-apps/api/core';

const mockCreateObjectURL = vi.fn((file: File) => `blob:${file.name}`);

function TestWrapper({ onImagesSelected }: { onImagesSelected: (images: ImagePreview[]) => void }) {
  const [images, setImages] = useState<ImagePreview[]>([]);
  return (
    <ImagePicker 
      selectedImages={images} 
      onImagesSelected={(imgs) => {
        setImages(imgs);
        onImagesSelected(imgs);
      }} 
    />
  );
}

describe('ImagePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isTauri).mockReturnValue(true);
    vi.stubGlobal('URL', {
      createObjectURL: mockCreateObjectURL,
    });
  });

  it('renders a polished reference-image picker entry point', () => {
    render(<ImagePicker onImagesSelected={() => {}} />);
    expect(screen.getByRole('button', { name: /add reference images/i })).toBeInTheDocument();
    expect(screen.getByText(/png, jpg, webp, or gif/i)).toBeInTheDocument();
  });

  it('calls onImagesSelected when images are selected via Tauri dialog', async () => {
    const handleImagesSelected = vi.fn();
    (open as any).mockResolvedValueOnce(['/path/to/hello.png']);

    render(<TestWrapper onImagesSelected={handleImagesSelected} />);
    
    const button = screen.getByRole('button', { name: /add reference images/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(open).toHaveBeenCalledWith({
        multiple: true,
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }]
      });
      expect(handleImagesSelected).toHaveBeenCalledTimes(1);
      const selectedImages = handleImagesSelected.mock.calls[0][0];
      expect(selectedImages).toHaveLength(1);
      expect(selectedImages[0].name).toBe('hello.png');
      expect(selectedImages[0].path).toBe('/path/to/hello.png');
      expect(selectedImages[0].previewUrl).toBe('asset:///path/to/hello.png');
    });
  });

  it('falls back to browser file selection when not running in Tauri', async () => {
    const handleImagesSelected = vi.fn();
    vi.mocked(isTauri).mockReturnValue(false);

    render(<TestWrapper onImagesSelected={handleImagesSelected} />);

    fireEvent.click(screen.getByRole('button', { name: /add reference images/i }));

    expect(open).not.toHaveBeenCalled();

    const input = screen.getByTestId('browser-image-input');
    expect(input).toBeInTheDocument();

    const file = new File(['hello'], 'fallback.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(handleImagesSelected).toHaveBeenCalledTimes(1);
      const selectedImages = handleImagesSelected.mock.calls[0][0];
      expect(selectedImages).toHaveLength(1);
      expect(selectedImages[0].name).toBe('fallback.png');
      expect(selectedImages[0].path).toBe('fallback.png');
      expect(selectedImages[0].previewUrl).toBe('blob:fallback.png');
    });
  });

  it('allows removing a selected image after browser fallback selection', async () => {
    const handleImagesSelected = vi.fn();
    vi.mocked(isTauri).mockReturnValue(false);

    render(<TestWrapper onImagesSelected={handleImagesSelected} />);

    fireEvent.click(screen.getByRole('button', { name: /add reference images/i }));

    const input = screen.getByTestId('browser-image-input');
    const file = new File(['hello'], 'fallback.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    const removeButton = await screen.findByRole('button', { name: /remove fallback.png/i });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(handleImagesSelected).toHaveBeenCalledTimes(2);
      expect(handleImagesSelected.mock.calls[1][0]).toHaveLength(0);
      expect(screen.queryByRole('button', { name: /remove fallback.png/i })).not.toBeInTheDocument();
    });
  });
});

