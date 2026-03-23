# Video Generation Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete video generation workflow with Ant Design components, model fetching, image preprocessing, video preview, and macOS packaging.

**Architecture:** Frontend React app using Ant Design components for UI. Image preprocessing happens client-side using canvas API before upload. Video download uses Tauri's file system API to save to Downloads folder. All custom CSS replaced with Ant Design components.

**Tech Stack:** Tauri 2, React 19, TypeScript, Vite, Ant Design (antd), Vitest

---

## Task 1: Add Ant Design Dependency

**Files:**
- Modify: `package.json`
- Modify: `src/main.tsx` (add CSS import)

**Step 1: Install Ant Design**

```bash
npm install antd
```

**Step 2: Import Ant Design CSS in main.tsx**

Add to `src/main.tsx`:
```typescript
import 'antd/dist/reset.css';
```

**Step 3: Verify installation**

```bash
npm run build
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add package.json package-lock.json src/main.tsx
git commit -m "deps: add antd for UI components"
```

---

## Task 2: Create Model Fetching Client

**Files:**
- Create: `src/features/models/model-fetch-client.ts`
- Create: `tests/unit/model-fetch-client.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/model-fetch-client.test.ts`:
```typescript
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { fetchModels } from '../../src/features/models/model-fetch-client';

describe('fetchModels', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  test('fetches models from Linxi API', async () => {
    const apiKey = 'test-api-key';
    const mockResponse = {
      data: [
        { id: 'sora-2', object: 'model' },
        { id: 'sora-2-pro', object: 'model' }
      ]
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const models = await fetchModels(apiKey);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.linxi.chat/v1/models',
      {
        headers: {
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json'
        }
      }
    );
    expect(models).toHaveLength(2);
    expect(models[0].id).toBe('sora-2');
  });

  test('throws error when API fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    });

    await expect(fetchModels('invalid-key')).rejects.toThrow('Failed to fetch models');
  });

  test('filters video generation models only', async () => {
    const mockResponse = {
      data: [
        { id: 'sora-2', object: 'model' },
        { id: 'gpt-4', object: 'model' },
        { id: 'sora-2-pro', object: 'model' }
      ]
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const models = await fetchModels('test-key');
    
    expect(models.every(m => m.id.includes('sora'))).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/unit/model-fetch-client.test.ts
```

Expected: FAIL with "Cannot find module"

**Step 3: Write implementation**

Create `src/features/models/model-fetch-client.ts`:
```typescript
export interface ModelInfo {
  id: string;
  object: string;
}

export interface ModelsResponse {
  data: ModelInfo[];
}

const MODELS_ENDPOINT = 'https://api.linxi.chat/v1/models';

export async function fetchModels(apiKey: string): Promise<ModelInfo[]> {
  const response = await fetch(MODELS_ENDPOINT, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
  }

  const data: ModelsResponse = await response.json();
  
  // Filter for video generation models (sora models)
  return data.data.filter(model => model.id.includes('sora'));
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- tests/unit/model-fetch-client.test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add tests/unit/model-fetch-client.test.ts src/features/models/model-fetch-client.ts
git commit -m "feat: add model fetching client for Linxi API"
```

---

## Task 3: Update SettingsForm with Ant Design and Model Dropdown

**Files:**
- Modify: `src/features/config/SettingsForm.tsx`
- Modify: `src/features/config/settings-types.ts`
- Modify: `tests/unit/settings-form.test.tsx`

**Step 1: Update settings types**

Modify `src/features/config/settings-types.ts`:
```typescript
export interface AppSettings {
  apiKey: string;
  model: string;
  uploadEndpoint: string;
  availableModels?: string[]; // Cache fetched models
}
```

**Step 2: Write failing test for model fetching**

Update `tests/unit/settings-form.test.tsx`:
```typescript
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
    fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });
    
    await waitFor(() => {
      expect(mockFetchModels).toHaveBeenCalledWith('test-key');
    });
  });

  test('displays model options in dropdown', async () => {
    const mockFetchModels = vi.mocked(modelFetchClient.fetchModels);
    mockFetchModels.mockResolvedValueOnce([
      { id: 'sora-2', object: 'model' }
    ]);

    render(<SettingsForm onSettingsSaved={mockOnSettingsSaved} />);
    
    const apiKeyInput = screen.getByPlaceholderText('Enter your API key');
    fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });
    
    await waitFor(() => {
      expect(screen.getByText('sora-2')).toBeInTheDocument();
    });
  });
});
```

**Step 3: Run test to verify it fails**

```bash
npm test -- tests/unit/settings-form.test.tsx
```

Expected: FAIL

**Step 4: Rewrite SettingsForm with Ant Design**

Replace `src/features/config/SettingsForm.tsx`:
```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Select, Button, Card, message } from 'antd';
import { fetchModels, ModelInfo } from '../models/model-fetch-client';
import { settingsStore } from './settings-store';
import { AppSettings } from './settings-types';

export interface SettingsFormProps {
  onSettingsSaved?: (settings: AppSettings) => void;
}

export function SettingsForm({ onSettingsSaved }: SettingsFormProps) {
  const [form] = Form.useForm();
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const saved = settingsStore.load();
    form.setFieldsValue(saved);
    if (saved.apiKey) {
      loadModels(saved.apiKey);
    }
  }, [form]);

  const loadModels = useCallback(async (apiKey: string) => {
    setLoading(true);
    try {
      const fetchedModels = await fetchModels(apiKey);
      setModels(fetchedModels);
    } catch (err) {
      message.error('Failed to fetch models. Please check your API key.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const apiKey = e.target.value;
    if (apiKey.length > 10) {
      loadModels(apiKey);
    }
  };

  const handleSubmit = (values: AppSettings) => {
    const settings: AppSettings = {
      ...values,
      availableModels: models.map(m => m.id)
    };
    settingsStore.save(settings);
    onSettingsSaved?.(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    message.success('Settings saved successfully');
  };

  return (
    <Card title="Workspace Settings" bordered={false}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          label="API Key"
          name="apiKey"
          rules={[{ required: true, message: 'Please enter your API key' }]}
        >
          <Input.Password
            placeholder="Enter your API key"
            onChange={handleApiKeyChange}
          />
        </Form.Item>

        <Form.Item
          label="Model"
          name="model"
          rules={[{ required: true, message: 'Please select a model' }]}
        >
          <Select
            placeholder="Select a model"
            loading={loading}
            options={models.map(m => ({
              label: m.id,
              value: m.id
            }))}
          />
        </Form.Item>

        <Form.Item
          label="Upload Endpoint"
          name="uploadEndpoint"
          rules={[{ required: true, message: 'Please enter upload endpoint' }]}
        >
          <Input placeholder="https://img.linxi.icu/api/index.php" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" block>
            {saved ? 'Saved!' : 'Save Settings'}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
```

**Step 5: Run all tests**

```bash
npm test
```

Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/features/config/ tests/unit/settings-form.test.tsx
git commit -m "feat: rewrite SettingsForm with Ant Design and model fetching"
```

---

## Task 4: Create Image Preprocessing Utility

**Files:**
- Create: `src/features/uploads/image-preprocess.ts`
- Create: `tests/unit/image-preprocess.test.ts`

**Step 1: Write failing test**

Create `tests/unit/image-preprocess.test.ts`:
```typescript
import { describe, test, expect } from 'vitest';
import { resizeImageToVideoDimensions, getTargetDimensions } from '../../src/features/uploads/image-preprocess';

describe('image-preprocess', () => {
  describe('getTargetDimensions', () => {
    test('returns sora-2 landscape dimensions', () => {
      const dims = getTargetDimensions('sora-2', 'landscape');
      expect(dims).toEqual({ width: 1280, height: 720 });
    });

    test('returns sora-2 portrait dimensions', () => {
      const dims = getTargetDimensions('sora-2', 'portrait');
      expect(dims).toEqual({ width: 720, height: 1280 });
    });

    test('returns sora-2-pro landscape dimensions', () => {
      const dims = getTargetDimensions('sora-2-pro', 'landscape');
      expect(dims).toEqual({ width: 1792, height: 1024 });
    });

    test('returns sora-2-pro portrait dimensions', () => {
      const dims = getTargetDimensions('sora-2-pro', 'portrait');
      expect(dims).toEqual({ width: 1024, height: 1792 });
    });
  });

  describe('resizeImageToVideoDimensions', () => {
    test('resizes image to target dimensions', async () => {
      // Create a small test image
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 100, 100);
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg');
      });
      
      const file = new File([blob], 'test.jpg', { type: 'image/jpeg' });
      
      const resized = await resizeImageToVideoDimensions(file, { width: 50, height: 50 });
      
      expect(resized).toBeInstanceOf(File);
      expect(resized.name).toBe('test.jpg');
      expect(resized.type).toBe('image/jpeg');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/unit/image-preprocess.test.ts
```

Expected: FAIL

**Step 3: Write implementation**

Create `src/features/uploads/image-preprocess.ts`:
```typescript
export interface Dimensions {
  width: number;
  height: number;
}

export function getTargetDimensions(model: string, orientation: 'landscape' | 'portrait'): Dimensions {
  const dimensions: Record<string, Record<string, Dimensions>> = {
    'sora-2': {
      landscape: { width: 1280, height: 720 },
      portrait: { width: 720, height: 1280 }
    },
    'sora-2-pro': {
      landscape: { width: 1792, height: 1024 },
      portrait: { width: 1024, height: 1792 }
    }
  };

  return dimensions[model]?.[orientation] ?? { width: 1280, height: 720 };
}

export async function resizeImageToVideoDimensions(
  file: File,
  targetDimensions: Dimensions
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const canvas = document.createElement('canvas');
      canvas.width = targetDimensions.width;
      canvas.height = targetDimensions.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Fill with black background for letterboxing
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Calculate scale to fit within target while maintaining aspect ratio
      const scale = Math.min(
        targetDimensions.width / img.width,
        targetDimensions.height / img.height
      );
      
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      
      // Center the image
      const x = (targetDimensions.width - scaledWidth) / 2;
      const y = (targetDimensions.height - scaledHeight) / 2;
      
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          const resizedFile = new File([blob], file.name, { type: file.type });
          resolve(resizedFile);
        },
        file.type,
        0.95
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- tests/unit/image-preprocess.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/features/uploads/image-preprocess.ts tests/unit/image-preprocess.test.ts
git commit -m "feat: add image preprocessing utility for video dimensions"
```

---

## Task 5: Update GenerationForm with Ant Design

**Files:**
- Modify: `src/features/video-generation/GenerationForm.tsx`

**Step 1: Rewrite with Ant Design**

Replace `src/features/video-generation/GenerationForm.tsx`:
```typescript
import React, { useState } from 'react';
import { Form, Input, Select, Radio, Checkbox, Button, Card, Space } from 'antd';
import { GenerationParams, defaultGenerationParams } from './generation-schema';

const { TextArea } = Input;

const DURATION_OPTIONS = [
  { label: '5s', value: 5 },
  { label: '10s', value: 10 },
  { label: '15s', value: 15 },
  { label: '25s', value: 25 }
];

interface GenerationFormProps {
  onSubmit: (params: GenerationParams) => void;
}

export function GenerationForm({ onSubmit }: GenerationFormProps) {
  const [form] = Form.useForm();

  const handleSubmit = (values: GenerationParams) => {
    onSubmit(values);
  };

  return (
    <Card title="Create Video" bordered={false}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={defaultGenerationParams}
      >
        <Form.Item
          label="Prompt"
          name="prompt"
          rules={[{ required: true, message: 'Please enter a prompt' }]}
        >
          <TextArea
            rows={4}
            placeholder="Describe your video..."
          />
        </Form.Item>

        <Form.Item label="Orientation" name="orientation">
          <Radio.Group>
            <Radio.Button value="landscape">Landscape</Radio.Button>
            <Radio.Button value="portrait">Portrait</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Space size="large">
          <Form.Item label="Size" name="size">
            <Select style={{ width: 120 }}>
              <Select.Option value="small">Small</Select.Option>
              <Select.Option value="large">Large</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Duration" name="duration">
            <Select options={DURATION_OPTIONS} style={{ width: 120 }} />
          </Form.Item>
        </Space>

        <Form.Item>
          <Space>
            <Form.Item name="watermark" valuePropName="checked" noStyle>
              <Checkbox>Include Watermark</Checkbox>
            </Form.Item>
            
            <Form.Item name="private" valuePropName="checked" noStyle>
              <Checkbox>Private Generation</Checkbox>
            </Form.Item>
          </Space>
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" size="large" block>
            Start Generation
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
```

**Step 2: Run tests**

```bash
npm test
```

Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/features/video-generation/GenerationForm.tsx
git commit -m "feat: rewrite GenerationForm with Ant Design components"
```

---

## Task 6: Create Video Preview Component

**Files:**
- Create: `src/features/video/VideoPreview.tsx`
- Create: `src/features/video/video-download.ts`
- Create: `tests/unit/video-preview.test.tsx`

**Step 1: Write failing test**

Create `tests/unit/video-preview.test.tsx`:
```typescript
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

  test('shows download progress', async () => {
    vi.mocked(videoDownload.downloadVideo).mockImplementation(async (url, taskId, onProgress) => {
      onProgress?.(50);
    });
    
    render(<VideoPreview videoUrl={mockVideoUrl} taskId="task-123" />);
    
    const downloadBtn = screen.getByText('Download Video');
    fireEvent.click(downloadBtn);
    
    await waitFor(() => {
      expect(screen.getByText('Downloading... 50%')).toBeInTheDocument();
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/unit/video-preview.test.tsx
```

Expected: FAIL

**Step 3: Create video download utility**

Create `src/features/video/video-download.ts`:
```typescript
import { isTauri } from '@tauri-apps/api/core';

export async function downloadVideo(
  videoUrl: string,
  taskId: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  if (isTauri()) {
    await downloadViaTauri(videoUrl, taskId, onProgress);
  } else {
    await downloadViaBrowser(videoUrl, taskId);
  }
}

async function downloadViaTauri(
  videoUrl: string,
  taskId: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  const { download } = await import('@tauri-apps/plugin-upload');
  const { downloadDir, join } = await import('@tauri-apps/api/path');
  
  const downloadsPath = await downloadDir();
  const fileName = `video-${taskId}.mp4`;
  const filePath = await join(downloadsPath, fileName);
  
  await download(videoUrl, filePath, (progress) => {
    const percent = Math.round((progress.progressTotal / progress.total) * 100);
    onProgress?.(percent);
  });
}

async function downloadViaBrowser(videoUrl: string, taskId: string): Promise<void> {
  const response = await fetch(videoUrl);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `video-${taskId}.mp4`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
}
```

**Step 4: Create VideoPreview component**

Create `src/features/video/VideoPreview.tsx`:
```typescript
import React, { useState } from 'react';
import { Card, Button, Space, Progress, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { downloadVideo } from './video-download';

interface VideoPreviewProps {
  videoUrl: string;
  taskId: string;
}

export function VideoPreview({ videoUrl, taskId }: VideoPreviewProps) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDownload = async () => {
    setDownloading(true);
    setProgress(0);
    
    try {
      await downloadVideo(videoUrl, taskId, (percent) => {
        setProgress(percent);
      });
      message.success('Video downloaded successfully');
    } catch (err) {
      message.error('Failed to download video');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card title="Generated Video" bordered={false}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <video
          data-testid="video-player"
          src={videoUrl}
          controls
          style={{ width: '100%', borderRadius: 8 }}
        />
        
        {downloading && (
          <Progress percent={progress} status="active" />
        )}
        
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleDownload}
          loading={downloading}
          block
          size="large"
        >
          {downloading ? `Downloading... ${progress}%` : 'Download Video'}
        </Button>
      </Space>
    </Card>
  );
}
```

**Step 5: Run tests**

```bash
npm test -- tests/unit/video-preview.test.tsx
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/features/video/ tests/unit/video-preview.test.tsx
git commit -m "feat: add VideoPreview component with download functionality"
```

---

## Task 7: Update GenerateWorkspace with Ant Design Layout

**Files:**
- Modify: `src/features/workspace/GenerateWorkspace.tsx`

**Step 1: Rewrite with Ant Design**

Replace `src/features/workspace/GenerateWorkspace.tsx`:
```typescript
import { Row, Col, Alert, Typography, Tabs, List, Tag, Card } from 'antd';
import { SettingsForm } from '../config/SettingsForm';
import { AppSettings } from '../config/settings-types';
import { GenerationForm } from '../video-generation/GenerationForm';
import { GenerationParams } from '../video-generation/generation-schema';
import { UseGenerationJobResult } from '../video-generation/useGenerationJob';
import { ImagePicker } from '../uploads/ImagePicker';
import { ImagePreview } from '../uploads/image-preview';
import { RecentJob } from './recent-job-types';
import { VideoPreview } from '../video/VideoPreview';

const { Title, Text } = Typography;

export interface GenerateWorkspaceProps {
  currentTaskId: string | null;
  generationJob: UseGenerationJobResult;
  onImagesSelected: (images: ImagePreview[]) => void;
  onSettingsSaved: (settings: AppSettings) => void;
  onSubmit: (params: GenerationParams) => Promise<void>;
  recentJobs: RecentJob[];
  selectedImages: ImagePreview[];
  submissionError: string | null;
}

export function GenerateWorkspace({
  currentTaskId,
  generationJob,
  onImagesSelected,
  onSettingsSaved,
  onSubmit,
  recentJobs,
  selectedImages,
  submissionError
}: GenerateWorkspaceProps) {
  const hasResult = Boolean(currentTaskId || generationJob.videoUrl || generationJob.error);

  const items = [
    {
      key: 'create',
      label: 'Create Video',
      children: (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={14}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Card title="Reference Images">
                <ImagePicker
                  selectedImages={selectedImages}
                  onImagesSelected={onImagesSelected}
                />
              </Card>
              
              <GenerationForm onSubmit={onSubmit} />
            </Space>
          </Col>
          
          <Col xs={24} lg={10}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {submissionError && (
                <Alert message={submissionError} type="error" showIcon />
              )}
              
              <Card title="Live Output" extra={<Tag color="blue">Live Status</Tag>}>
                {hasResult ? (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {currentTaskId && (
                      <div>
                        <Text type="secondary">Task ID</Text>
                        <div><Text strong>{currentTaskId}</Text></div>
                      </div>
                    )}
                    
                    <div>
                      <Text type="secondary">Status</Text>
                      <div><Text strong>{generationJob.status ?? generationJob.state}</Text></div>
                    </div>
                    
                    {generationJob.error && (
                      <Alert message={generationJob.error} type="error" />
                    )}
                    
                    {generationJob.videoUrl && (
                      <VideoPreview videoUrl={generationJob.videoUrl} taskId={currentTaskId!} />
                    )}
                  </Space>
                ) : (
                  <Alert
                    message="No active generation yet"
                    description="Start a run to see live task status, failures, and the finished video here."
                    type="info"
                  />
                )}
              </Card>
              
              <SettingsForm onSettingsSaved={onSettingsSaved} />
              
              <Card title="Session History" extra={<Tag color="purple">Session Log</Tag>}>
                {recentJobs.length > 0 ? (
                  <List
                    dataSource={recentJobs}
                    renderItem={(job) => (
                      <List.Item>
                        <List.Item.Meta
                          title={job.taskId}
                          description={job.prompt}
                        />
                        <div>
                          <Tag>{job.model}</Tag>
                          <Tag color={job.status === 'completed' ? 'success' : 'default'}>
                            {job.status}
                          </Tag>
                        </div>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Text type="secondary">Recent jobs will appear here after you start a generation.</Text>
                )}
              </Card>
            </Space>
          </Col>
        </Row>
      )
    }
  ];

  return (
    <div>
      <Title level={2}>Generate</Title>
      <Text type="secondary">
        Start with a prompt and reference images, then monitor generation progress and open the final video when it completes.
      </Text>
      
      <Tabs items={items} style={{ marginTop: 24 }} />
    </div>
  );
}
```

**Step 2: Run all tests**

```bash
npm test
```

Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/features/workspace/GenerateWorkspace.tsx
git commit -m "feat: rewrite GenerateWorkspace with Ant Design layout"
```

---

## Task 8: Update App.tsx with Ant Design

**Files:**
- Modify: `src/app/App.tsx`

**Step 1: Rewrite with Ant Design**

Replace `src/app/App.tsx`:
```typescript
import React, { useState } from 'react';
import { Layout, Tabs, Typography, Badge, Card, Row, Col } from 'antd';
import { settingsStore } from '../features/config/settings-store';
import { AppSettings } from '../features/config/settings-types';
import { GenerateWorkspace } from '../features/workspace/GenerateWorkspace';
import { IterateWorkspace } from '../features/workspace/IterateWorkspace';
import { RecentJob } from '../features/workspace/recent-job-types';
import { StoryboardWorkspace } from '../features/workspace/StoryboardWorkspace';
import { GenerationParams } from '../features/video-generation/generation-schema';
import { createLinxiVideo } from '../features/video-generation/linxi-create-client';
import { useGenerationJob } from '../features/video-generation/useGenerationJob';
import { ImagePreview } from '../features/uploads/image-preview';
import { uploadImages } from '../features/uploads/upload-client';
import { resizeImageToVideoDimensions, getTargetDimensions } from '../features/uploads/image-preprocess';
import { WorkspaceMode } from './workspace-types';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const PNG_CM_TOKEN = '1c17b11693cb5ec63859b091c5b9c1b2';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<WorkspaceMode>('generate');
  const [selectedImages, setSelectedImages] = useState<ImagePreview[]>([]);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [settings, setSettings] = useState<AppSettings>(() => settingsStore.load());

  const generationJob = useGenerationJob({
    taskId: currentTaskId,
    apiKey: settings.apiKey,
    pollingInterval: 1000,
    timeoutMs: 120000
  });

  const handleSettingsSaved = (nextSettings: AppSettings) => {
    setSettings(nextSettings);
  };

  const handleGenerationSubmit = async (params: GenerationParams) => {
    if (selectedImages.length === 0) {
      setSubmissionError('Select at least one image before generating.');
      return;
    }

    setSubmissionError(null);

    // Preprocess images to video dimensions
    const targetDims = getTargetDimensions(settings.model, params.orientation);
    
    const processedImages = await Promise.all(
      selectedImages.map(async (image) => {
        if (image.file) {
          return {
            ...image,
            file: await resizeImageToVideoDimensions(image.file, targetDims)
          };
        }
        return image;
      })
    );

    const uploadedImages = await uploadImages({
      images: processedImages.map((image) => ({
        path: image.path,
        name: image.name,
        file: image.file
      })),
      endpoint: settings.uploadEndpoint,
      token: PNG_CM_TOKEN
    });

    const linxiTask = await createLinxiVideo({
      images: uploadedImages.map((image) => image.publicUrl),
      generationParams: params,
      apiKey: settings.apiKey,
      model: settings.model
    });

    setCurrentTaskId(linxiTask.taskId);
    setRecentJobs((previousJobs) => [
      {
        taskId: linxiTask.taskId,
        prompt: params.prompt,
        model: settings.model,
        status: linxiTask.status,
        createdAt: Date.now()
      },
      ...previousJobs.filter((job) => job.taskId !== linxiTask.taskId)
    ]);
  };

  const tabItems = [
    {
      key: 'generate',
      label: (
        <Badge count="Live" style={{ backgroundColor: '#52c41a' }}>
          <span style={{ paddingRight: 16 }}>Generate</span>
        </Badge>
      ),
      children: (
        <GenerateWorkspace
          currentTaskId={currentTaskId}
          generationJob={generationJob}
          onImagesSelected={setSelectedImages}
          onSettingsSaved={handleSettingsSaved}
          onSubmit={handleGenerationSubmit}
          recentJobs={recentJobs}
          selectedImages={selectedImages}
          submissionError={submissionError}
        />
      )
    },
    {
      key: 'iterate',
      label: 'Iterate',
      children: <IterateWorkspace recentJobs={recentJobs} apiKey={settings.apiKey} />
    },
    {
      key: 'storyboard',
      label: 'Storyboard',
      children: <StoryboardWorkspace apiKey={settings.apiKey} model={settings.model} />
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px' }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={3} style={{ margin: 0 }}>Sora Desktop</Title>
            <Text type="secondary">Generate-first Linxi Video Studio</Text>
          </Col>
          <Col>
            <Row gutter={16}>
              <Col>
                <Card size="small">
                  <Text type="secondary">Generate</Text>
                  <div><Badge status="success" text="Live" /></div>
                </Card>
              </Col>
              <Col>
                <Card size="small">
                  <Text type="secondary">Iterate</Text>
                  <div><Badge status="processing" text="Preview" /></div>
                </Card>
              </Col>
              <Col>
                <Card size="small">
                  <Text type="secondary">Storyboard</Text>
                  <div><Badge status="default" text="Preview" /></div>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </Header>
      
      <Content style={{ padding: 24 }}>
        <Tabs
          activeKey={activeMode}
          onChange={(key) => setActiveMode(key as WorkspaceMode)}
          items={tabItems}
        />
      </Content>
    </Layout>
  );
};

export default App;
```

**Step 2: Run all tests**

```bash
npm test
```

Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/app/App.tsx
git commit -m "feat: rewrite App with Ant Design Layout"
```

---

## Task 9: Add Tauri Upload Plugin Dependency

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/main.rs`
- Modify: `package.json`

**Step 1: Add npm dependency**

```bash
npm install @tauri-apps/plugin-upload
```

**Step 2: Update Cargo.toml**

Add to `src-tauri/Cargo.toml`:
```toml
[dependencies]
tauri-plugin-upload = "2"
```

**Step 3: Update main.rs**

Modify `src-tauri/src/main.rs`:
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_upload::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 4: Build to verify**

```bash
npm run build
```

Expected: Build succeeds

**Step 5: Commit**

```bash
git add package.json package-lock.json src-tauri/Cargo.toml src-tauri/src/main.rs
git commit -m "deps: add tauri-plugin-upload for video downloads"
```

---

## Task 10: Package as macOS App

**Files:**
- Modify: `src-tauri/tauri.conf.json`

**Step 1: Update Tauri config for macOS**

Modify `src-tauri/tauri.conf.json`:
```json
{
  "productName": "Sora Desktop",
  "version": "1.0.0",
  "identifier": "com.linxi.sora-desktop",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Sora Desktop",
        "width": 1400,
        "height": 900,
        "minWidth": 1200,
        "minHeight": 800
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": ["app", "dmg"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "macOS": {
      "entitlements": null,
      "exceptionDomain": "",
      "frameworks": [],
      "providerShortName": null,
      "signingIdentity": null,
      "minimumSystemVersion": "10.13"
    }
  }
}
```

**Step 2: Update build script**

Modify `scripts/build-macos-app.sh`:
```bash
#!/bin/bash
set -e

echo "Building Sora Desktop for macOS..."

# Build frontend
npm run build

# Build Tauri app for macOS
cd src-tauri
cargo build --release --target universal-apple-darwin

echo "Build complete!"
echo "App bundle location: src-tauri/target/universal-apple-darwin/release/bundle/macos/Sora Desktop.app"
echo "DMG location: src-tauri/target/universal-apple-darwin/release/bundle/dmg/"
```

**Step 3: Test the build**

```bash
chmod +x scripts/build-macos-app.sh
npm run build:macos
```

Expected: Build completes successfully (on macOS)

**Step 4: Commit**

```bash
git add src-tauri/tauri.conf.json scripts/build-macos-app.sh
git commit -m "build: configure macOS app packaging"
```

---

## Final Verification

Run all tests one final time:

```bash
npm test
npm run build
```

Both should pass.

## Summary of Changes

| Component | Before | After |
|-----------|--------|-------|
| UI Framework | Custom CSS | Ant Design |
| Settings Form | Manual inputs | API-driven model dropdown |
| Generation Form | Basic HTML | Ant Design forms |
| Image Processing | None | Canvas-based resize |
| Video Preview | Link only | HTML5 player with download |
| Workspace Layout | Custom grid | Ant Design Layout |
| macOS Packaging | Basic | Universal binary + DMG |

**Total Tasks:** 10
**Estimated Time:** 4-6 hours
**Key Dependencies Added:** antd, @tauri-apps/plugin-upload
