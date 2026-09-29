import type { QuestionKind } from '../types';
import { EmojiVisual } from './EmojiVisual';
import Mascot from './Mascot';

interface FeedbackPanelProps {
  kind: QuestionKind;
  isCorrect: boolean;
  correctWord: string;
  explanation: string;
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
  'mt-2 text-xl font-semibold text-sky-900 [@media(max-height:420px)]:mt-1 [@media(max-height:420px)]:text-base';

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
export default function FeedbackPanel({ kind, isCorrect, correctWord, explanation, picture }: FeedbackPanelProps) {
  const HeadlineTag = isCorrect ? 'div' : 'p';
  const WordLineTag = picture ? 'div' : 'p';

  return (
    <div
      data-testid={KINDS_WITH_ANSWER_FEEDBACK_TESTID.includes(kind) ? 'answer-feedback' : undefined}
      className={`mt-3 rounded-2xl border-4 p-4 text-left [@media(max-height:420px)]:mt-1 [@media(max-height:420px)]:p-2 ${
        isCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-rose-400 bg-rose-50'
      }`}
    >
      <HeadlineTag
        className={`${HEADLINE_CLASS} ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}
      >
        <Mascot mood={isCorrect ? 'happy' : 'encouraging'} size="inline" />
        {isCorrect ? 'Chính xác! Giỏi quá!' : 'Chưa đúng rồi, cố lên nhé!'}
      </HeadlineTag>
      <WordLineTag
        className={picture ? `flex items-center gap-1 ${WORD_LINE_BASE_CLASS}` : WORD_LINE_BASE_CLASS}
      >
        Từ đúng là: <span className="font-extrabold">{correctWord}</span>
        {picture && (
          <EmojiVisual emoji={picture.emoji} imageUrl={picture.imageUrl} animated className="ml-[0.3em]" />
        )}
      </WordLineTag>
      <p className="mt-1 text-lg text-slate-700 [@media(max-height:420px)]:text-sm">{explanation}</p>
    </div>
  );
}
