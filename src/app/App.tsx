import { useEffect, useState } from 'react';
import { Layout, Tabs, Typography, Badge, Card, Row, Col, App as AntApp } from 'antd';
import { settingsStore } from '../features/config/settings-store';
import { AppSettings } from '../features/config/settings-types';
import { GenerateWorkspace } from '../features/workspace/GenerateWorkspace';
import { HistoryWorkspace } from '../features/workspace/HistoryWorkspace';
import { IterateWorkspace } from '../features/workspace/IterateWorkspace';
import { RecentJob } from '../features/workspace/recent-job-types';
import { recentJobsStore } from '../features/workspace/recent-jobs-store';
import { StoryboardWorkspace } from '../features/workspace/StoryboardWorkspace';
import { GenerationParams, getDimensionsFromSize } from '../features/video-generation/generation-schema';
import { createLinxiVideoWithFiles } from '../features/video-generation/linxi-create-client';
import { useGenerationJob } from '../features/video-generation/useGenerationJob';
import { ImagePreview } from '../features/uploads/image-preview';
import { resizeImageToVideoDimensions } from '../features/uploads/image-preprocess';
import { WorkspaceMode } from './workspace-types';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<WorkspaceMode>('generate');
  const [selectedImages, setSelectedImages] = useState<ImagePreview[]>([]);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [selectedHistoryTaskId, setSelectedHistoryTaskId] = useState<string | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>(() => recentJobsStore.load());
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

  const handleOpenHistoryTask = (taskId: string) => {
    setSelectedHistoryTaskId(taskId);
    setActiveMode('history');
  };

  useEffect(() => {
    recentJobsStore.save(recentJobs);
  }, [recentJobs]);

  useEffect(() => {
    if (!currentTaskId) {
      return;
    }

    const nextStatus = generationJob.status
      ?? (generationJob.state === 'failed' || generationJob.state === 'error' || generationJob.state === 'timeout'
        ? generationJob.state
        : null);
    const hasPatch = Boolean(nextStatus || generationJob.videoUrl || generationJob.error);
    if (!hasPatch) {
      return;
    }

    setRecentJobs((previousJobs) => {
      const existingJob = previousJobs.find((job) => job.taskId === currentTaskId);
      if (!existingJob) {
        return previousJobs;
      }

      const patchedJob: RecentJob = {
        ...existingJob,
        status: nextStatus ?? existingJob.status,
        videoUrl: generationJob.videoUrl ?? existingJob.videoUrl,
        error: generationJob.error ?? existingJob.error ?? null,
        updatedAt: Date.now()
      };

      const changed = patchedJob.status !== existingJob.status
        || patchedJob.videoUrl !== existingJob.videoUrl
        || patchedJob.error !== existingJob.error;

      if (!changed) {
        return previousJobs;
      }

      return [
        patchedJob,
        ...previousJobs.filter((job) => job.taskId !== currentTaskId)
      ];
    });
  }, [currentTaskId, generationJob.state, generationJob.status, generationJob.videoUrl, generationJob.error]);

  const handleGenerationSubmit = async (params: GenerationParams) => {
    if (selectedImages.length === 0) {
      setSubmissionError('Select at least one image before generating.');
      return;
    }

    setSubmissionError(null);

    try {
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

      const linxiTask = await createLinxiVideoWithFiles({
        files: processedImages.map((image) => (
          image.file
            ? image.file
            : { path: image.path, name: image.name }
        )),
        generationParams: params,
        apiKey: settings.apiKey,
        model: settings.model
      });

      setCurrentTaskId(linxiTask.taskId);
      setRecentJobs((previousJobs) => {
        const existingJob = previousJobs.find((job) => job.taskId === linxiTask.taskId);
        const now = Date.now();

        return [
          {
            taskId: linxiTask.taskId,
            prompt: params.prompt,
            model: settings.model,
            status: linxiTask.status,
            createdAt: existingJob?.createdAt ?? now,
            updatedAt: now,
            videoUrl: existingJob?.videoUrl ?? null,
            error: existingJob?.error ?? null
          },
          ...previousJobs.filter((job) => job.taskId !== linxiTask.taskId)
        ];
      });
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Failed to start generation.');
    }
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
          onOpenHistoryTask={handleOpenHistoryTask}
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
    },
    {
      key: 'history',
      label: 'History',
      children: (
        <HistoryWorkspace
          recentJobs={recentJobs}
          selectedTaskId={selectedHistoryTaskId}
        />
      )
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
