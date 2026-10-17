import { lazy, Suspense, useEffect, useState } from 'react';
import { EmojiVisualErrorBoundary } from '../EmojiVisualErrorBoundary';
import { useLottieSlot } from '../fx/LottieBudget';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { MASCOT_ASSET_SOURCE } from '../../lib/mascot/assets';
import type { MascotPoseName } from '../../lib/mascot/poses';
import { MascotStaticPose } from './MascotStaticPose';

const LazyMascotLottie = lazy(() => import('./MascotLottie'));

/* CR-82 (D-09): session-scoped breakers. A player/WASM/chunk failure trips
   the runtime breaker (every mascot goes static for the session); a single
   pose's JSON failure only statics that pose. */
let runtimeBroken = false;
const failedPoses = new Set<MascotPoseName>();

/** Test-only reset (mirrors __resetInstructionAutoplay). */
export function __resetMascotRigForTests(): void {
  runtimeBroken = false;
  failedPoses.clear();
}

export interface MascotRigProps {
  mood: MascotPoseName;
  sizePx: number;
  onRendererChange?: (renderer: 'lottie' | 'static') => void;
}

/**
 * CR-82 (D-09): mounts the Lottie player only when EVERY condition holds -
 * the screen's slot grants 'mascot' (D-20), `matchMedia` exists (jsdom and
 * old webviews read as "static", GT-17), no reduced-motion preference, the
 * pose asset isn't `missing`, and no session breaker is tripped. Otherwise
 * the static SVG pose renders - identical box, no layout shift - and the
 * poster crossfades 120ms into the player on first `render` (spec s9.5).
 */
export default function MascotRig({ mood, sizePx, onRendererChange }: MascotRigProps) {
  const reducedMotion = usePrefersReducedMotion();
  const slotGranted = useLottieSlot('mascot');
  const [lottieReady, setLottieReady] = useState(false);
  const [poseFailed, setPoseFailed] = useState(false);

  const canLottie =
    slotGranted &&
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    !reducedMotion &&
    MASCOT_ASSET_SOURCE[mood] !== 'missing' &&
    !runtimeBroken &&
    !failedPoses.has(mood) &&
    !poseFailed;

  const lottieVisible = canLottie && lottieReady;
  const renderer: 'lottie' | 'static' = lottieVisible ? 'lottie' : 'static';
  useEffect(() => {
    onRendererChange?.(renderer);
  }, [renderer, onRendererChange]);

  function handleLottieError(kind: 'data' | 'runtime') {
    if (kind === 'runtime') runtimeBroken = true;
    failedPoses.add(mood);
    setPoseFailed(true);
  }

  return (
    <span className="relative block" style={{ width: sizePx, height: sizePx }}>
      {canLottie && (
        <span
          aria-hidden="true"
          className={`absolute inset-0 transition-opacity duration-[120ms] motion-reduce:transition-none ${
            lottieReady ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <EmojiVisualErrorBoundary onError={() => handleLottieError('runtime')}>
            <Suspense fallback={null}>
              <LazyMascotLottie
                pose={mood}
                onReady={() => setLottieReady(true)}
                onError={handleLottieError}
              />
            </Suspense>
          </EmojiVisualErrorBoundary>
        </span>
      )}
      {/* Poster = the static pose in the same box; fades out on first
          render rather than unmounting (no position shift, spec s9.5). */}
      <span
        aria-hidden="true"
        className={`block transition-opacity duration-[120ms] motion-reduce:transition-none ${
          lottieVisible ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <MascotStaticPose pose={mood} sizePx={sizePx} />
      </span>
    </span>
  );
}
