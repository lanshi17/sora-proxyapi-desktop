import { useState } from 'react';
import { Layout, Tabs, Typography, Badge, Card, Row, Col, App as AntApp } from 'antd';
import { settingsStore } from '../features/config/settings-store';
import { AppSettings } from '../features/config/settings-types';
import { GenerateWorkspace } from '../features/workspace/GenerateWorkspace';
import { IterateWorkspace } from '../features/workspace/IterateWorkspace';
import { RecentJob } from '../features/workspace/recent-job-types';
import { StoryboardWorkspace } from '../features/workspace/StoryboardWorkspace';
import { GenerationParams, getDimensionsFromSize } from '../features/video-generation/generation-schema';
import { createLinxiVideo } from '../features/video-generation/linxi-create-client';
import { useGenerationJob } from '../features/video-generation/useGenerationJob';
import { ImagePreview } from '../features/uploads/image-preview';
import { uploadImages } from '../features/uploads/upload-client';
import { resizeImageToVideoDimensions } from '../features/uploads/image-preprocess';
import { WorkspaceMode } from './workspace-types';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const PNG_CM_TOKEN = '1c17b11693cb5ec63859b091c5b9c1b2';
const UPLOAD_ENDPOINT = 'https://img.linxi.icu/api/index.php';

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
    timeoutMs: 900000
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

    const targetDims = getDimensionsFromSize(params.size);
    
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
      endpoint: UPLOAD_ENDPOINT,
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
          model={settings.model}
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
    <AntApp>
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
    </AntApp>
  );
};

export default App;
