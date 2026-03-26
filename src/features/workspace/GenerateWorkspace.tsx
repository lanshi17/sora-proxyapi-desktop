import { Row, Col, Card, Tag, Space, Flex, Alert, Typography, Button } from 'antd';
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
  onOpenHistoryTask: (taskId: string) => void;
  onImagesSelected: (images: ImagePreview[]) => void;
  onSettingsSaved: (settings: AppSettings) => void;
  onSubmit: (params: GenerationParams) => Promise<void>;
  recentJobs: RecentJob[];
  selectedImages: ImagePreview[];
  submissionError: string | null;
  model: string;
}

export function GenerateWorkspace({
  currentTaskId,
  generationJob,
  onOpenHistoryTask,
  onImagesSelected,
  onSettingsSaved,
  onSubmit,
  recentJobs,
  selectedImages,
  submissionError,
  model
}: GenerateWorkspaceProps) {
  const hasResult = Boolean(currentTaskId || generationJob.videoUrl || generationJob.error);

  return (
    <div data-testid="generate-workspace">
      <Title level={2} style={{ marginBottom: 4 }}>Generate</Title>
      <Text type="secondary">
        Start with a prompt and reference images, then monitor generation progress and open the final video when it completes.
      </Text>

      {submissionError && (
        <Alert
          message={submissionError}
          type="error"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        {/* Left column — inputs */}
        <Col xs={24} lg={14}>
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Card variant="borderless" styles={{ body: { padding: 24 } }}>
              <Title level={4} style={{ marginBottom: 16 }}>Reference Images</Title>
              <ImagePicker
                selectedImages={selectedImages}
                onImagesSelected={onImagesSelected}
              />
            </Card>

            <Card variant="borderless" styles={{ body: { padding: 24 } }}>
              <Title level={4} style={{ marginBottom: 16 }}>Generation Settings</Title>
              <GenerationForm onSubmit={onSubmit} model={model} />
            </Card>
          </Space>
        </Col>

        {/* Right column — output */}
        <Col xs={24} lg={10}>
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            {/* Live Output */}
            <Card
              variant="borderless"
              styles={{ body: { padding: 24 } }}
              extra={<Tag color="blue">Live Status</Tag>}
            >
              <Title level={4} style={{ marginBottom: 16 }}>Live Output</Title>

              {hasResult || submissionError ? (
                <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                  {currentTaskId && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Task ID</Text>
                      <div><Text strong style={{ fontSize: 13, wordBreak: 'break-all' }}>{currentTaskId}</Text></div>
                    </div>
                  )}

                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
                    <div>
                      <Text strong style={{ fontSize: 14 }}>
                        {generationJob.status ?? generationJob.state}
                      </Text>
                      {(generationJob.status === 'processing' || generationJob.status === 'pending') && (
                        <Tag color="processing" style={{ marginLeft: 8 }}>Working…</Tag>
                      )}
                    </div>
                  </div>

                  {generationJob.error && (
                    <Alert
                      message={generationJob.error}
                      description="The generation task encountered an error. Check your API key, quota, and network connection."
                      type="error"
                      showIcon
                    />
                  )}

                  {generationJob.videoUrl && (
                    <VideoPreview
                      videoUrl={generationJob.videoUrl}
                      taskId={currentTaskId!}
                    />
                  )}
                </Space>
              ) : (
                <Alert
                  message="No active generation"
                  description="Start a run to see live task status, failures, and the finished video here."
                  type="info"
                  showIcon
                />
              )}
            </Card>

            {/* Workspace Configuration */}
            <Card variant="borderless" styles={{ body: { padding: 24 } }}>
              <Title level={4} style={{ marginBottom: 16 }}>Workspace Configuration</Title>
              <SettingsForm onSettingsSaved={onSettingsSaved} />
            </Card>

            {/* Session History */}
            <Card
              variant="borderless"
              styles={{ body: { padding: 24 } }}
              extra={<Tag color="purple">Session</Tag>}
              data-testid="recent-jobs"
            >
              <Title level={4} style={{ marginBottom: 16 }}>Session History</Title>

              {recentJobs.length > 0 ? (
                <Flex vertical gap="middle">
                  {recentJobs.map((job: RecentJob) => (
                    <Flex
                      key={job.taskId}
                      justify="space-between"
                      align="flex-start"
                      style={{
                        paddingBottom: 12,
                        borderBottom: '1px solid #f0f0f0',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          strong
                          style={{ fontSize: 13, display: 'block' }}
                          ellipsis={{ tooltip: job.taskId }}
                        >
                          {job.taskId}
                        </Text>
                        <Text
                          type="secondary"
                          style={{ fontSize: 12 }}
                          ellipsis={{ tooltip: job.prompt }}
                        >
                          {job.prompt || '—'}
                        </Text>
                      </div>
                      <Space size={4} style={{ marginLeft: 12, flexShrink: 0 }}>
                        {job.videoUrl && (
                          <Button
                            size="small"
                            onClick={() => onOpenHistoryTask(job.taskId)}
                          >
                            Open in History
                          </Button>
                        )}
                        <Tag style={{ margin: 0 }}>{job.model}</Tag>
                        <Tag
                          color={job.status === 'completed' ? 'success' : 'default'}
                          style={{ margin: 0 }}
                        >
                          {job.status}
                        </Tag>
                      </Space>
                    </Flex>
                  ))}
                </Flex>
              ) : (
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Recent jobs in this session will appear here after you start a generation.
                </Text>
              )}
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
}
