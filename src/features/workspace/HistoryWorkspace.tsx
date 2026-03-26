import { useEffect, useMemo, useState } from 'react';
import { Card, Col, Empty, Row, Tag, Typography } from 'antd';
import { VideoPreview } from '../video/VideoPreview';
import { RecentJob } from './recent-job-types';

const { Title, Text } = Typography;

export interface HistoryWorkspaceProps {
  recentJobs: RecentJob[];
  selectedTaskId?: string | null;
}

export function HistoryWorkspace({ recentJobs, selectedTaskId: initialSelectedTaskId = null }: HistoryWorkspaceProps) {
  const playableJobs = useMemo(
    () => recentJobs.filter((job) => Boolean(job.videoUrl)),
    [recentJobs]
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialSelectedTaskId);

  useEffect(() => {
    if (initialSelectedTaskId) {
      setSelectedTaskId(initialSelectedTaskId);
    }
  }, [initialSelectedTaskId]);

  useEffect(() => {
    if (playableJobs.length === 0) {
      setSelectedTaskId(null);
      return;
    }

    const selectionMissing = !selectedTaskId || !playableJobs.some((job) => job.taskId === selectedTaskId);
    if (selectionMissing) {
      setSelectedTaskId(playableJobs[0].taskId);
    }
  }, [playableJobs, selectedTaskId]);

  const selectedJob = playableJobs.find((job) => job.taskId === selectedTaskId) ?? null;

  return (
    <div data-testid="history-workspace">
      <Title level={2} style={{ marginBottom: 4 }}>History</Title>
      <Text type="secondary">
        Reopen completed videos from local history for repeated preview and download.
      </Text>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={10}>
          <Card title="Video History" variant="borderless" data-testid="history-list">
          {recentJobs.length === 0 ? (
            <Empty description="No history yet. Generate a video first." />
          ) : (
            <div>
              {recentJobs.map((job) => {
                const playable = Boolean(job.videoUrl);
                const selected = job.taskId === selectedTaskId;

                return (
                  <button
                    key={job.taskId}
                    type="button"
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 8,
                      border: selected ? '1px solid #1677ff' : '1px solid #f0f0f0',
                      background: selected ? '#f5f9ff' : '#fff',
                      cursor: playable ? 'pointer' : 'not-allowed',
                      opacity: playable ? 1 : 0.7
                    }}
                    onClick={() => {
                      if (playable) {
                        setSelectedTaskId(job.taskId);
                      }
                    }}
                    disabled={!playable}
                    data-testid={`history-item-${job.taskId}`}
                  >
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <Text strong style={{ fontSize: 13, wordBreak: 'break-all' }}>{job.taskId}</Text>
                        <Tag color={getStatusColor(job.status)} style={{ margin: 0 }}>
                          {job.status}
                        </Tag>
                      </div>

                      <Text type="secondary" style={{ display: 'block', marginTop: 6 }}>
                        {job.prompt || 'No prompt'}
                      </Text>

                      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{job.model}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {formatTimestamp(job.updatedAt)}
                        </Text>
                      </div>

                      {!playable && (
                        <Text type="warning" style={{ fontSize: 12, marginTop: 6, display: 'block' }}>
                          Video not available yet
                        </Text>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card title="Preview & Download" variant="borderless" data-testid="history-preview">
          {selectedJob?.videoUrl ? (
            <VideoPreview
              videoUrl={selectedJob.videoUrl}
              taskId={selectedJob.taskId}
            />
          ) : (
            <Empty description="Select a completed video from history." />
          )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

function getStatusColor(status: string): string {
  if (status === 'completed') {
    return 'success';
  }
  if (status === 'failed' || status === 'error' || status === 'timeout') {
    return 'error';
  }
  if (status === 'pending' || status === 'processing' || status === 'polling') {
    return 'processing';
  }
  return 'default';
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}
