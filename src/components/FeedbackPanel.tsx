import type { QuestionKind } from '../types';
import Mascot from './Mascot';

interface FeedbackPanelProps {
  kind: QuestionKind;
  isCorrect: boolean;
  correctWord: string;
  explanation: string;
}

const KINDS_WITH_ANSWER_FEEDBACK_TESTID: readonly QuestionKind[] = [
  'listening-fill-blank',
  'extra-letter',
  'listening-sentence-fill-blank',
];

/**
 * Renders on every single question (plan.md v10 "App-Wide Mascot") - the
 * mascot here MUST use `size="inline"` and sit on the same line as the
 * headline text (no extra row) to avoid reintroducing the v9 phone-viewport
 * overflow bug this component's tight-vertical-space context is prone to.
 */
export default function FeedbackPanel({ kind, isCorrect, correctWord, explanation }: FeedbackPanelProps) {
  return (
    <div
      data-testid={KINDS_WITH_ANSWER_FEEDBACK_TESTID.includes(kind) ? 'answer-feedback' : undefined}
      className={`mt-3 rounded-2xl border-4 p-4 text-left [@media(max-height:420px)]:mt-1 [@media(max-height:420px)]:p-2 ${
        isCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-rose-400 bg-rose-50'
      }`}
    >
      <p
        className={`flex items-center gap-1 text-2xl font-extrabold [@media(max-height:420px)]:text-lg ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}
      >
        <Mascot mood={isCorrect ? 'happy' : 'encouraging'} size="inline" />
        {isCorrect ? 'Chính xác! Giỏi quá!' : 'Chưa đúng rồi, cố lên nhé!'}
      </p>
      <p className="mt-2 text-xl font-semibold text-sky-900 [@media(max-height:420px)]:mt-1 [@media(max-height:420px)]:text-base">
        Từ đúng là: <span className="font-extrabold">{correctWord}</span>
      </p>
      <p className="mt-1 text-lg text-slate-700 [@media(max-height:420px)]:text-sm">{explanation}</p>
    </div>
  );
}
