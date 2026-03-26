import { useEffect, useRef, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { Button, Space, Spin, message } from 'antd';
import { AlertOutlined, CloudDownloadOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { downloadVideo } from './video-download';
import { resolveVideoSource } from './video-cache';

interface VideoPreviewProps {
  videoUrl: string;
  taskId: string;
}

type VideoState = 'playing' | 'error' | 'loading' | 'ready';
type DownloadErrorType = 'BROWSER_CORS' | 'GENERIC' | null;

export function VideoPreview({ videoUrl, taskId }: VideoPreviewProps) {
  const tauriRuntime = isTauri();
  const [downloading, setDownloading] = useState(false);
  const [videoState, setVideoState] = useState<VideoState>('loading');
  const [downloadError, setDownloadError] = useState<DownloadErrorType>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [cachedFilePath, setCachedFilePath] = useState<string | null>(null);
  const [sourceReady, setSourceReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let cancelled = false;

    setSourceReady(false);
    setVideoState('loading');
    setDownloadError(null);

    const resolveSource = async () => {
      try {
        const resolved = await resolveVideoSource({ videoUrl, taskId });

        if (cancelled) {
          return;
        }

        setSourceUrl(resolved.source);
        setCachedFilePath(resolved.cachedFilePath);
        setSourceReady(true);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSourceUrl(tauriRuntime ? '' : videoUrl);
        setCachedFilePath(null);
        setSourceReady(true);

        const messageText = error instanceof Error ? error.message : String(error);
        if (messageText.includes('CORS') || messageText.includes('fetch') || messageText.includes('net::ERR')) {
          setDownloadError('BROWSER_CORS');
        } else {
          setDownloadError('GENERIC');
        }
      }
    };

    resolveSource();

    return () => {
      cancelled = true;
    };
  }, [tauriRuntime, taskId, videoUrl]);

  const handleDownload = async () => {
    if (tauriRuntime && !cachedFilePath) {
      setDownloadError('GENERIC');
      return;
    }

    setDownloading(true);
    setDownloadError(null);

    try {
      await downloadVideo(cachedFilePath ?? videoUrl, taskId);
      message.success('Video saved to disk');
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);

      if (error.includes('CORS') || error.includes('fetch') || error.includes('net::ERR')) {
        setDownloadError('BROWSER_CORS');
      } else if (error.includes('user aborted') || error.includes('cancelled')) {
        setDownloadError(null);
        setDownloading(false);
        return;
      } else {
        setDownloadError('GENERIC');
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      data-testid="video-preview"
      style={{
        background: '#0f0f0f',
        borderRadius: 12,
        overflow: 'hidden'
      }}
    >
      <div style={{ position: 'relative', background: '#000' }}>
        <video
          ref={videoRef}
          data-testid="video-player"
          src={sourceUrl}
          controls
          preload="metadata"
          onPlay={() => setVideoState('playing')}
          onError={() => setVideoState('error')}
          onLoadedData={() => setVideoState('ready')}
          style={{
            width: '100%',
            display: 'block',
            maxHeight: 360,
            background: '#000'
          }}
        />

        {(videoState === 'loading' || !sourceReady) && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.6)',
              pointerEvents: 'none'
            }}
          >
            <Spin size="large" />
          </div>
        )}

        {videoState === 'error' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.8)',
              gap: 12,
              padding: 24
            }}
          >
            <AlertOutlined style={{ fontSize: 32, color: '#faad14' }} />
            <p style={{ color: '#fff', textAlign: 'center', margin: 0, fontSize: 14 }}>
              Failed to load video.
              <br />
              <span style={{ color: '#aaa', fontSize: 12 }}>
                The source may be temporarily unavailable.
              </span>
            </p>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.load();
                  setVideoState('loading');
                }
              }}
            >
              Retry
            </Button>
          </div>
        )}
      </div>

      <div
        style={{
          padding: '16px 20px',
          background: '#1a1a1a',
          borderTop: '1px solid rgba(255,255,255,0.06)'
        }}
      >
        {downloadError === 'BROWSER_CORS' ? (
          <div
            style={{
              background: 'rgba(250,173,20,0.1)',
              border: '1px solid rgba(250,173,20,0.3)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 12
            }}
          >
            <p style={{ color: '#faad14', margin: 0, fontSize: 13, fontWeight: 500 }}>
              Direct download blocked by browser security (CORS)
            </p>
            <p style={{ color: '#888', margin: '4px 0 0', fontSize: 12 }}>
              Open the video in a new tab, or use the Tauri desktop app for full download support.
            </p>
          </div>
        ) : downloadError === 'GENERIC' ? (
          <div
            style={{
              background: 'rgba(255,77,79,0.1)',
              border: '1px solid rgba(255,77,79,0.3)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 12
            }}
          >
            <p style={{ color: '#ff4d4f', margin: 0, fontSize: 13, fontWeight: 500 }}>
              Download failed
            </p>
            <p style={{ color: '#888', margin: '4px 0 0', fontSize: 12 }}>
              Check your network connection and try again.
            </p>
          </div>
        ) : null}

        <Space style={{ width: '100%' }} size="middle">
          <Button
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            loading={downloading}
            size="large"
            style={{
              background: downloading ? undefined : '#e8e8e8',
              borderColor: 'transparent',
              color: downloading ? undefined : '#1a1a1a'
            }}
          >
            {downloading ? 'Saving…' : 'Save Video'}
          </Button>

          <Button
            icon={<CloudDownloadOutlined />}
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            size="large"
            style={{
              background: '#2a2a2a',
              borderColor: 'rgba(255,255,255,0.1)',
              color: '#ccc'
            }}
          >
            Open in Browser
          </Button>
        </Space>
      </div>
    </div>
  );
}
