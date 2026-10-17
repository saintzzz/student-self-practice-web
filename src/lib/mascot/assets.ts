import type { MascotPoseName } from './poses';

/**
 * CR-82 (ARCHITECTURE D-08): per-pose asset provenance. 'generated' files
 * ship from `scripts/gen-mascot-lottie.ts`; a 'commissioned' file is a
 * drop-in upgrade with the same name; 'missing' makes MascotRig skip the
 * fetch entirely (static renderer, no 404 noise) and is logged in
 * docs/MEMORY.md per spec s9.5.
 */
export const MASCOT_ASSET_SOURCE: Record<MascotPoseName, 'generated' | 'commissioned' | 'missing'> = {
  idle: 'generated',
  thinking: 'generated',
  greeting: 'generated',
  happy: 'generated',
  celebrating: 'generated',
  encouraging: 'generated',
};

/** Public URL of a pose's Lottie JSON (plain bodymovin, GT-7). */
export function mascotAssetUrl(mood: MascotPoseName): string {
  return `${import.meta.env.BASE_URL}mascot/be-heo-${mood}.json`;
}

/**
 * CR-82 (D-21, PRD AC-2.5): GradeSelect, AuthScreen and StartBatchScreen
 * render the static `greeting` pose - no Lottie player/WASM/JSON request
 * fires before the first question. Flip to `true` only after a recorded
 * human amendment of AC-2.5 (handoff H-8).
 */
export const PRE_ROUND_MASCOT_ANIMATED = false;

/** Poses preloaded on play screens (spec s9.5); the rest load on first use. */
export const MASCOT_PRELOAD_MOODS: readonly MascotPoseName[] = ['idle', 'happy', 'encouraging'];

let preloadFired = false;

/**
 * spec s9.5: warm the per-question pose set when the FIRST question
 * mounts - `cache: 'force-cache'` keeps it a single request per pose per
 * session; failures are swallowed (the rig falls back per pose anyway).
 * Never fires on pre-round screens (D-21) and never when the runtime
 * can't mount Lottie (no matchMedia, e.g. jsdom/old webviews).
 */
export function preloadMascotAssets(): void {
  if (preloadFired) return;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
  /* D-20: reduced motion means zero Lottie players - prefetching pose
     JSON would be wasted traffic, so skip it entirely. */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  preloadFired = true;
  for (const mood of MASCOT_PRELOAD_MOODS) {
    if (MASCOT_ASSET_SOURCE[mood] === 'missing') continue;
    fetch(mascotAssetUrl(mood), { cache: 'force-cache' }).catch(() => {});
  }
}
