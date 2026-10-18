import { forwardRef, useState, type CSSProperties } from 'react';
import { LANDS, type SceneTone } from '../../lib/ui/theme';
import { scene } from '../../lib/ui/tokens';
import LandScene, { type LandSceneProps } from './LandScene';

/**
 * Bespoke generated scene art (ChatGPT soft-3D storybook render per
 * land) replacing the flat vector strip in the most visible slots.
 * Same prop + data-attr contract as LandScene so callers and tests see
 * one scene root; when the art file is missing the LandScene vector
 * engine renders instead - zero-regression fallback.
 *
 * The generated scenes are painted at golden dusk so `day` needs no
 * treatment; dusk/night deepen through a filter. On `hero` the image
 * joins the `--journey` parallax bus via `scene-layer-mid` (14% overscan
 * covers the max pan without exposing an edge).
 */
const TONE_FILTER: Record<SceneTone, string> = {
  day: 'none',
  dusk: 'brightness(0.8) saturate(0.9)',
  night: 'brightness(0.58) saturate(0.85)',
};

const LandArt = forwardRef<HTMLDivElement, LandSceneProps>(function LandArt(
  { land, variant = 'strip', tone, night = false, journey },
  ref,
) {
  const resolvedTone: SceneTone = tone ?? (night ? 'night' : 'day');
  const resolvedLand = LANDS[land] ? land : 'sky';
  const [failedFile, setFailedFile] = useState<string | null>(null);
  const src = `/images/lands/land-${resolvedLand}.webp`;

  if (failedFile === src) {
    return <LandScene ref={ref} land={resolvedLand} variant={variant} tone={resolvedTone} journey={journey} />;
  }

  const journeyStyle: CSSProperties | undefined =
    journey !== undefined ? ({ '--journey': journey } as CSSProperties) : undefined;

  if (variant === 'hero') {
    return (
      <div
        ref={ref}
        data-testid="land-scene"
        data-variant="hero"
        data-tone={resolvedTone}
        data-land={resolvedLand}
        data-renderer="art"
        aria-hidden="true"
        className={scene.root}
        style={journeyStyle}
      >
        <img
          src={src}
          alt=""
          onError={() => setFailedFile(src)}
          className="scene-layer scene-layer-mid absolute bottom-0 left-[-7%] h-full w-[114%] max-w-none object-cover object-[center_bottom]"
          style={{ filter: TONE_FILTER[resolvedTone] }}
        />
        {/* L4 scrim equivalent - keeps page content readable over the
            bright generated scene. */}
        <div className={`absolute inset-0 ${scene.scrim}`} />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      data-testid="land-scene"
      data-variant="strip"
      data-tone={resolvedTone}
      data-land={resolvedLand}
      data-renderer="art"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 select-none overflow-hidden"
    >
      <img
        src={src}
        alt=""
        onError={() => setFailedFile(src)}
        className="h-full w-full object-cover object-[center_bottom]"
        style={{ filter: TONE_FILTER[resolvedTone] }}
      />
    </div>
  );
});

export default LandArt;
