import { useState, useEffect, useRef } from 'react';
import { queryLinxiTask } from './linxi-query-client';

export type RemixJobState = 'idle' | 'polling' | 'completed' | 'failed' | 'error' | 'timeout';

export interface UseRemixJobParams {
  taskId: string | null;
  apiKey: string;
  pollingInterval: number;
  timeoutMs?: number;
}

export interface UseRemixJobResult {
  state: RemixJobState;
  status: string | null;
  videoUrl: string | null;
  error: string | null;
}

export function useRemixJob(params: UseRemixJobParams): UseRemixJobResult {
  const { taskId, apiKey, pollingInterval, timeoutMs } = params;
  
  const [state, setState] = useState<RemixJobState>('idle');
  const [status, setStatus] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const pollingTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    requestVersionRef.current += 1;
    const currentRequestVersion = requestVersionRef.current;
    let cancelled = false;

    if (!taskId) {
      setState('idle');
      setStatus(null);
      setVideoUrl(null);
      setError(null);
      return;
    }

    startTimeRef.current = Date.now();
    setState('polling');
    setStatus(null);
    setVideoUrl(null);
    setError(null);

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
          setError('Remix timeout exceeded');
          return;
        }

        const result = await queryLinxiTask({ taskId, apiKey });

        if (isStale()) {
          return;
        }
        
        setState('polling');
        setStatus(result.status);
        
        if (result.status === 'completed') {
          setState('completed');
          setVideoUrl(result.videoUrl || null);
          return;
        }
        
        if (result.status === 'failed') {
          setState('failed');
          setError(result.error || null);
          return;
        }

        pollingTimerRef.current = window.setTimeout(poll, pollingInterval);
      } catch (err) {
        if (isStale()) {
          return;
        }
        setState('error');
        setError(err instanceof Error ? err.message : 'Unknown error');
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
    error
  };
}
