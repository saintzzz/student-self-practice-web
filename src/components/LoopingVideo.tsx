import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface LoopingVideoProps {
  /** /videos/<clip>.mp4 - missing file -> hides itself, callers keep
   *  their image fallback underneath (zero-regression contract). */
  src: string;
  /** Webp still shown instantly while the mp4 loads (and if it fails). */
  poster: string;
  className?: string;
  style?: CSSProperties;
}

/** Save-Data clients keep the still art - each hero clip is ~3MB. */
function saveDataOn(): boolean {
  const conn = (navigator as { connection?: { saveData?: boolean } }).connection;
  return conn?.saveData === true;
}

/**
 * CR-150: generated ambient video layer (Veo via Google Flow). Rendered
 * as a muted looping overlay on top of the existing still art - the
 * poster + the underlying <img> remain the graceful-degradation path
 * for missing clips, slow networks, and reduced-data clients.
 * Motion policy (ADR-1): prefers-reduced-motion or Save-Data -> video
 * never mounts, the still is the mechanism. Playback also pauses while
 * the tab is hidden or the clip is scrolled offscreen.
 */
export default function LoopingVideo({ src, poster, className, style }: LoopingVideoProps) {
  const reducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const syncPlay = () => {
      if (document.hidden || video.dataset.offscreen === '1') {
        video.pause();
      } else {
        video.play().catch(() => { /* autoplay blocked -> poster stays */ });
      }
    };
    const io = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver((entries) => {
          video.dataset.offscreen = entries[0]?.isIntersecting ? '' : '1';
          syncPlay();
        })
      : null;
    io?.observe(video);
    document.addEventListener('visibilitychange', syncPlay);
    syncPlay();
    return () => {
      io?.disconnect();
      document.removeEventListener('visibilitychange', syncPlay);
    };
  }, [src]);

  if (reducedMotion || saveDataOn() || failedSrc === src) return null;
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      onError={() => setFailedSrc(src)}
      className={className}
      style={style}
    />
  );
}
