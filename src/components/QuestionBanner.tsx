import { useEffect, useRef, useState } from 'react';
import { InstructionSpeaker } from './InstructionSpeaker';
import { speakInstruction, type InstructionStatus } from '../lib/speech';
import { QUESTION_BANNER, TYPE_INSTRUCTION_NAVY } from '../lib/ui/tokens';
import { IconSpeaker } from './icons';
import { useBoardPerch } from './boardPerchContext';
import { useViewer } from '../lib/viewer/ViewerContext';

interface QuestionBannerProps {
  /** Vietnamese instruction shown in the banner (and spoken). */
  text: string;
  /** Round-scoped autoplay key - same contract as InstructionSpeaker. */
  speakerKey?: string;
  /**
   * CR-82 (D-15): forwarded to InstructionSpeaker.onSettled - QuestionCard
   * uses it to start the thinking-pose idle clock after playback or a
   * skipped/failed attempt.
   */
  onInstructionSettled?: (outcome: 'ended' | 'not-played') => void;
}

/**
 * CR-81 (DESIGN-SPEC-v4 s2/S2): the question instruction as a left-aligned
 * "speech scroll" strip on the board - it reads as the narrator's line,
 * not a floating headline. Amber is reserved for reward/progress markers,
 * so instruction copy moves to slate-100 on a quiet slate strip. The
 * headless speaker is silent (CR-83: instruction voice disabled
 * product-wide) but still settles 'not-played' so the thinking clock
 * arms at mount.
 *
 * CR-82 (spec s9.3): while the board-perch mascot is mounted, the strip
 * gains a 10px `white/[0.07]` speech tail pointing up at him plus band
 * padding (pl-20 G1-2 / pl-16 G3-5) so text never sits under the hooves.
 * Both disappear the moment he unmounts (answered -> sheet perch).
 *
 * CR-99 M3/M8 ("Teach me"): a kid-tapped speaker replays the instruction
 * on demand - NOT autoplay, so the CR-83 conflict (instruction voice
 * colliding with listening audio / pronunciation mic) cannot recur. For
 * pre-reader G1-2 kids the tap is their self-serve "read it for me".
 */
export default function QuestionBanner({ text, speakerKey, onInstructionSettled }: QuestionBannerProps) {
  const perched = useBoardPerch();
  const { band } = useViewer();
  const [status, setStatus] = useState<InstructionStatus | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cancelRef.current?.(), []);

  const replay = () => {
    cancelRef.current?.();
    setStatus(null);
    /* Deliberate tap: autoplay=false lets the instruction preempt content
       audio (speakInstruction contract) - the kid asked for it. */
    cancelRef.current = speakInstruction(text, { lang: 'vi-VN', autoplay: false, onStatus: setStatus });
  };

  const speaking = status === 'playing';
  return (
    <div
      className={`${QUESTION_BANNER} ${
        perched
          ? `relative before:pointer-events-none before:absolute before:-top-2 before:left-9 before:h-0 before:w-0 before:border-x-[6px] before:border-b-[10px] before:border-x-transparent before:border-b-white/[0.07] ${
              band === 'G12' ? 'pl-20' : 'pl-16'
            }`
          : ''
      }`}
    >
      <p className={`flex-1 ${TYPE_INSTRUCTION_NAVY}`}>
        {text}
      </p>
      <button
        type="button"
        data-testid="banner-speaker"
        data-speaking={speaking || undefined}
        onClick={replay}
        aria-label={speaking ? 'Đang đọc hướng dẫn' : 'Nghe hướng dẫn'}
        className={`ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sky-200 ring-1 ring-white/15 transition hover:bg-white/20 active:scale-90 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 ${
          speaking ? 'animate-pulse text-amber-300' : ''
        }`}
      >
        <IconSpeaker size={18} />
      </button>
      <InstructionSpeaker text={text} lang="vi-VN" autoplayKey={speakerKey} onSettled={onInstructionSettled} />
    </div>
  );
}
