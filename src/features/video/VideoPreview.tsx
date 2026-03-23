import { useState } from 'react';
import { Card, Button, Space, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { downloadVideo } from './video-download';

interface VideoPreviewProps {
  videoUrl: string;
  taskId: string;
}

export function VideoPreview({ videoUrl, taskId }: VideoPreviewProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    
    try {
      await downloadVideo(videoUrl, taskId);
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
        >
          <track kind="captions" />
        </video>
        
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleDownload}
          loading={downloading}
          block
          size="large"
        >
          {downloading ? 'Downloading...' : 'Download Video'}
        </Button>
      </Space>
    </Card>
  );
}
