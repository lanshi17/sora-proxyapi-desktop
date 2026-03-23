import { Row, Col, Alert, Typography, Card, Tag, Space, Flex } from 'antd';
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
  model: string;
}

export function GenerateWorkspace({
  currentTaskId,
  generationJob,
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
      <Title level={2}>Generate</Title>
      <Text type="secondary">
        Start with a prompt and reference images, then monitor generation progress and open the final video when it completes.
      </Text>

      {submissionError && (
        <Alert title={submissionError} type="error" showIcon style={{ marginTop: 16 }} />
      )}

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={14}>
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Card>
              <Title level={3}>Reference Images</Title>
              <ImagePicker
                selectedImages={selectedImages}
                onImagesSelected={onImagesSelected}
              />
            </Card>

            <Card>
              <Title level={3}>Generation Settings</Title>
              <GenerationForm onSubmit={onSubmit} model={model} />
            </Card>
          </Space>
        </Col>

        <Col xs={24} lg={10}>
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Card
              extra={<Tag color="blue">Live Status</Tag>}
            >
              <Title level={3}>Live Output</Title>
              {hasResult || submissionError ? (
                <Space orientation="vertical" style={{ width: '100%' }}>
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
                    <Alert title={generationJob.error} type="error" />
                  )}

                  {generationJob.videoUrl && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <VideoPreview videoUrl={generationJob.videoUrl} taskId={currentTaskId!} />
                      <a
                        href={generationJob.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open generated video
                      </a>
                    </div>
                  )}
                </Space>
              ) : (
                <Alert
                  title="No active generation yet"
                  description="Start a run to see live task status, failures, and the finished video here."
                  type="info"
                />
              )}
            </Card>

            <Card>
              <Title level={3}>Workspace Configuration</Title>
              <SettingsForm onSettingsSaved={onSettingsSaved} />
            </Card>

            <Card
              extra={<Tag color="purple">Session Log</Tag>}
              data-testid="recent-jobs"
            >
              <Title level={3}>Session History</Title>
              {recentJobs.length > 0 ? (
                <Flex vertical gap="small">
                  {recentJobs.map((job: RecentJob) => (
                    <Flex key={job.taskId} justify="space-between" align="center" style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{job.taskId}</div>
                        <div style={{ color: '#666', fontSize: '12px' }}>{job.prompt}</div>
                      </div>
                      <Space>
                        <Tag>{job.model}</Tag>
                        <Tag color={job.status === 'completed' ? 'success' : 'default'}>
                          {job.status}
                        </Tag>
                      </Space>
                    </Flex>
                  ))}
                </Flex>
              ) : (
                <span>Recent jobs in this session will appear here after you start a generation.</span>
              )}
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
}
