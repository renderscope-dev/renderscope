'use client';

import { useEffect, useRef, useState } from 'react';
import { loadImageData } from '@/lib/image-processing';

export interface ImageLoadState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  referenceData: ImageData | null;
  testData: ImageData | null;
  width: number;
  height: number;
  error: string | null;
}

const INITIAL_STATE: ImageLoadState = {
  status: 'idle',
  referenceData: null,
  testData: null,
  width: 0,
  height: 0,
  error: null,
};

/**
 * Loads two images in parallel, extracts their pixel data, and validates
 * that they share the same dimensions. Handles stale requests when URLs
 * change while a previous load is still in flight.
 */
export function useImageLoader(
  referenceUrl: string | undefined,
  testUrl: string | undefined,
): ImageLoadState {
  const [state, setState] = useState<ImageLoadState>(INITIAL_STATE);

  // Monotonically increasing request counter to discard stale results.
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!referenceUrl || !testUrl) {
      setState(INITIAL_STATE);
      return;
    }

    const currentId = ++requestIdRef.current;
    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    Promise.all([loadImageData(referenceUrl), loadImageData(testUrl)])
      .then(([ref, test]) => {
        // Discard if a newer request has been issued.
        if (requestIdRef.current !== currentId) return;

        if (ref.width !== test.width || ref.height !== test.height) {
          setState({
            status: 'error',
            referenceData: null,
            testData: null,
            width: 0,
            height: 0,
            error: `Images must be the same size (reference: ${ref.width}×${ref.height}, test: ${test.width}×${test.height})`,
          });
          return;
        }

        setState({
          status: 'ready',
          referenceData: ref.data,
          testData: test.data,
          width: ref.width,
          height: ref.height,
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (requestIdRef.current !== currentId) return;

        const message =
          err instanceof Error ? err.message : 'Failed to load images';
        setState({
          status: 'error',
          referenceData: null,
          testData: null,
          width: 0,
          height: 0,
          error: message,
        });
      });
  }, [referenceUrl, testUrl]);

  return state;
}
