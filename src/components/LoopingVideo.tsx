import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useAmbientMotionEnabled } from '../lib/engagement/ambientMotion';

interface LoopingVideoProps {
  /** /videos/<clip>.mp4 - missing file -> hides itself, callers keep
   *  their image fallback underneath (zero-regression contract). */
  src: string;
  /** Webp still shown instantly while the mp4 loads (and if it fails). */
  poster: string;
  /** false = one-shot moment clip (evolve/reveal): plays once and holds
   *  the last frame. Looping ambience clips auto-stop after
   *  MAX_AMBIENT_MS so no surface carries indefinite motion. */
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
 * Motion policy (ADR-1, WCAG 2.2.2): the accessible stop mechanisms are
 * (a) OS-level prefers-reduced-motion, (b) the persisted ambient-motion
 * toggle in Goc ba me (ea-ambient-motion), and (c) self-termination -
 * loops stop after MAX_AMBIENT_MS and one-shots hold their last frame.
 * Playback also pauses while the tab is hidden or the clip is offscreen.
 */
export default function LoopingVideo({
  src,
  poster,
  loop = true,
  className,
  style,
}: LoopingVideoProps) {
  const reducedMotion = usePrefersReducedMotion();
  const ambientOn = useAmbientMotionEnabled();
  const ref = useRef<HTMLVideoElement>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hidden = reducedMotion || !ambientOn || saveDataOn() || failedSrc === src;

  useEffect(() => {
    const video = ref.current;
    if (!video || hidden) return;
    // Latched terminal state: once the ambient budget or the clip ends,
    // nothing may resume playback (visibility/IO would otherwise restart
    // a video that already self-stopped - r255).
    let done = false;
    const finish = () => {
      done = true;
      video.pause();
    };
    const syncPlay = () => {
      if (done || video.ended) return;
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
    video.addEventListener('ended', finish);
    document.addEventListener('visibilitychange', syncPlay);
    const stop = loop ? setTimeout(finish, MAX_AMBIENT_MS) : null;
    syncPlay();
    return () => {
      io?.disconnect();
      video.removeEventListener('ended', finish);
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
