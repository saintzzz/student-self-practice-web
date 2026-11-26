import { useState, type CSSProperties } from 'react';

interface LoopingVideoProps {
  /** /videos/<clip>.mp4 - missing file -> hides itself, callers keep
   *  their image fallback underneath (zero-regression contract). */
  src: string;
  /** Webp still shown instantly while the mp4 loads (and if it fails). */
  poster: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * CR-150: generated ambient video layer (Veo via Google Flow). Rendered
 * as a muted looping overlay on top of the existing still art - the
 * poster + the underlying <img> remain the graceful-degradation path
 * for missing clips, slow networks, and reduced-data clients.
 */
export default function LoopingVideo({ src, poster, className, style }: LoopingVideoProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <video
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      onError={() => setFailed(true)}
      className={className}
      style={style}
    />
  );
}
