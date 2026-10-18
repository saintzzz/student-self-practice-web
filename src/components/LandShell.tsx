import { useRef, type ReactNode } from 'react';
import { bandForGrade, getLand, LANDS, type Land, type LandKey, type SceneTone } from '../lib/ui/theme';
import LandArt from './scene/LandArt';
import { SceneJourneyProvider } from './scene/SceneJourneyContext';

interface LandShellProps {
  /** Grade id - resolves to its land; omit/null for the sky land. */
  gradeId?: string | null;
  /** Direct override when a screen knows its land but not a grade. */
  land?: LandKey;
  /** CR-81 (legacy): maps to tone='night' for backwards compatibility. */
  night?: boolean;
  /** CR-82 (v5 s6.2): palette tone - day | dusk | night. */
  tone?: SceneTone;
  /** CR-82 (v5 s6.2): 'hero' = full-bleed layered scene; 'strip' = v4
   *  bottom strip (kept for adult/credits surfaces + revert). */
  variant?: 'hero' | 'strip';
  children: ReactNode;
}

/**
 * CR-10 DS-T1 + CR-82 (M2): page-level themed shell - land gradient +
 * pinned scene art behind the content. CR-82 adds the hero scene, the
 * SceneJourney provider (D-06 - play surfaces drive `--journey`
 * imperatively through `useSceneJourney`) and the unknown-land guard
 * (rev 2 N3: a bad `land` override resolves to `getLand(gradeId)` ->
 * sky instead of crashing on `.pageGradient`).
 */
export default function LandShell({ gradeId, land, night = false, tone, variant = 'strip', children }: LandShellProps) {
  const resolved: Land = (land !== undefined ? LANDS[land] : undefined) ?? getLand(gradeId);
  const resolvedTone: SceneTone = tone ?? (night ? 'night' : 'day');
  const sceneRef = useRef<HTMLDivElement | null>(null);
  return (
    <div
      className={`relative min-h-screen ${resolvedTone === 'day' ? resolved.pageGradient : LANDS.brand.pageGradient}`}
      data-band={bandForGrade(gradeId)}
    >
      <LandArt ref={sceneRef} land={resolved.key} variant={variant} tone={resolvedTone} />
      <SceneJourneyProvider rootRef={sceneRef}>
        <div className="relative z-10">{children}</div>
      </SceneJourneyProvider>
    </div>
  );
}
