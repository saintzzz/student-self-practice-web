import { useEffect } from 'react';
import type { QuestionKind } from '../types';
import { playGentleWrong, playSfx } from '../lib/sfx';
import { speakWord } from '../lib/speech';
import { useViewer } from '../lib/viewer/ViewerContext';
import { CHIP_GOLD } from '../lib/ui/tokens';
import { wordIpa } from '../lib/content/contentBank';
import { EmojiVisual } from './EmojiVisual';
import { useLottieSlot } from './fx/LottieBudget';
import Mascot from './Mascot';
import Confetti from './celebrations/Confetti';
import { IconSpeaker, IconFlame } from './icons';

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
  /** CR-79 A5: streak>=3 beat - mascot celebrates, confetti doubles. */
  celebrate?: boolean;
  /**
   * CR-82 (spec s16.2): the consecutive-correct count ending at this
   * answer. >=3 shows the CHIP_GOLD streak chip inside the sheet; the
   * 3/5/10 milestones also queue the 'streak' reward sfx (reward tier -
   * 250ms behind the verdict, never overlapping it).
   */
  streak?: number;
  /**
   * CR-99 M4: consecutive-wrong run ending at this answer - drives the
   * attempt-ladder headline on wrong verdicts (calmer copy as misses
   * stack up, like Martin's try-again ladder). Kind-specific
   * `headlines.wrong` still wins when provided.
   */
  wrongStreak?: number;
  /**
   * CR-82 (spec s9.3, rev2 F4): 'inline' = the static 32px mascot lives in
   * the headline (today's behaviour, and the only mascot at
   * max-height:420px). 'none' = the sheet perch sibling layer in
   * QuestionCard owns the single on-screen mascot; the headline keeps
   * right-side clearance so text never runs under the hooves.
   */
  mascotPlacement?: 'inline' | 'none';
  /**
   * CR-82 (spec s12.6): optional per-kind verdict headline. Letter
   * tracing swaps the generic pair for completion-acknowledging copy -
   * "Chưa đúng rồi" would shame a finished trace.
   */
  headlines?: { correct: string; wrong: string };
}

const KINDS_WITH_ANSWER_FEEDBACK_TESTID: readonly QuestionKind[] = [
  'listening-fill-blank',
  'extra-letter',
  'listening-sentence-fill-blank',
  /* CR-82: tracing submits through the same sheet; e2e's structural
     answer loop reads `answer-feedback[data-correct]` for the outcome. */
  'letter-tracing',
];

const HEADLINE_CLASS =
  'flex items-center gap-1 text-2xl font-extrabold [@media(max-height:420px)]:text-lg';

/* CR-82 (spec s16.2): milestone copy + the streak sfx fire at 3, 5, and
   every 5 from 10 up; interim counts (4, 6-9, 11-14...) still show a
   chip but reuse the generic line and stay silent. */
function streakChipText(streak: number): string {
  if (streak === 3) return '3 câu đúng liên tiếp!';
  if (streak === 5) return '5 câu liên tiếp - siêu quá!';
  if (streak === 10) return '10 câu liên tiếp - vô địch!';
  return `${streak} câu đúng liên tiếp!`;
}

function isStreakMilestone(streak: number): boolean {
  return streak === 3 || streak === 5 || (streak >= 10 && streak % 5 === 0);
}

/* CR-99 M4: wrong-answer attempt ladder - the first miss is a gentle
   nudge, the second acknowledges "so close", the third+ invites a calm
   retry together instead of repeating the same scolding tone. */
function wrongHeadline(wrongStreak: number): string {
  if (wrongStreak >= 3) return 'Mình cùng thử lại nhé!';
  if (wrongStreak === 2) return 'Aww, suýt nữa rồi!';
  return 'Chưa đúng rồi, cố lên nhé!';
}
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
export default function FeedbackPanel({ kind, isCorrect, correctWord, explanation, pickedAnswer, fullSentence, picture, celebrate, streak = 0, wrongStreak = 0, mascotPlacement = 'inline', headlines }: FeedbackPanelProps) {
  const { density, band } = useViewer();
  /* CR-82 (D-20): the sheet's feedback picture animates only when the
     board allocator grants the 'feedback' slot (<=2 players post-answer). */
  const feedbackSlot = useLottieSlot('feedback');
  // CR-20: verdict sound on mount - chime for correct. kids-UX (design
  // s3.4): the wrong verdict plays the muted gentle cue, not a penalty
  // tone.
  useEffect(() => {
    if (isCorrect) {
      playSfx('correct');
      /* CR-82 (spec s16.3): streak milestones queue the reward tier -
         playSfx schedules it 250ms after the verdict, never overlapping. */
      if (isStreakMilestone(streak)) playSfx('streak');
    } else playGentleWrong();
  }, [isCorrect, streak]);

  // CR-24: IPA transcription next to the correct word (user request:
  // "thêm phần phiên âm đọc") - e.g. "full moon" shows /fʊl mun/.
  const ipa = wordIpa(correctWord.trim().toLowerCase());

  const HeadlineTag = isCorrect ? 'div' : 'p';
  const WordLineTag = picture ? 'div' : 'p';

  return (
    <div
      data-testid={KINDS_WITH_ANSWER_FEEDBACK_TESTID.includes(kind) ? 'answer-feedback' : undefined}
      /* kids-UX s3.4: color never carries the verdict alone (slate/sky
         replaced rose) - data-correct is the machine-readable outcome hook
         the e2e outcome reader checks before any class heuristic. */
      data-correct={isCorrect}
      /* kids-UX s3.4: announce the verdict gently; aria-live lets the
         teach-back reach screen-reader kids without moving focus. */
      aria-live="polite"
      /* CR-73 QuestionFrame s5.2: the bounded scroll region of the
         feedback zone - QuestionCard owns the bottom-anchor/sheet
         positioning for [panel + Next] as one unit (spec s6 anatomy). */
      className={`relative mt-3 max-h-[min(40vh,320px)] overflow-y-auto overscroll-contain rounded-2xl p-4 pl-5 pb-[max(1rem,env(safe-area-inset-bottom))] text-left ring-2 shadow-md [@media(max-height:420px)]:mt-0 [@media(max-height:420px)]:rounded-b-none [@media(max-height:420px)]:p-2 [@media(max-height:420px)]:pl-3 ${
        isCorrect
          ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 ring-emerald-400/50'
          : 'bg-sky-500/15 ring-sky-400/50'
      }`}
    >
      {/* CR-12 DS-X2: accent edge bar. kids-UX s3.4: the wrong state uses
          the sky "let's learn" tint - rose is reserved for the picked-tile
          marker only (Ruling R-20), never a whole red panel. */}
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1.5 ${isCorrect ? 'bg-emerald-400' : 'bg-sky-400'}`}
      />
      {isCorrect && <Confetti big={celebrate} />}
      {isCorrect && streak >= 3 && (
        /* CR-82 (spec s16.2): CHIP_GOLD streak chip inside the sheet. */
        <p data-testid="streak-chip" data-streak={streak} className={`mt-2 ${CHIP_GOLD}`}>
          <IconFlame size={16} className="text-amber-600" />
          {streakChipText(streak)}
        </p>
      )}
      <HeadlineTag
        className={`${HEADLINE_CLASS} ${isCorrect ? 'text-emerald-300' : 'text-white'} ${
          /* CR-82 s9.3: when the sheet perch owns the mascot the headline
             keeps clearance under the hooves (72px G1-2 / 56px G3-5). */
          mascotPlacement === 'none' ? (band === 'G12' ? 'pr-16' : 'pr-14') : ''
        }`}
      >
        {mascotPlacement === 'inline' && (
          <Mascot mood={isCorrect ? (celebrate ? 'celebrating' : 'happy') : 'encouraging'} size="inline" />
        )}
        {isCorrect ? (headlines?.correct ?? 'Chính xác! Giỏi quá!') : (headlines?.wrong ?? wrongHeadline(wrongStreak))}
      </HeadlineTag>
      {!isCorrect && pickedAnswer && (
        /* kids-UX s3.4: no strikethrough - striking the child's pick reads
           as punitive and hurts readability (Ruling R-20). */
        <p className="mt-2 text-lg font-semibold text-slate-300 [@media(max-height:420px)]:mt-1 [@media(max-height:420px)]:text-sm">
          Em chọn: <span className="opacity-80">{pickedAnswer}</span>
        </p>
      )}
      <WordLineTag
        className={picture ? `flex items-center gap-1 ${WORD_LINE_BASE_CLASS}` : WORD_LINE_BASE_CLASS}
      >
        Từ đúng là: <span className="font-extrabold">{correctWord}</span>
        {ipa && <span className="ml-1 font-mono font-semibold text-sky-300">/{ipa}/</span>}
        {picture && (
          <EmojiVisual emoji={picture.emoji} imageUrl={picture.imageUrl} animated={feedbackSlot} className="ml-[0.3em]" />
        )}
      </WordLineTag>
      {!isCorrect && fullSentence && (
        <p className="mt-1 text-lg font-semibold text-sky-200 [@media(max-height:420px)]:text-sm">
          Câu đúng: {fullSentence}
        </p>
      )}
      <p className="mt-1 text-lg text-slate-300 [@media(max-height:420px)]:text-sm">{explanation}</p>
      {/* kids-UX dev-review #8 (AC-3.4): a wrong answer offers "Nghe
          mẫu" - replays the CORRECT word through the cached speech path.
          It never re-dispatches scoring: the committed answer and its
          recorded result are untouched. */}
      {!isCorrect && correctWord && (
        <button
          type="button"
          data-testid="feedback-listen-model"
          onClick={() => speakWord(correctWord)}
          /* dev-review r2 #3 + CR-73 density: a kid-facing control obeys
             the band floor - 76px on G1-2, 64px on G3-5. */
          className={`mt-3 inline-flex items-center gap-2 rounded-full bg-[#1d3465] px-4 font-extrabold text-sky-100 ring-1 ring-[#3b5280] transition hover:bg-[#24406f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 motion-reduce:transition-none [@media(max-height:420px)]:mt-2 ${
            density.primaryMinH >= 76 ? 'min-h-[76px] text-base' : 'min-h-[64px] text-sm'
          }`}
        >
          <IconSpeaker size={18} /> Nghe mẫu
        </button>
      )}
    </div>
  );
}
