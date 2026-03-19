/**
 * Async image loading hook with status tracking.
 *
 * Takes an image URL, loads it into an HTMLImageElement, and returns
 * the loading state. Handles cleanup on unmount and URL changes
 * (cancels previous load, starts new one).
 */

import { useEffect, useRef, useState } from "react";
import type { ImageLoadState } from "../types/image-compare";

const INITIAL_STATE: ImageLoadState = {
  image: null,
  loading: false,
  error: null,
  width: 0,
  height: 0,
};

export function useImageLoader(src: string | undefined): ImageLoadState {
  const [state, setState] = useState<ImageLoadState>(INITIAL_STATE);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!src) {
      setState(INITIAL_STATE);
      return;
    }

    const currentId = ++requestIdRef.current;
    setState({ image: null, loading: true, error: null, width: 0, height: 0 });

    const img = document.createElement("img");
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (requestIdRef.current !== currentId) return;
      setState({
        image: img,
        loading: false,
        error: null,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      if (requestIdRef.current !== currentId) return;
      setState({
        image: null,
        loading: false,
        error: `Failed to load image: ${src}`,
        width: 0,
        height: 0,
      });
    };

    img.src = src;

    return () => {
      // Abort in-flight load on cleanup
      img.onload = null;
      img.onerror = null;
      img.src = "";
    };
  }, [src]);

  return state;
}
