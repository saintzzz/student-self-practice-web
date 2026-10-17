import { createContext, useContext, useEffect, useRef, type ReactNode, type RefObject } from 'react';

/**
 * CR-82 (M2, D-06 / DESIGN-SPEC-v5 s6.3): journey pan wiring.
 *
 * `LandShell` renders the `LandScene` root and provides its DOM element
 * via this context. Play surfaces call `useSceneJourney(fraction,
 * roundKey)`; the hook writes `--journey` and `data-round` imperatively
 * on the scene root - zero React re-render of the board on every answer
 * (the CSS transition on `.scene-layer` does the motion).
 *
 * On `roundKey` change the var resets to 0 and the L2/L3 layers replay
 * the 400 ms `scene-reset-fade` opacity crossfade, so the reset never
 * reads as "going backwards". Under `prefers-reduced-motion` both the
 * pan (`--pan: 0`) and the fade (`motion-reduce:animate-none` on the
 * layers) are inert - the same twin contract as every other animation.
 */

export type SceneRootRef = RefObject<HTMLDivElement | null>;

const SceneJourneyContext = createContext<SceneRootRef | null>(null);

export function SceneJourneyProvider({ rootRef, children }: { rootRef: SceneRootRef; children: ReactNode }) {
  return <SceneJourneyContext.Provider value={rootRef}>{children}</SceneJourneyContext.Provider>;
}

const LAYERS = '[data-scene-layer="mid"], [data-scene-layer="near"]';

function replayResetFade(root: HTMLElement): void {
  for (const layer of root.querySelectorAll<HTMLElement>(LAYERS)) {
    // Restart the CSS animation: none -> reflow -> restore.
    layer.style.animation = 'none';
    void layer.offsetWidth;
    layer.style.animation = '';
  }
}

/**
 * Drive the scene journey from a play surface.
 * @param fraction 0..1 progress through the current round (clamped).
 * @param roundKey changes when a new round/scene leg begins.
 */
export function useSceneJourney(fraction: number, roundKey: string | number): void {
  const rootRef = useContext(SceneJourneyContext);
  const lastRoundKey = useRef(roundKey);
  useEffect(() => {
    const root = rootRef?.current;
    if (!root) return;
    if (lastRoundKey.current !== roundKey) {
      lastRoundKey.current = roundKey;
      root.style.setProperty('--journey', '0');
      replayResetFade(root);
    }
    root.dataset.round = String(roundKey);
    root.style.setProperty('--journey', String(Math.min(1, Math.max(0, fraction))));
  }, [fraction, roundKey, rootRef]);
}
