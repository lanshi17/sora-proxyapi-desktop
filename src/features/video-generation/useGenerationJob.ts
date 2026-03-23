import { useState, useEffect, useRef } from 'react';
import { queryLinxiTask } from './linxi-query-client';

export type JobState = 'idle' | 'polling' | 'completed' | 'failed' | 'error' | 'timeout';

export interface UseGenerationJobParams {
  taskId: string | null;
  apiKey: string;
  pollingInterval: number;
  timeoutMs?: number;
}

export interface UseGenerationJobResult {
  state: JobState;
  status: string | null;
  videoUrl: string | null;
  error: string | null;
  progress?: number;
}

export function useGenerationJob(params: UseGenerationJobParams): UseGenerationJobResult {
  const { taskId, apiKey, pollingInterval, timeoutMs } = params;
  
  const [state, setState] = useState<JobState>('idle');
  const [status, setStatus] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | undefined>(undefined);
  
  const pollingTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const requestVersionRef = useRef(0);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    requestVersionRef.current += 1;
    const currentRequestVersion = requestVersionRef.current;
    let cancelled = false;

    if (!taskId) {
      setState('idle');
      setStatus(null);
      setVideoUrl(null);
      setError(null);
      setProgress(undefined);
      return;
    }

    startTimeRef.current = Date.now();
    setState('polling');
    setStatus(null);
    setVideoUrl(null);
    setError(null);
    setProgress(undefined);

    const isStale = () => cancelled || currentRequestVersion !== requestVersionRef.current;

    const poll = async () => {
      try {
        if (isStale()) {
          return;
        }

        if (timeoutMs && startTimeRef.current && Date.now() - startTimeRef.current > timeoutMs) {
          if (isStale()) {
            return;
          }
          setState('timeout');
          setError('Generation timeout exceeded');
          return;
        }

        const result = await queryLinxiTask({ taskId, apiKey });

        if (isStale()) {
          return;
        }
        
        setState('polling');
        setStatus(result.status);
        setProgress(result.progress);
        
        if (result.status === 'completed') {
          setState('completed');
          setVideoUrl(result.videoUrl);
          return;
        }
        
        if (result.status === 'failed') {
          setState('failed');
          setError(result.error || 'Video generation failed');
          return;
        }

        pollingTimerRef.current = window.setTimeout(poll, pollingInterval);
      } catch (err) {
        if (isStale()) {
          return;
        }
        
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        const isNetworkError = errorMessage.includes('ERR_NETWORK_CHANGED') || 
                               errorMessage.includes('ERR_INTERNET_DISCONNECTED') ||
                               errorMessage.includes('fetch failed') ||
                               errorMessage.includes('Failed to fetch');
        
        if (isNetworkError && retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          console.log(`Network error, retrying... (${retryCountRef.current}/${MAX_RETRIES})`);
          pollingTimerRef.current = window.setTimeout(poll, pollingInterval * retryCountRef.current);
          return;
        }
        
        setState('error');
        setError(errorMessage);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (pollingTimerRef.current !== null) {
        clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [taskId, apiKey, pollingInterval, timeoutMs]);

  return {
    state,
    status,
    videoUrl,
    error,
    progress
  };
}
