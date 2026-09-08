export type MascotMood = 'greeting' | 'happy' | 'encouraging' | 'celebrating';

interface MascotProps {
  mood: MascotMood;
  /** 'inline' keeps the mascot small for tight-vertical-space contexts (FeedbackPanel). */
  size?: 'inline' | 'block';
}

interface MoodConfig {
  /** Sparkle for happy, confetti for celebrating; none for greeting/encouraging (plan.md v10). */
  accentEmoji: string | null;
  animationClassName: string;
  ariaLabel: string;
}

/**
 * Mood-to-visual mapping (plan.md v10 "App-Wide Mascot"). Same 🐷 glyph in
 * every mood for character consistency - mood is conveyed only via the
 * paired accent emoji and animation, never by swapping the character.
 */
const MOOD_CONFIG: Record<MascotMood, MoodConfig> = {
  greeting: {
    accentEmoji: null,
    animationClassName: 'animate-mascot-wave motion-reduce:animate-none',
    ariaLabel: 'Heo con vẫy chào',
  },
  happy: {
    accentEmoji: '✨',
    animationClassName: 'animate-mascot-pop motion-reduce:animate-none',
    ariaLabel: 'Heo con vui mừng',
  },
  encouraging: {
    accentEmoji: null,
    animationClassName: 'animate-mascot-calm motion-reduce:animate-none',
    ariaLabel: 'Heo con động viên',
  },
  celebrating: {
    accentEmoji: '🎉',
    animationClassName: 'animate-mascot-celebrate motion-reduce:animate-none',
    ariaLabel: 'Heo con ăn mừng',
  },
};

const SIZE_CLASSNAME: Record<NonNullable<MascotProps['size']>, string> = {
  inline: 'text-2xl [@media(max-height:420px)]:text-lg',
  block: 'text-5xl',
};

/**
 * App-wide pig mascot (plan.md v10, AC38-AC39). No custom art - a large
 * emoji is the app's existing visual language throughout. `size="inline"`
 * is required at every FeedbackPanel call site: that component renders in
 * the tight-vertical-space context the v9 responsive fix resolved on phone
 * screens, so the mascot must stay compact/inline there, never a large
 * block graphic.
 */
export default function Mascot({ mood, size = 'block' }: MascotProps) {
  const { accentEmoji, animationClassName, ariaLabel } = MOOD_CONFIG[mood];

  return (
    <span
      data-testid="mascot"
      data-mascot-mood={mood}
      role="img"
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1 leading-none ${SIZE_CLASSNAME[size]} ${animationClassName}`}
    >
      <span aria-hidden="true">🐷</span>
      {accentEmoji && <span aria-hidden="true">{accentEmoji}</span>}
    </span>
  );
}
