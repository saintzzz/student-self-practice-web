import { useViewer } from '../lib/viewer/ViewerContext';
import type { MascotPoseName } from '../lib/mascot/poses';
import { MascotArt } from './mascot/MascotArt';

/** CR-82 (spec s9.2): the pose set is the public mood API. */
export type MascotMood = MascotPoseName;

interface MascotProps {
  mood: MascotMood;
  /** 'inline' = 32px head-only art for tight-vertical-space contexts
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
 * App-wide pig mascot (plan.md v10 AC38-AC39; CR-72 art pass; CR-82 M4;
 * bespoke-art unification pass).
 *
 * Every slot renders `MascotArt`: the ChatGPT-generated Bé Heo pose with
 * a transform-only CSS mood animation - the same character as the chrome
 * portrait/favicon, no more flat SVG/Lottie pig. A missing webp falls
 * back to the static pose so the slot never breaks.
 *
 * The wrapper is unchanged: `role="img"` + the pose's Vietnamese
 * aria-label, `data-mascot-mood` for tests, and
 * `data-mascot-renderer="art"` for Playwright visual checks.
 * Exactly one `data-testid="mascot"` node per screen state (spec s9.3).
 */
export default function Mascot({ mood, size = 'block' }: MascotProps) {
  const { band } = useViewer();

  const sizePx =
    size === 'inline' ? 32 : size === 'companion' ? (band === 'G12' ? 72 : 56) : band === 'G12' ? 96 : 80;

  return (
    <span
      data-testid="mascot"
      data-mascot-mood={mood}
      data-mascot-renderer="art"
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
      <MascotArt mood={mood} sizePx={sizePx} />
    </span>
  );
}
