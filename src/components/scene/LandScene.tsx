import { forwardRef, useEffect, useState, type ComponentType, type CSSProperties } from 'react';
import { scene } from '../../lib/ui/tokens';
import { LANDS, scenePalette, type LandKey, type SceneTone } from '../../lib/ui/theme';
import * as brandArt from './art/brand';
import * as cityArt from './art/city';
import * as jungleArt from './art/jungle';
import * as playgroundArt from './art/playground';
import * as skyArt from './art/sky';
import * as spaceArt from './art/space';
import * as townArt from './art/town';
import type { LandArtProps } from './art/sky';

/**
 * CR-10 DS-T1 + CR-82 (M2, DESIGN-SPEC-v5 s6.2): decorative scene art.
 *
 * - `variant="strip"` (default) = the v4 bottom strip, now palette-toned
 *   instead of the `night` CSS filter (D5/D7 fix).
 * - `variant="hero"` = the v5 full-bleed "Chan troi vang" scene: L0 sky
 *   gradient + land horizon glow, L1 far / L2 mid / L3 near parallax
 *   layers (pan via `--journey` x `--pan`), L4 scrim behind the board.
 * - `tone`: day | dusk | night. `night` (legacy prop) maps to
 *   tone='night'. Colors come from scenePalette() - no hex here (FF-6).
 * - Unknown land keys resolve to the sky land + palette (spec s6.2 N3).
 */

const ART: Record<LandKey, { Far: ComponentType<LandArtProps>; Mid: ComponentType<LandArtProps>; Near: ComponentType<LandArtProps> }> = {
  sky: skyArt,
  playground: playgroundArt,
  town: townArt,
  jungle: jungleArt,
  city: cityArt,
  space: spaceArt,
  brand: brandArt,
};

/** v4 art viewBox; hero ground layers share it so strip/hero stay in sync. */
const VIEW_BOX = '0 0 1200 320';

export interface LandSceneProps {
  land: LandKey;
  /** 'hero' = full-bleed fixed layers; 'strip' = v4 bottom strip. */
  variant?: 'hero' | 'strip';
  /** Palette tone - replaces the legacy `night` CSS filter. */
  tone?: SceneTone;
  /** Legacy: maps to tone='night'. */
  night?: boolean;
  /** 0..1 journey position - drives the pan on hero. Omit = static. */
  journey?: number;
}

const LandScene = forwardRef<HTMLDivElement, LandSceneProps>(function LandScene(
  { land, variant = 'strip', tone, night = false, journey },
  ref,
) {
  const resolvedTone: SceneTone = tone ?? (night ? 'night' : 'day');
  const resolvedLand: LandKey = LANDS[land] ? land : 'sky';
  const palette = scenePalette(resolvedLand, resolvedTone);
  const art = ART[resolvedLand];
  const [paused, setPaused] = useState(false);

  // Ambient pause while the tab is hidden (OBJ-1 perf): data-scene-paused
  // freezes every descendant CSS animation via index.css.
  useEffect(() => {
    if (variant !== 'hero') return;
    const onVisibility = () => setPaused(document.hidden);
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [variant]);

  if (variant === 'strip') {
    return (
      <div
        ref={ref}
        data-testid="land-scene"
        data-variant="strip"
        data-tone={resolvedTone}
        data-land={resolvedLand}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 select-none overflow-hidden"
      >
        {/* CR-12 DS-X1 ambience: soft top glow + gentle bottom vignette. */}
        <div
          aria-hidden="true"
          className={`absolute inset-x-0 top-0 h-64 bg-gradient-to-b to-transparent ${
            resolvedTone === 'day' ? 'from-white/40' : 'from-white/10'
          }`}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/10 to-transparent"
        />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0">
          <svg viewBox={VIEW_BOX} preserveAspectRatio="xMidYMax slice" className="block h-44 w-full sm:h-60">
            <art.Far p={palette} tone={resolvedTone} hero={false} />
            <art.Mid p={palette} tone={resolvedTone} hero={false} />
            <art.Near p={palette} tone={resolvedTone} hero={false} />
          </svg>
        </div>
      </div>
    );
  }

  const band = resolvedTone === 'night' ? 'G345' : 'G12';
  const journeyStyle: CSSProperties | undefined =
    journey !== undefined ? ({ '--journey': journey } as CSSProperties) : undefined;

  return (
    <div
      ref={ref}
      data-testid="land-scene"
      data-variant="hero"
      data-tone={resolvedTone}
      data-land={resolvedLand}
      data-band={band}
      data-scene-paused={paused || undefined}
      aria-hidden="true"
      className={scene.root}
      style={journeyStyle}
    >
      {/* L0 sky: navy gradient + gold horizon + land-tinted glow */}
      <div className={`absolute inset-0 ${resolvedTone === 'dusk' ? scene.skyDusk : scene.skyNight}`} />
      <div className={`absolute inset-0 ${resolvedTone === 'night' ? scene.horizonGoldNight : scene.horizonGold}`} />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(70% 30% at 50% 100%, ${LANDS[resolvedLand].horizonGlow}, transparent 70%)`,
        }}
      />
      {/* L1 far - fills the sky (pan factor 0.15) */}
      <div data-scene-layer="far" className={`${scene.layer} scene-layer-far top-0`}>
        <svg viewBox={VIEW_BOX} preserveAspectRatio="xMidYMax slice" className="block h-full w-full">
          <art.Far p={palette} tone={resolvedTone} hero />
        </svg>
      </div>
      {/* L2 mid - ground band (pan factor 0.45, stability anchor) */}
      <div
        data-scene-layer="mid"
        className={`${scene.layer} scene-layer-mid animate-scene-reset-fade motion-reduce:animate-none h-[38vh] max-h-[360px] min-h-[180px] [@media(max-height:420px)]:h-[30vh]`}
      >
        <svg viewBox={VIEW_BOX} preserveAspectRatio="xMidYMax slice" className="block h-full w-full">
          <art.Mid p={palette} tone={resolvedTone} hero />
        </svg>
      </div>
      {/* L3 near - foreground props (pan factor 1.0; hidden on short landscape) */}
      <div
        data-scene-layer="near"
        className={`${scene.layer} scene-layer-near animate-scene-reset-fade motion-reduce:animate-none h-[38vh] max-h-[360px] min-h-[180px] [@media(max-height:420px)]:hidden`}
      >
        <svg viewBox={VIEW_BOX} preserveAspectRatio="xMidYMax slice" className="block h-full w-full">
          <art.Near p={palette} tone={resolvedTone} hero />
        </svg>
      </div>
      {/* L4 scrim - darkens the scene behind the board */}
      <div className={`absolute inset-0 ${scene.scrim}`} />
    </div>
  );
});

export default LandScene;
