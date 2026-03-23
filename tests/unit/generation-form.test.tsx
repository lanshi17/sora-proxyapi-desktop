import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { GenerationForm } from '../../src/features/video-generation/GenerationForm';

describe('GenerationForm', () => {
  it('renders polished generation header and primary action', () => {
    const handleSubmit = vi.fn();
    render(<GenerationForm onSubmit={handleSubmit} model="sora-v1" />);

    expect(screen.getByText('Create Video')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start generation/i })).toBeInTheDocument();
  });

  it('shows validation error when submitted with empty prompt', async () => {
    const handleSubmit = vi.fn();
    render(<GenerationForm onSubmit={handleSubmit} model="sora-v1" />);
    
    const submitButton = screen.getByRole('button', { name: /start generation/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a prompt/i)).toBeInTheDocument();
    });
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with basic params for non-all models', async () => {
    const handleSubmit = vi.fn();
    render(<GenerationForm onSubmit={handleSubmit} model="sora-v1" />);

    fireEvent.change(screen.getByPlaceholderText(/describe your video/i), {
      target: { value: 'A cute cat' },
    });

    fireEvent.click(screen.getByRole('button', { name: /start generation/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        prompt: 'A cute cat',
        seconds: 4,
        size: '1280x720',
      });
    });
  });

  it('shows watermark, private, style fields for -all models', () => {
    const handleSubmit = vi.fn();
    render(<GenerationForm onSubmit={handleSubmit} model="sora-v1-all" />);

    expect(screen.getByLabelText(/include watermark/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/private generation/i)).toBeInTheDocument();
    expect(screen.getByText(/style/i)).toBeInTheDocument();
  });

  it('does not show watermark, private, style fields for non-all models', () => {
    const handleSubmit = vi.fn();
    render(<GenerationForm onSubmit={handleSubmit} model="sora-v1" />);

    expect(screen.queryByLabelText(/include watermark/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/private generation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/style/i)).not.toBeInTheDocument();
  });

  it('calls onSubmit with all params for -all models', async () => {
    const handleSubmit = vi.fn();
    render(<GenerationForm onSubmit={handleSubmit} model="sora-v1-all" />);

    fireEvent.change(screen.getByPlaceholderText(/describe your video/i), {
      target: { value: 'A cute cat' },
    });

    fireEvent.click(screen.getByLabelText(/include watermark/i));
    fireEvent.click(screen.getByLabelText(/private generation/i));

    fireEvent.click(screen.getByRole('button', { name: /start generation/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        prompt: 'A cute cat',
        seconds: 4,
        size: '1280x720',
        watermark: true,
        private: true,
        style: undefined,
      });
    });
  });
});
