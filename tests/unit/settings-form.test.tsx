import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsForm } from '../../src/features/config/SettingsForm';
import * as modelFetchClient from '../../src/features/models/model-fetch-client';

vi.mock('../../src/features/models/model-fetch-client');

describe('SettingsForm', () => {
  const mockOnSettingsSaved = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  test('fetches models when API key is entered', async () => {
    const mockFetchModels = vi.mocked(modelFetchClient.fetchModels);
    mockFetchModels.mockResolvedValueOnce([
      { id: 'sora-2', object: 'model' },
      { id: 'sora-2-pro', object: 'model' }
    ]);

    render(<SettingsForm onSettingsSaved={mockOnSettingsSaved} />);
    
    const apiKeyInput = screen.getByPlaceholderText('Enter your API key');
    fireEvent.change(apiKeyInput, { target: { value: 'test-key-1234567890' } });
    
    await waitFor(() => {
      expect(mockFetchModels).toHaveBeenCalledWith('test-key-1234567890');
    });
  });

  test('populates model dropdown after fetching models', async () => {
    const mockFetchModels = vi.mocked(modelFetchClient.fetchModels);
    mockFetchModels.mockResolvedValueOnce([
      { id: 'sora-2', object: 'model' },
      { id: 'sora-2-pro', object: 'model' }
    ]);

    render(<SettingsForm onSettingsSaved={mockOnSettingsSaved} />);
    
    const apiKeyInput = screen.getByPlaceholderText('Enter your API key');
    fireEvent.change(apiKeyInput, { target: { value: 'test-key-1234567890' } });
    
    await waitFor(() => {
      expect(mockFetchModels).toHaveBeenCalled();
    });
  });
});
