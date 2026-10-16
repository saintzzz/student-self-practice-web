import { useRef } from 'react';
import type { ExtraLetterQuestion as ExtraLetterQuestionType } from '../types';
import { EmojiVisual } from './EmojiVisual';
import {
  OPTION_PICKED_WRONG,
  OPTION_REVEAL_CORRECT,
  QUESTION_BODY,
  QUESTION_BODY_CENTER,
  toy,
} from '../lib/ui/tokens';
import { getOptionLabelPrefix, getOptionStateAttrs } from './optionButtonStyle';
import QuestionBanner from './QuestionBanner';
import { useDemoHint } from '../hooks/useDemoHint';
import DemoHint from './DemoHint';

const INSTRUCTION = 'Từ này có 1 chữ cái thừa! Bấm vào chữ cái em nghĩ là thừa nhé.';

interface ExtraLetterQuestionProps {
  question: ExtraLetterQuestionType;
  selectedLetterIndex: number | null;
  onSelectLetter: (index: number) => void;
  /** kids-UX s3.2: round-scoped autoplay key for the instruction speaker. */
  speakerKey?: string;
}

function getTileClassName(index: number, selectedLetterIndex: number | null, extraIndex: number): string {
  /* CR-12 DS-X3: letter tiles become "key caps" - gradient face, top
     sheen + deep bottom edge, lift on hover like a toy keyboard. */
  /* CR-12 DS-X3: letter tiles become "key caps" - gradient face, top
     sheen + deep bottom edge, lift on hover like a toy keyboard.
     CR-12 fix: tiles must stay on ONE row so the letters still read as
     a word - flex-1 lets them share the row, max-w caps at 76px, and
     the 76px HEIGHT is preserved so the touch target stays generous
     even when narrow screens make tiles thin. */
  /* CR-79 toy-block: base keeps structural classes only; the unanswered
     branch takes the toy face, judged branches keep their own shadows. */
  const base =
    'relative flex h-[76px] min-w-0 flex-1 max-w-[76px] items-center justify-center rounded-2xl border-4 text-3xl ' +
    'font-extrabold uppercase transition ' +
    'focus:outline-none focus:ring-4 focus:ring-amber-400/60 [@media(max-width:360px)]:text-2xl';

  if (selectedLetterIndex === null) {
    return `${base} ${toy.face} ${toy.faceHover} ${toy.pressed} border-[#2a3a5e] text-white`;
  }

  const missed = selectedLetterIndex !== extraIndex;

  if (index === extraIndex) {
    /* kids-UX (design s3.4): on a missed pick the extra letter is the only
       emerald surface - flat token, no celebratory gradient. */
    if (missed) return `${base} ${OPTION_REVEAL_CORRECT}`;
    return `${base} border-emerald-400 bg-gradient-to-b from-emerald-500/25 to-emerald-600/15 text-emerald-100 ` +
      'shadow-[inset_0_2px_0_rgba(255,255,255,0.15),inset_0_-4px_0_rgba(5,150,105,0.25),0_6px_14px_-6px_rgba(5,150,105,0.45)]';
  }

  if (index === selectedLetterIndex) {
    /* kids-UX: desaturated slate (not rose) marks "the tile em chọn" -
       keeps the tile-shake hint but drops the red shame treatment. */
    return `${base} tile-shake ${OPTION_PICKED_WRONG} opacity-80`;
  }

  return `${base} border-[#2a3a5e] bg-gradient-to-b from-[#1d3465] to-[#162C55] text-white opacity-50`;
}

export default function ExtraLetterQuestion({
  question,
  selectedLetterIndex,
  onSelectLetter,
  speakerKey,
}: ExtraLetterQuestionProps) {
  const hasAnswered = selectedLetterIndex !== null;
  const wasCorrect = hasAnswered && selectedLetterIndex === question.extraIndex;
  const demo = useDemoHint('extra-letter');
  const rowRef = useRef<HTMLDivElement>(null);

  return (
    <div className={QUESTION_BODY}>
      <div className={QUESTION_BODY_CENTER}>
      {/* CR-12: smaller prompt on <=600px heights so long words (3 tile
          rows) keep the next-button near the fold on short phones. */}
      <QuestionBanner text={INSTRUCTION} speakerKey={speakerKey} />
      <div ref={rowRef} className="relative mb-2 flex justify-center gap-1.5 sm:gap-3">
        {question.displayLetters.map((letter, index) => (
          <button
            key={`${letter}-${index}`}
            type="button"
            data-testid={`letter-tile-${index}`}
            disabled={hasAnswered}
            onClick={() => onSelectLetter(index)}
            className={getTileClassName(index, selectedLetterIndex, question.extraIndex)}
            /* kids-UX s3.4: here "correct" means the extra letter - the
               tile to remove. */
            {...getOptionStateAttrs(index, selectedLetterIndex, question.extraIndex)}
            /* kids-UX s3.4: 76px key-cap tiles cannot hold a text prefix,
               so the "Em chọn / Đáp án" label rides the accessible name. */
            aria-label={
              getOptionLabelPrefix(index, selectedLetterIndex, question.extraIndex)
                ? getOptionLabelPrefix(index, selectedLetterIndex, question.extraIndex) + letter
                : undefined
            }
          >
            {letter}
            {wasCorrect && index === question.extraIndex && (
              <span
                aria-hidden="true"
                className="dart-arrow pointer-events-none absolute -top-7 text-2xl"
              >
                <EmojiVisual emoji="🎯" />
              </span>
            )}
          </button>
        ))}
        {demo.showDemo && !hasAnswered ? (
          <DemoHint containerRef={rowRef} onDone={demo.dismiss} />
        ) : null}
      </div>
      </div>
    </div>
  );
}
