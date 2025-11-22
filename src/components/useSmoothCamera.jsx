// useSmoothCamera.js
import { useRef, useEffect } from 'react';

export function useSmoothCamera(rawCameraRef, lerpSpeed = 8) {
  const smooth = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let raf;
    const tick = () => {
      const dt = 0.016; // or proper timestamp version
      const alpha = 1 - Math.exp(-lerpSpeed * dt);
      smooth.current.x += (rawCameraRef.current.x - smooth.current.x) * alpha;
      smooth.current.y += (rawCameraRef.current.y - smooth.current.y) * alpha;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [rawCameraRef, lerpSpeed]);

  return smooth.current;
}