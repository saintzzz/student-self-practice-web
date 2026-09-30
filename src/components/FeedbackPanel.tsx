import { useEffect } from 'react';
import type { QuestionKind } from '../types';
import { playSfx } from '../lib/sfx';
import { EmojiVisual } from './EmojiVisual';
import Mascot from './Mascot';
import Confetti from './celebrations/Confetti';

interface FeedbackPanelProps {
  kind: QuestionKind;
  isCorrect: boolean;
  correctWord: string;
  explanation: string;
  /**
   * CR-16: the answer the child actually picked, shown only when wrong so
   * they can compare it against the correct one instead of guessing why.
   */
  pickedAnswer?: string;
  /** CR-16: full correct sentence (sentence-cloze kinds) - "Câu đúng: ..." */
  fullSentence?: string;
  /**
   * Correct-word picture (D-11, US-10): presentational only - QuestionCard
   * resolves it via getWordVisual. Uses the full fallback chain
   * (photo -> lottie -> svg -> native), so a plain emoji works too.
   */
  picture?: { emoji: string; imageUrl?: string };
}

const KINDS_WITH_ANSWER_FEEDBACK_TESTID: readonly QuestionKind[] = [
  'listening-fill-blank',
  'extra-letter',
  'listening-sentence-fill-blank',
];

const HEADLINE_CLASS =
  'flex items-center gap-1 text-2xl font-extrabold [@media(max-height:420px)]:text-lg';
// Exact class order from ebd58a5 so the no-picture DOM is byte-identical.
const WORD_LINE_BASE_CLASS =
  'mt-2 text-xl font-semibold text-white [@media(max-height:420px)]:mt-1 [@media(max-height:420px)]:text-base';

/**
 * Renders on every single question (plan.md v10 "App-Wide Mascot") - the
 * mascot here MUST use `size="inline"` and sit on the same line as the
 * headline text (no extra row) to avoid reintroducing the v9 phone-viewport
 * overflow bug this component's tight-vertical-space context is prone to.
 * The picture likewise sits inline inside the "Từ đúng là:" line (design
 * 3.5, AC-10.2) and stays screen-reader-visible (DS-12, A-04 rationale).
 *
 * AC-10.6 note (amendment A-13): each line keeps the baseline <p> tag from
 * ebd58a5 whenever only phrasing content can appear inside it. A <div> is
 * used instead exactly when an EmojiVisual inside may mount its lottie
 * layer - DotLottieReact renders a block-level canvas wrapper, which is
 * invalid inside <p> (React validateDOMNesting). So: the headline uses
 * <div> only when the happy accent is present (isCorrect), and the
 * correct-word line uses <div> only when a picture prop is present.
 */
export default function FeedbackPanel({ kind, isCorrect, correctWord, explanation, pickedAnswer, fullSentence, picture }: FeedbackPanelProps) {
  // CR-20: verdict sound on mount - chime for correct, soft two-tone for wrong.
  useEffect(() => {
    playSfx(isCorrect ? 'correct' : 'wrong');
  }, [isCorrect]);

  const HeadlineTag = isCorrect ? 'div' : 'p';
  const WordLineTag = picture ? 'div' : 'p';

  return (
    <div
      data-testid={KINDS_WITH_ANSWER_FEEDBACK_TESTID.includes(kind) ? 'answer-feedback' : undefined}
      className={`relative mt-3 overflow-hidden rounded-2xl p-4 pl-5 text-left ring-2 shadow-md [@media(max-height:420px)]:mt-1 [@media(max-height:420px)]:p-2 [@media(max-height:420px)]:pl-3 ${
        isCorrect
          ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 ring-emerald-400/50'
          : 'bg-gradient-to-r from-rose-500/20 to-rose-600/10 ring-rose-400/50'
      }`}
    >
      {/* CR-12 DS-X2: accent edge bar. */}
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1.5 ${isCorrect ? 'bg-emerald-400' : 'bg-rose-400'}`}
      />
      {isCorrect && <Confetti />}
      <HeadlineTag
        className={`${HEADLINE_CLASS} ${isCorrect ? 'text-emerald-300' : 'text-rose-300'}`}
      >
        <Mascot mood={isCorrect ? 'happy' : 'encouraging'} size="inline" />
        {isCorrect ? 'Chính xác! Giỏi quá!' : 'Chưa đúng rồi, cố lên nhé!'}
      </HeadlineTag>
      {!isCorrect && pickedAnswer && (
        <p className="mt-2 text-lg font-semibold text-rose-300 [@media(max-height:420px)]:mt-1 [@media(max-height:420px)]:text-sm">
          Em chọn: <span className="line-through opacity-80">{pickedAnswer}</span>
        </p>
      )}
      <WordLineTag
        className={picture ? `flex items-center gap-1 ${WORD_LINE_BASE_CLASS}` : WORD_LINE_BASE_CLASS}
      >
        Từ đúng là: <span className="font-extrabold">{correctWord}</span>
        {picture && (
          <EmojiVisual emoji={picture.emoji} imageUrl={picture.imageUrl} animated className="ml-[0.3em]" />
        )}
      </WordLineTag>
      {!isCorrect && fullSentence && (
        <p className="mt-1 text-lg font-semibold text-sky-200 [@media(max-height:420px)]:text-sm">
          Câu đúng: {fullSentence}
        </p>
      )}
      <p className="mt-1 text-lg text-slate-300 [@media(max-height:420px)]:text-sm">{explanation}</p>
    </div>
  );
}
