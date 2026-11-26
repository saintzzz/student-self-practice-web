import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface LoopingVideoProps {
  /** /videos/<clip>.mp4 - missing file -> hides itself, callers keep
   *  their image fallback underneath (zero-regression contract). */
  src: string;
  /** Webp still shown instantly while the mp4 loads (and if it fails). */
  poster: string;
  /** false = one-shot moment clip (evolve/reveal): plays once and holds
   *  the last frame. Looping ambience clips auto-stop after
   *  MAX_AMBIENT_MS - WCAG 2.2.2 requires motion to end on surfaces
   *  that cannot host a user pause control (aria-hidden layers). */
  loop?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Ambient loops settle on the last frame after a minute. */
const MAX_AMBIENT_MS = 60_000;

/** Save-Data clients keep the still art - each hero clip is ~3MB. */
function saveDataOn(): boolean {
  const conn = (navigator as { connection?: { saveData?: boolean } }).connection;
  return conn?.saveData === true;
}

/**
 * CR-150: generated ambient video layer (Veo via Google Flow). Rendered
 * as a muted overlay on top of the existing still art - the poster +
 * the underlying <img> remain the graceful-degradation path for missing
 * clips, slow networks, and reduced-data clients.
 * Motion policy (ADR-1): prefers-reduced-motion or Save-Data -> video
 * never mounts, the still is the mechanism. Playback also pauses while
 * the tab is hidden or the clip is scrolled offscreen, and ambient
 * loops self-stop after MAX_AMBIENT_MS so no visible surface carries
 * indefinite motion without a pause control.
 */
export default function LoopingVideo({
  src,
  poster,
  loop = true,
  className,
  style,
}: LoopingVideoProps) {
  const reducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hidden = reducedMotion || saveDataOn() || failedSrc === src;

  useEffect(() => {
    const video = ref.current;
    if (!video || hidden) return;
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
    const stop = loop ? setTimeout(() => video.pause(), MAX_AMBIENT_MS) : null;
    syncPlay();
    return () => {
      io?.disconnect();
      document.removeEventListener('visibilitychange', syncPlay);
      if (stop) clearTimeout(stop);
    };
  }, [src, hidden, loop]);

  if (hidden) return null;
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop={loop}
      playsInline
      preload="metadata"
      aria-hidden="true"
      onError={() => setFailedSrc(src)}
      className={className}
      style={style}
    />
  );
}
