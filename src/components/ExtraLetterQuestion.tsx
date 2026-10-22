import { useRef } from 'react';
import type { ExtraLetterQuestion as ExtraLetterQuestionType } from '../types';
import { EmojiVisual } from './EmojiVisual';
import {
  material,
  QUESTION_BODY,
  QUESTION_BODY_CENTER,
} from '../lib/ui/tokens';
import { getOptionLabelPrefix, getOptionStateAttrs } from './optionButtonStyle';
import PressableOptionButton from './PressableOptionButton';
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
  /* CR-82 s7.2: base keeps structural classes only (flex, radius, border
     width, focus); each state branch owns a material.tile* token. */
  const base =
    'relative flex h-[76px] min-w-0 flex-1 max-w-[76px] items-center justify-center rounded-[1.25rem] border-2 text-3xl ' +
    `font-extrabold uppercase transition ${material.tileFocus} ` +
    /* CR-104: in confirmed-worst-case landscape (<=420px tall) the 76px
       key-cap alone pushes next-button ~6px past the fold; 56px stays
       above the 48px kid touch floor and keeps the word on one row. */
    '[@media(max-width:360px)]:text-2xl [@media(max-height:420px)]:h-14';

  if (selectedLetterIndex === null) {
    return `${base} ${material.tileFace} ${material.tileHover} ${material.tilePress}`;
  }

  const missed = selectedLetterIndex !== extraIndex;

  if (index === extraIndex) {
    /* kids-UX (design s3.4): on a missed pick the extra letter is the only
       emerald surface - flat token, no celebratory gradient. */
    if (missed) return `${base} ${material.tileRevealCorrect}`;
    return `${base} ${material.tileCorrect}`;
  }

  if (index === selectedLetterIndex) {
    /* kids-UX: desaturated slate (not rose) marks "the tile em chọn" -
       keeps the tile-shake hint but drops the red shame treatment. */
    return `${base} tile-shake ${material.tilePickedWrong} opacity-80`;
  }

  return `${base} ${material.tileFace} ${material.tileDisabled}`;
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
          <PressableOptionButton
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
          </PressableOptionButton>
        ))}
        {demo.showDemo && !hasAnswered ? (
          <DemoHint containerRef={rowRef} onDone={demo.dismiss} />
        ) : null}
      </div>
      </div>
    </div>
  );
}
