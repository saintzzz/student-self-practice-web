import { IconParty, IconSparkles } from './icons';

export type MascotMood = 'greeting' | 'happy' | 'encouraging' | 'celebrating';

interface MascotProps {
  mood: MascotMood;
  /** 'inline' keeps the mascot small for tight-vertical-space contexts (FeedbackPanel). */
  size?: 'inline' | 'block';
}

interface MoodConfig {
  animationClassName: string;
  ariaLabel: string;
}

/**
 * Mood-to-visual mapping. CR-72: Bé Heo is a real illustrated SVG now
 * (was a raw 🐷 emoji + accent emoji), with per-mood eyes/mouth so the
 * character actually has expressions - not one static glyph.
 */
const MOOD_CONFIG: Record<MascotMood, MoodConfig> = {
  greeting: {
    animationClassName: 'animate-mascot-wave motion-reduce:animate-none',
    ariaLabel: 'Heo con vẫy chào',
  },
  happy: {
    animationClassName: 'animate-mascot-pop motion-reduce:animate-none',
    ariaLabel: 'Heo con vui mừng',
  },
  encouraging: {
    animationClassName: 'animate-mascot-calm motion-reduce:animate-none',
    ariaLabel: 'Heo con động viên',
  },
  celebrating: {
    animationClassName: 'animate-mascot-celebrate motion-reduce:animate-none',
    ariaLabel: 'Heo con ăn mừng',
  },
};

const SIZE_CLASSNAME: Record<NonNullable<MascotProps['size']>, string> = {
  inline: 'h-8 w-8 [@media(max-height:420px)]:h-6 [@media(max-height:420px)]:w-6',
  block: 'h-20 w-20',
};

/* Palette - warm pig pink with a deep-plum outline so the character reads
   crisp on both the navy play surfaces and the light paper surfaces. */
const OUTLINE = '#4A2E3F';
const SKIN = '#FFB3C7';
const EAR = '#F58BA9';
const SNOUT = '#FF9FBD';
const NOSTRIL = '#C2587E';
const BLUSH = '#F2789F';
const TONGUE = '#E76E95';

function PigFace({ mood }: { mood: MascotMood }) {
  const eyesClosedHappy = mood === 'happy' || mood === 'celebrating';
  return (
    <svg viewBox="0 0 96 96" className="block h-full w-full" aria-hidden="true">
      {/* waving arm - greeting only */}
      {mood === 'greeting' && (
        <path
          d="M75 68 C82 64 86 56 84 47 L78 49 C79.5 56 77 62 71 65 Z"
          fill={SKIN}
          stroke={OUTLINE}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
      )}
      {/* ears */}
      <path d="M24 28 C14 10 26 5 36 11 C42 15 42 23 38 29 Z" fill={SKIN} stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round" />
      <path d="M72 28 C82 10 70 5 60 11 C54 15 54 23 58 29 Z" fill={SKIN} stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round" />
      <path d="M28 23 C23 14 29 11 34 14" fill="none" stroke={EAR} strokeWidth="3" strokeLinecap="round" />
      <path d="M68 23 C73 14 67 11 62 14" fill="none" stroke={EAR} strokeWidth="3" strokeLinecap="round" />
      {/* head */}
      <circle cx="48" cy="55" r="33" fill={SKIN} stroke={OUTLINE} strokeWidth="3" />
      {/* soft top-left sheen */}
      <path d="M26 45a29 29 0 0 1 17-19" fill="none" stroke="#FFD3E0" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
      {/* blush */}
      <ellipse cx="28" cy="63" rx="5.5" ry="3.4" fill={BLUSH} opacity="0.5" />
      <ellipse cx="68" cy="63" rx="5.5" ry="3.4" fill={BLUSH} opacity="0.5" />
      {/* eyes */}
      {eyesClosedHappy ? (
        <>
          <path d="M32 49 q4.5 -6.5 9 0" fill="none" stroke={OUTLINE} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M55 49 q4.5 -6.5 9 0" fill="none" stroke={OUTLINE} strokeWidth="3.4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="36.5" cy="48" r="4" fill={OUTLINE} />
          <circle cx="59.5" cy="48" r="4" fill={OUTLINE} />
          <circle cx="38" cy="46.6" r="1.4" fill="#FFFFFF" />
          <circle cx="61" cy="46.6" r="1.4" fill="#FFFFFF" />
          {mood === 'encouraging' && (
            <>
              <path d="M31.5 40.5 q5 -3.5 10 -1.5" fill="none" stroke={OUTLINE} strokeWidth="2.4" strokeLinecap="round" />
              <path d="M54.5 39 q5 -2 10 1.5" fill="none" stroke={OUTLINE} strokeWidth="2.4" strokeLinecap="round" />
            </>
          )}
        </>
      )}
      {/* snout */}
      <ellipse cx="48" cy="60.5" rx="13" ry="9.5" fill={SNOUT} stroke={OUTLINE} strokeWidth="3" />
      <ellipse cx="43" cy="60.5" rx="2.1" ry="3.3" fill={NOSTRIL} />
      <ellipse cx="53" cy="60.5" rx="2.1" ry="3.3" fill={NOSTRIL} />
      {/* mouth */}
      {mood === 'celebrating' ? (
        <>
          <path d="M40.5 73.5 Q48 83.5 55.5 73.5 Z" fill="#7A3552" stroke={OUTLINE} strokeWidth="2.6" strokeLinejoin="round" />
          <ellipse cx="48" cy="77" rx="4.2" ry="2.4" fill={TONGUE} />
        </>
      ) : mood === 'happy' ? (
        <path d="M41 73.5 q7 6.5 14 0" fill="none" stroke={OUTLINE} strokeWidth="3" strokeLinecap="round" />
      ) : (
        <path d="M42.5 73.5 q5.5 4.5 11 0" fill="none" stroke={OUTLINE} strokeWidth="3" strokeLinecap="round" />
      )}
      {/* celebrating confetti */}
      {mood === 'celebrating' && (
        <g>
          <rect x="13" y="12" width="4" height="7" rx="1.4" fill="#FBBF24" transform="rotate(24 15 15.5)" />
          <rect x="78" y="8" width="4" height="7" rx="1.4" fill="#34D399" transform="rotate(-20 80 11.5)" />
          <rect x="86" y="22" width="4" height="7" rx="1.4" fill="#F472B6" transform="rotate(30 88 25.5)" />
          <circle cx="6" cy="32" r="2.2" fill="#60A5FA" />
          <circle cx="90" cy="34" r="2.2" fill="#FBBF24" />
          <circle cx="18" cy="8" r="2" fill="#F472B6" />
        </g>
      )}
    </svg>
  );
}

/**
 * App-wide pig mascot (plan.md v10, AC38-AC39; CR-72 art pass).
 * `size="inline"` is required at every FeedbackPanel call site: that
 * component renders in the tight-vertical-space context the v9
 * responsive fix resolved on phone screens, so the mascot must stay
 * compact/inline there, never a large block graphic.
 */
export default function Mascot({ mood, size = 'block' }: MascotProps) {
  const { animationClassName, ariaLabel } = MOOD_CONFIG[mood];

  /* CR-12 DS-X4: block mascots get a soft radial halo + gentle float so
     the character reads like a hero element, not a floating glyph. */
  const block = size === 'block';

  return (
    <span
      data-testid="mascot"
      data-mascot-mood={mood}
      role="img"
      aria-label={ariaLabel}
      className={`relative inline-flex items-center gap-1.5 leading-none ${animationClassName}`}
    >
      {block && (
        <span
          aria-hidden="true"
          className="absolute -inset-4 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.15),rgba(255,255,255,0))]"
        />
      )}
      <span
        aria-hidden="true"
        className={`relative ${SIZE_CLASSNAME[size]} ${block ? 'mascot-float motion-reduce:animate-none' : ''}`}
      >
        <PigFace mood={mood} />
      </span>
      {mood === 'happy' && (
        <IconSparkles size={block ? 22 : 14} className="relative text-amber-300" />
      )}
      {mood === 'celebrating' && (
        <IconParty size={block ? 24 : 15} className="relative text-amber-300" />
      )}
    </span>
  );
}
