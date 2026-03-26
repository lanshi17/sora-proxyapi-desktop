import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../../src/app/App';

describe('App Shell', () => {
  it('renders the main heading', () => {
    render(<App />);
    const heading = screen.getByRole('heading', { name: 'Sora Desktop' });
    expect(heading).toBeInTheDocument();
  });

  it('renders a structured product header with workspace guidance', () => {
    render(<App />);

    expect(screen.getByText(/generate-first linxi video studio/i)).toBeInTheDocument();
    const allLiveTexts = screen.getAllByText('Live');
    expect(allLiveTexts.length).toBeGreaterThan(0);
    const allPreviewTexts = screen.getAllByText('Preview');
    expect(allPreviewTexts.length).toBeGreaterThan(0);
  });

  it('renders workspace navigation for product modes', () => {
    render(<App />);

    expect(screen.getByRole('tab', { name: /generate/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /iterate/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /storyboard/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /history/i })).toBeInTheDocument();
  });

  it('shows an iterate workspace with video selection and remix form', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /iterate/i }));

    const iteratePanel = screen.getByRole('tabpanel', { name: /iterate/i });
    expect(within(iteratePanel).getByRole('heading', { name: 'Iterate' })).toBeInTheDocument();
    expect(within(iteratePanel).getByText('Select a completed video from your session history and create a remix with a new prompt.')).toBeInTheDocument();
    expect(within(iteratePanel).getByRole('heading', { name: 'Select Source Video' })).toBeInTheDocument();
  });

  it('shows a storyboard workspace for multi-shot generation', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /storyboard/i }));

    const storyboardPanel = screen.getByRole('tabpanel', { name: /storyboard/i });
    expect(within(storyboardPanel).getByRole('heading', { name: 'Storyboard' })).toBeInTheDocument();
  });

  it('shows a history workspace for replay and download', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /history/i }));

    const historyPanel = screen.getByRole('tabpanel', { name: /history/i });
    expect(within(historyPanel).getByRole('heading', { name: 'History' })).toBeInTheDocument();
    expect(within(historyPanel).getByText(/reopen completed videos/i)).toBeInTheDocument();
  });
});
