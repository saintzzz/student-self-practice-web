import { useState } from 'react';
import { useViewer } from '../lib/viewer/ViewerContext';
import type { MascotPoseName } from '../lib/mascot/poses';
import MascotRig from './mascot/MascotRig';
import { MascotStaticPose } from './mascot/MascotStaticPose';

/** CR-82 (spec s9.2): the pose set is the public mood API. */
export type MascotMood = MascotPoseName;

interface MascotProps {
  mood: MascotMood;
  /** 'inline' = 32px static-only pose for tight-vertical-space contexts
   *  (FeedbackPanel headline at max-height:420px); 'companion' = the
   *  board/sheet perch size (72px G1-2 / 56px G3-5); 'block' = hero
   *  screens (96px G1-2 / 80px G3-5). Spec s9.2 size table. */
  size?: 'inline' | 'block' | 'companion';
}

/** Vietnamese accessible names (spec s9.2 aria-label column). */
const ARIA_LABEL: Record<MascotMood, string> = {
  idle: 'Heo con đang chờ em',
  thinking: 'Heo con đang suy nghĩ',
  greeting: 'Heo con vẫy chào',
  happy: 'Heo con vui mừng',
  encouraging: 'Heo con động viên',
  celebrating: 'Heo con ăn mừng',
};

/**
 * App-wide pig mascot (plan.md v10 AC38-AC39; CR-72 art pass; CR-82 M4).
 *
 * Call sites keep the `mood`/`size` contract; internals are now the shared
 * pose rig (D-08): `MascotRig` crossfades a static SVG poster into the
 * pose's generated Lottie asset when D-09's mount conditions hold, and
 * `size="inline"` is always the static SVG pose (spec s9.5 - a 32px
 * Lottie adds runtime cost with no visible benefit).
 *
 * The wrapper is identical for both renderers: `role="img"` + the pose's
 * Vietnamese aria-label, `data-mascot-mood` for tests, and
 * `data-mascot-renderer="lottie|static"` for Playwright visual checks.
 * Exactly one `data-testid="mascot"` node per screen state (spec s9.3).
 */
export default function Mascot({ mood, size = 'block' }: MascotProps) {
  const { band } = useViewer();
  const [renderer, setRenderer] = useState<'lottie' | 'static'>('static');

  const sizePx =
    size === 'inline' ? 32 : size === 'companion' ? (band === 'G12' ? 72 : 56) : band === 'G12' ? 96 : 80;
  const staticOnly = size === 'inline';

  return (
    <span
      data-testid="mascot"
      data-mascot-mood={mood}
      data-mascot-renderer={staticOnly ? 'static' : renderer}
      role="img"
      aria-label={ARIA_LABEL[mood]}
      className="relative inline-flex items-center leading-none"
    >
      {/* CR-12 DS-X4: hero-size mascots keep the soft radial halo. */}
      {size === 'block' && (
        <span
          aria-hidden="true"
          className="absolute -inset-4 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.15),rgba(255,255,255,0))]"
        />
      )}
      {staticOnly ? (
        <MascotStaticPose pose={mood} sizePx={sizePx} />
      ) : (
        <MascotRig mood={mood} sizePx={sizePx} onRendererChange={setRenderer} />
      )}
    </span>
  );
}
