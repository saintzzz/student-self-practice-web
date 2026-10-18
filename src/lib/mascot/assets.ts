import type { MascotPoseName } from './poses';

/**
 * CR-82 (ARCHITECTURE D-08): per-pose asset provenance. 'generated' files
 * ship from the ChatGPT artgen batch (`public/images/mascot/be-heo-*.webp`);
 * a 'commissioned' file is a drop-in upgrade with the same name; 'missing'
 * makes the rig skip the fetch entirely (static renderer, no 404 noise)
 * and is logged in docs/MEMORY.md per spec s9.5.
 */
export const MASCOT_ASSET_SOURCE: Record<MascotPoseName, 'generated' | 'commissioned' | 'missing'> = {
  idle: 'generated',
  thinking: 'generated',
  greeting: 'generated',
  happy: 'generated',
  celebrating: 'generated',
  encouraging: 'generated',
};

/** Public URL of a pose's generated art webp (the Lottie JSON era is
 *  over - MascotArt renders these files with CSS mood motion). */
const MOOD_FILE: Record<MascotPoseName, string> = {
  idle: 'be-heo-idle',
  thinking: 'be-heo-thinking',
  greeting: 'be-heo-portrait',
  happy: 'be-heo-happy',
  celebrating: 'be-heo-celebrating',
  encouraging: 'be-heo-encouraging',
};

export function mascotAssetUrl(mood: MascotPoseName): string {
  return `${import.meta.env.BASE_URL}images/mascot/${MOOD_FILE[mood]}.webp`;
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
 * session; failures are swallowed (the slot falls back to the static
 * pose anyway). Never fires on pre-round screens (D-21). Unlike the
 * Lottie era, the art renders under reduced motion too (static frame),
 * so warming is never wasted traffic.
 */
export function preloadMascotAssets(): void {
  if (preloadFired) return;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
  preloadFired = true;
  for (const mood of MASCOT_PRELOAD_MOODS) {
    if (MASCOT_ASSET_SOURCE[mood] === 'missing') continue;
    fetch(mascotAssetUrl(mood), { cache: 'force-cache' }).catch(() => {});
  }
}
