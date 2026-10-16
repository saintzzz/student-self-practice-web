import { InstructionSpeaker } from './InstructionSpeaker';
import { QUESTION_BANNER } from '../lib/ui/tokens';

interface QuestionBannerProps {
  /** Vietnamese instruction shown in the banner (and spoken). */
  text: string;
  /** Round-scoped autoplay key - same contract as InstructionSpeaker. */
  speakerKey?: string;
}

/**
 * CR-81 (DESIGN-SPEC-v4 s2/S2): the question instruction as a left-aligned
 * "speech scroll" strip on the board - it reads as the narrator's line,
 * not a floating headline. Amber is reserved for reward/progress markers,
 * so instruction copy moves to slate-100 on a quiet slate strip. The
 * headless speaker keeps the once-per-key autoplay contract unchanged.
 */
export default function QuestionBanner({ text, speakerKey }: QuestionBannerProps) {
  return (
    <div className={QUESTION_BANNER}>
      <p className="flex-1 text-base font-semibold leading-snug text-slate-100 [@media(max-height:600px)]:text-sm">
        {text}
      </p>
      <InstructionSpeaker text={text} lang="vi-VN" autoplayKey={speakerKey} />
    </div>
  );
}
