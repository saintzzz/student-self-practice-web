import { useState } from 'react';
import type { MascotPoseName } from '../../lib/mascot/poses';
import { MascotStaticPose } from './MascotStaticPose';

/**
 * Bé Heo mood art - the ChatGPT-generated pose set that replaces the
 * flat SVG/Lottie pig everywhere the old rig rendered. One character,
 * one identity: the same piglet as `be-heo-portrait` (shared prompt).
 *
 * Motion stays a real feedback channel: each mood carries a transform-only
 * CSS animation (bob/rock/wave/bounce/nod/hop) instead of a Lottie
 * player - cheaper than the WASM rig, and `prefers-reduced-motion`
 * still lands on the static art (never the flat pig).
 *
 * `sizePx <= 32` renders the head-only face art: a full-body pose is
 * illegible at inline size. A missing/unbuilt webp falls back to
 * MascotStaticPose so the slot can never render broken.
 */

const MOOD_ART: Record<MascotPoseName, string> = {
  idle: 'be-heo-idle',
  thinking: 'be-heo-thinking',
  greeting: 'be-heo-portrait',
  happy: 'be-heo-happy',
  celebrating: 'be-heo-celebrating',
  encouraging: 'be-heo-encouraging',
};

const MOOD_MOTION: Record<MascotPoseName, string> = {
  idle: 'mascot-idle',
  thinking: 'mascot-rock',
  greeting: 'mascot-wave',
  happy: 'mascot-bounce',
  encouraging: 'mascot-nod',
  celebrating: 'mascot-hop',
};

export function MascotArt({ mood, sizePx }: { mood: MascotPoseName; sizePx: number }) {
  /* Failure is tracked PER ASSET, not per mount - a mood or size change
     resolves to a different file and must retry instead of inheriting
     the previous asset's 404 (same class as the r80 PetImg fix). */
  const [failedFile, setFailedFile] = useState<string | null>(null);
  const file = sizePx <= 32 ? 'be-heo-face' : MOOD_ART[mood];
  if (failedFile === file) return <MascotStaticPose pose={mood} sizePx={sizePx} />;
  /* The generated art ships on white - at inline size the head art
     reads fine bare; larger poses get a mini exhibit-paper frame so the
     pose reads as a postcard pinned to the surface, not a white box. */
  const framed = sizePx > 32;
  return (
    <img
      key={file}
      src={`/images/mascot/${file}.webp`}
      alt=""
      aria-hidden="true"
      width={sizePx}
      height={sizePx}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailedFile(file)}
      className={`select-none object-contain ${MOOD_MOTION[mood]} ${
        framed ? 'rounded-xl bg-amber-50 p-0.5 ring-1 ring-amber-200/70 shadow-md' : ''
      }`}
      style={{ width: sizePx, height: sizePx }}
    />
  );
}
