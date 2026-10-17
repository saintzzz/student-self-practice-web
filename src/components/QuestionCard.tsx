import { useEffect, useRef, useState } from 'react';
import type { Question, TracingMeta } from '../types';
import type { CurrentAnswer } from '../lib/practiceSession';
import { getCorrectWord } from '../lib/practiceSession';
import { getWordVisual } from '../lib/emoji/wordVisual';
import { hasLottie, toEmojiKey } from '../lib/emoji/emojiAssets';
import ImageChoiceQuestion from './ImageChoiceQuestion';
import ListeningFillBlankQuestion from './ListeningFillBlankQuestion';
import ListeningSentenceFillBlankQuestion from './ListeningSentenceFillBlankQuestion';
import ListeningImageChoiceQuestion from './ListeningImageChoiceQuestion';
import CountingImageQuestion from './CountingImageQuestion';
import ExtraLetterQuestion from './ExtraLetterQuestion';
import PronunciationRecordingQuestion from './PronunciationRecordingQuestion';
import DescribeAndChooseImageQuestion from './DescribeAndChooseImageQuestion';
import PicturePairMatchingQuestion from './PicturePairMatchingQuestion';
import PhonicsSoundChoiceQuestion from './PhonicsSoundChoiceQuestion';
import PhonicsWordChoiceQuestion from './PhonicsWordChoiceQuestion';
import PhonicsEndingChoiceQuestion from './PhonicsEndingChoiceQuestion';
import PhonicsRhymeChoiceQuestion from './PhonicsRhymeChoiceQuestion';
import TracingChunkBoundary from './tracing/TracingChunkBoundary';
import FeedbackPanel from './FeedbackPanel';
import JourneyTrail from './JourneyTrail';
import Mascot from './Mascot';
import { BoardPerchContext } from './boardPerchContext';
import { allocateLottie, LottieBudgetProvider } from './fx/LottieBudget';
import { useRewardFx } from './fx/RewardFxContext';
import StreakBurst from './fx/StreakBurst';
import {
  lastInstructionSettle,
  subscribeInstructionSettled,
} from './InstructionSpeaker';
import { playSfx } from '../lib/sfx';
import { rearmDemoHint } from '../hooks/useDemoHint';
import { preloadMascotAssets } from '../lib/mascot/assets';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useThinkingPose } from '../hooks/useThinkingPose';
import { useViewer } from '../lib/viewer/ViewerContext';
import { material, QUESTION_BODY, QUESTION_BODY_CENTER } from '../lib/ui/tokens';
import { CONTINUE_BUTTON_CLASSNAME } from './actionButtonStyle';
import { IconArrowRight } from './icons';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  currentAnswer: CurrentAnswer | null;
  onSubmitOption: (index: number) => void;
  onSubmitListening: (typedAnswer: string) => void;
  onSubmitExtraLetter: (letterIndex: number) => void;
  onSubmitPronunciation: (transcript: string) => void;
  onSubmitPairMatching: (isCorrect: boolean) => void;
  /**
   * CR-82 (D-10): letter-tracing submits carry telemetry - assisted
   * completions land on AnswerRecord.assisted and are excluded from
   * skill stats. Optional so legacy renders/tests stay valid; the Batch
   * path always wires it via ActiveRoundQuestion.
   */
  onSubmitTracing?: (isCorrect: boolean, meta: TracingMeta) => void;
  onNext: () => void;
  /**
   * kids-UX (design s3.2): round-scoped speaker key - forwarded to every
   * question body so its instruction speaker autoplays once per round
   * (all grades, headless - no speaker button).
   */
  speakerKey?: string;
  /** CR-79 A5: consecutive-correct run ending at the current answer -
   *  >=3 upgrades the feedback celebration to the bigger beat. */
  correctStreak?: number;
}

function renderQuestionBody(
  question: Question,
  currentAnswer: CurrentAnswer | null,
  onSubmitOption: (index: number) => void,
  onSubmitListening: (typedAnswer: string) => void,
  onSubmitExtraLetter: (letterIndex: number) => void,
  onSubmitPronunciation: (transcript: string) => void,
  onSubmitPairMatching: (isCorrect: boolean) => void,
  onSubmitTracing: ((isCorrect: boolean, meta: TracingMeta) => void) | undefined,
  speakerKey?: string,
  /** CR-82 (D-15): audio-loading child -> board signal for thinking. */
  onAudioLoadingChange?: (loading: boolean) => void,
  /** spec s12.7: tracing reports finger-down so `thinking` is suppressed. */
  onDrawingChange?: (drawing: boolean) => void,
) {
  switch (question.kind) {
    case 'image-choice':
      return (
        <ImageChoiceQuestion
          key={question.id}
          question={question}
          selectedIndex={currentAnswer?.selectedIndex ?? null}
          onSelectOption={onSubmitOption}
          speakerKey={speakerKey}
        />
      );
    case 'counting-image':
      return (
        <CountingImageQuestion
          key={question.id}
          question={question}
          selectedIndex={currentAnswer?.selectedIndex ?? null}
          onSelectOption={onSubmitOption}
          speakerKey={speakerKey}
        />
      );
    case 'listening-fill-blank':
      return (
        <ListeningFillBlankQuestion
          key={question.id}
          question={question}
          hasAnswered={currentAnswer !== null}
          onSubmit={onSubmitListening}
          speakerKey={speakerKey}
          onAudioLoadingChange={onAudioLoadingChange}
        />
      );
    case 'listening-sentence-fill-blank':
      return (
        <ListeningSentenceFillBlankQuestion
          key={question.id}
          question={question}
          hasAnswered={currentAnswer !== null}
          onSubmit={onSubmitListening}
          speakerKey={speakerKey}
          onAudioLoadingChange={onAudioLoadingChange}
        />
      );
    case 'extra-letter':
      return (
        <ExtraLetterQuestion
          key={question.id}
          question={question}
          selectedLetterIndex={currentAnswer?.selectedLetterIndex ?? null}
          onSelectLetter={onSubmitExtraLetter}
          speakerKey={speakerKey}
        />
      );
    case 'pronunciation-recording':
      return (
        <PronunciationRecordingQuestion
          key={question.id}
          question={question}
          hasAnswered={currentAnswer !== null}
          transcript={currentAnswer?.pronunciationTranscript ?? null}
          score={currentAnswer?.pronunciationScore ?? null}
          isCorrect={currentAnswer?.isCorrect ?? null}
          onSubmit={onSubmitPronunciation}
          speakerKey={speakerKey}
        />
      );
    case 'describe-and-choose-image':
      return (
        <DescribeAndChooseImageQuestion
          key={question.id}
          question={question}
          selectedIndex={currentAnswer?.selectedIndex ?? null}
          onSelectOption={onSubmitOption}
          speakerKey={speakerKey}
          onAudioLoadingChange={onAudioLoadingChange}
        />
      );
    case 'listening-image-choice':
      return (
        <ListeningImageChoiceQuestion
          key={question.id}
          question={question}
          selectedIndex={currentAnswer?.selectedIndex ?? null}
          onSelectOption={onSubmitOption}
          speakerKey={speakerKey}
          onAudioLoadingChange={onAudioLoadingChange}
        />
      );
    case 'picture-pair-matching':
      return (
        <PicturePairMatchingQuestion
          key={question.id}
          question={question}
          hasAnswered={currentAnswer !== null}
          onSubmit={onSubmitPairMatching}
          speakerKey={speakerKey}
        />
      );
    case 'phonics-sound-choice':
      return (
        <PhonicsSoundChoiceQuestion
          key={question.id}
          question={question}
          selectedIndex={currentAnswer?.selectedIndex ?? null}
          onSelectOption={onSubmitOption}
          speakerKey={speakerKey}
          onAudioLoadingChange={onAudioLoadingChange}
        />
      );
    case 'phonics-word-choice':
      return (
        <PhonicsWordChoiceQuestion
          key={question.id}
          question={question}
          selectedIndex={currentAnswer?.selectedIndex ?? null}
          onSelectOption={onSubmitOption}
          speakerKey={speakerKey}
          onAudioLoadingChange={onAudioLoadingChange}
        />
      );
    case 'phonics-final-choice':
    case 'phonics-blend-choice':
      return (
        <PhonicsEndingChoiceQuestion
          key={question.id}
          question={question}
          selectedIndex={currentAnswer?.selectedIndex ?? null}
          onSelectOption={onSubmitOption}
          speakerKey={speakerKey}
          onAudioLoadingChange={onAudioLoadingChange}
        />
      );
    case 'phonics-rhyme-choice':
      return (
        <PhonicsRhymeChoiceQuestion
          key={question.id}
          question={question}
          selectedIndex={currentAnswer?.selectedIndex ?? null}
          onSelectOption={onSubmitOption}
          speakerKey={speakerKey}
          onAudioLoadingChange={onAudioLoadingChange}
        />
      );
    case 'letter-tracing':
      return (
        /* CR-82 (D-22): the tracing body is a lazy chunk behind its own
           retryable boundary - a chunk failure degrades to a paper panel
           with "Thu lai" / "Bo qua cau nay", never a dead board. */
        <TracingChunkBoundary
          key={question.id}
          question={question}
          hasAnswered={currentAnswer !== null}
          onSubmit={onSubmitTracing ?? (() => {})}
          speakerKey={speakerKey}
          onAudioLoadingChange={onAudioLoadingChange}
          onDrawingChange={onDrawingChange}
        />
      );
  }
}

/**
 * US-10 table: the FeedbackPanel picture shows the correct word for the
 * five picture-bearing kinds. image-choice is excluded (its prompt already
 * IS the picture), picture-pair-matching has no single correct word, and
 * listening-fill-blank/pronunciation keep their existing feedback.
 */
/**
 * CR-16: the text of whatever the child actually picked/typed, so the
 * wrong-answer panel can show "Em chọn: X" next to the correct answer.
 * Returns undefined for kinds with no single pickable answer
 * (pair-matching, pronunciation).
 */
function pickedAnswerText(question: Question, currentAnswer: CurrentAnswer): string | undefined {
  switch (question.kind) {
    case 'image-choice':
    case 'listening-image-choice':
    case 'phonics-word-choice':
    case 'phonics-rhyme-choice':
    case 'phonics-sound-choice':
    case 'phonics-final-choice':
    case 'phonics-blend-choice':
      return currentAnswer.selectedIndex != null
        ? question.options[currentAnswer.selectedIndex]
        : undefined;
    case 'counting-image':
    case 'describe-and-choose-image':
      return currentAnswer.selectedIndex != null
        ? String(question.options[currentAnswer.selectedIndex])
        : undefined;
    case 'listening-fill-blank':
    case 'listening-sentence-fill-blank':
      return currentAnswer.typedAnswer || undefined;
    case 'extra-letter':
      return currentAnswer.selectedLetterIndex != null
        ? question.displayLetters[currentAnswer.selectedLetterIndex]
        : undefined;
    default:
      return undefined;
  }
}

/**
 * CR-82 (D-20): the kinds whose prompt EmojiVisual requests `animated`
 * (the 'prompt' slot candidate). image-choice additionally resolves a
 * curated photo, which wins the fallback chain over Lottie.
 */
function animatedPromptEmoji(question: Question): string | undefined {
  switch (question.kind) {
    case 'image-choice':
    case 'phonics-sound-choice':
    case 'phonics-final-choice':
    case 'phonics-blend-choice':
    case 'phonics-rhyme-choice':
      return question.emoji;
    default:
      return undefined;
  }
}

function feedbackPictureWordId(question: Question): string | undefined {
  switch (question.kind) {
    case 'extra-letter':
    case 'listening-sentence-fill-blank':
    case 'phonics-sound-choice':
    case 'phonics-final-choice':
    case 'phonics-blend-choice':
      return question.wordId;
    case 'counting-image':
      return question.promptWordId;
    case 'listening-image-choice':
    case 'describe-and-choose-image':
    case 'phonics-word-choice':
    case 'phonics-rhyme-choice':
      return question.optionWordIds[question.correctIndex];
    case 'letter-tracing':
      /* CR-82 (spec s12.5): the sheet picture is the exhibit word. */
      return question.exampleWordId;
    default:
      return undefined;
  }
}

/** CR-82 (spec s12.6): per-kind verdict headlines - tracing acknowledges
    completion instead of shaming a finished trace. */
const KIND_HEADLINES: Partial<Record<Question['kind'], { correct: string; wrong: string }>> = {
  'letter-tracing': {
    correct: 'Em tô đẹp quá!',
    wrong: 'Em tô xong rồi - lần sau mình tự tô hết nhé!',
  },
};

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  currentAnswer,
  onSubmitOption,
  onSubmitListening,
  onSubmitExtraLetter,
  onSubmitPronunciation,
  onSubmitPairMatching,
  onSubmitTracing,
  onNext,
  speakerKey,
  correctStreak = 0,
}: QuestionCardProps) {
  const hasAnswered = currentAnswer !== null;
  const { band, land } = useViewer();
  /* r22: the feedback zone renders as a bottom sheet at EVERY viewport
     height (not only <=420px) so mounting it can never push the answer
     zone off-screen. The card reserves matching bottom space so content
     behind the sheet stays reachable. pronunciation-recording renders
     its own in-flow panel - no sheet, no reserve. */
  const showFeedbackZone = hasAnswered && question.kind !== 'pronunciation-recording';
  const pictureWordId = feedbackPictureWordId(question);
  const pictureVisual = pictureWordId ? getWordVisual(pictureWordId) : undefined;

  /* CR-82 (spec s9.3): the sheet perch is a sibling layer of the fixed
     sheet wrapper - JS-decided at max-height:420px so exactly one mascot
     node exists (the inline headline mascot takes over there). */
  const shortLandscape = useMediaQuery('(max-height: 420px)');
  const sheetPerch = showFeedbackZone && !shortLandscape;

  /* CR-82 (D-15): the thinking-pose clock. The instruction-settled epoch
     arrives through the module channel (one speaker per question); the
     audio-loading flag is threaded from the question body like speakerKey. */
  const [idleStartAt, setIdleStartAt] = useState<number | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  /* spec s12.7: finger-down on the tracing canvas suppresses thinking. */
  const [isDrawing, setIsDrawing] = useState(false);
  useEffect(() => {
    setIdleStartAt(null);
    setAudioLoading(false);
    setIsDrawing(false);
  }, [question.id]);
  /* Captured at render - before any child mount effect can fire. A
     synchronous 'not-played' settle inside the child's mount effect
     precedes the subscription below (children effects run first); the
     buffered epoch check replays only settles that happened during
     THIS mount, so a stale settle from a previous question is ignored
     (external review r34-A5). */
  const mountEpochRef = useRef(Date.now());
  useEffect(() => {
    const unsubscribe = subscribeInstructionSettled(() => setIdleStartAt(Date.now()));
    const settled = lastInstructionSettle();
    if (settled && settled.epoch >= mountEpochRef.current) {
      setIdleStartAt(Date.now());
    }
    return unsubscribe;
  }, []);

  /* spec s9.5: first-question-mount preload of idle/happy/encouraging
     (force-cache, no-op on pre-round screens / jsdom). */
  useEffect(() => {
    preloadMascotAssets();
  }, []);

  const thinking = useThinkingPose({
    enabled: band === 'G12' && !hasAnswered && !isDrawing,
    resetKey: question.id,
    idleStartAt,
    audioLoading,
    /* spec s9.2 + CR-83: thinking re-arms the kind's demo hint - the
       instruction replay is gone now that instruction voice is disabled
       product-wide (it collided with listening audio and bled into the
       pronunciation mic). */
    onThinking: () => {
      rearmDemoHint(question.kind);
    },
  });

  /* CR-82 (D-20): this card is the single Lottie budget owner on question
     surfaces - prompt illustration, mascot, and the feedback picture all
     read slots from allocateLottie. */
  const reducedMotion = usePrefersReducedMotion();
  const promptEmoji = animatedPromptEmoji(question);
  const promptHasPhoto =
    question.kind === 'image-choice' && !!getWordVisual(question.wordId)?.imageUrl;
  const promptEligible = !!promptEmoji && !promptHasPhoto && hasLottie(toEmojiKey(promptEmoji));
  const feedbackEligible =
    !!pictureVisual && !pictureVisual.imageUrl && hasLottie(toEmojiKey(pictureVisual.emoji));
  const slots = allocateLottie({
    answered: hasAnswered,
    promptEligible,
    feedbackEligible,
    sheetPerch,
    reducedMotion,
  });

  const verdictMood = currentAnswer?.isCorrect
    ? correctStreak >= 3
      ? 'celebrating'
      : 'happy'
    : 'encouraging';

  /* CR-82 (spec s16.2): correct verdict fires the star-fly toward the
     LiveScore chip. Origin = the answered tile's rect when the active
     element still sits inside the card; otherwise the card centre. Fires
     exactly once per answered question. */
  const { fireStar } = useRewardFx();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const starFiredForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hasAnswered || !currentAnswer?.isCorrect) return;
    if (starFiredForRef.current === question.id) return;
    starFiredForRef.current = question.id;
    const card = cardRef.current;
    if (!card) return;
    const active = document.activeElement as HTMLElement | null;
    const origin =
      active && card.contains(active) ? active.getBoundingClientRect() : card.getBoundingClientRect();
    fireStar(origin);
    /* CR-82 (spec s16.3): the star chime is reward tier - queued 250ms
       behind the verdict ding, never overlapping it. */
    playSfx('star');
  }, [hasAnswered, currentAnswer, question.id, fireStar]);

  const nextButton = (
    <button
      type="button"
      data-testid="next-button"
      disabled={!hasAnswered}
      onClick={onNext}
      className={`mt-2 w-full sm:w-auto [@media(max-height:420px)]:mt-1 ${CONTINUE_BUTTON_CLASSNAME}`}
    >
      <span className="inline-flex items-center gap-1.5">Câu tiếp theo <IconArrowRight size={18} /></span>
    </button>
  );

  return (
    <BoardPerchContext.Provider value={!hasAnswered}>
      <LottieBudgetProvider slots={slots}>
    <div
      ref={cardRef}
      data-testid="question-card"
      data-question-kind={question.kind}
      data-count-direction={question.kind === 'counting-image' ? question.direction : undefined}
      data-description-type={question.kind === 'describe-and-choose-image' ? question.descriptionType : undefined}
      className={`relative flex min-h-0 flex-1 flex-col ${material.board} p-4 text-center [@media(max-height:420px)]:p-2 sm:p-6`}
      /* r23: inline style - the sm:p-6 / max-height:420px p-2 responsive
         variants emit after base pb-* utilities and would silently drop
         the feedback-sheet reservation at desktop widths/short heights.
         CR-82 (s9.3 rev2): +2.75rem while the sheet perch overhangs the
         sheet top so no answer tile sits behind the mascot. */
      style={
        showFeedbackZone
          ? { paddingBottom: `calc(min(40vh,320px) + ${sheetPerch ? '8.25rem' : '5.5rem'})` }
          : undefined
      }
    >
      {/* No own mx-auto/max-w-2xl/px-4 here (plan.md v9 fix) - BatchScreen's
          wrapper already provides that exact centering/padding, and this
          component is always rendered nested inside it; re-applying the
          same px-4 here was doubling the horizontal padding and shrinking
          the width available for wrapped tile rows on narrow phones. */}
      {/* CR-81/CR-82: land rim - the board's top edge carries the viewer's
          land flag color so each grade's board reads as "its" land
          (M3: 8px, rounded to the material.board radius). */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 h-2 rounded-t-[2rem] ${land.nightRim}`}
      />
      {/* CR-82 M3 (s7.3): the progress chip is now a journey trail on
          material.chrome - stepping-stone dots (or the track bar past 12
          questions) plus the kept "Câu x/y" text. */}
      <div
        className={`${material.chrome} mx-auto mb-2 inline-flex items-center gap-3 self-center px-3 py-1.5 [@media(max-height:420px)]:mb-1`}
      >
        <JourneyTrail current={questionNumber} total={totalQuestions} />
        <p data-testid="question-progress" className="text-sm font-bold text-amber-200">
          Câu {questionNumber}/{totalQuestions}
        </p>
      </div>

      {/* CR-82 (spec s9.3): board perch - Bé Heo sits on the board rim
          leaning over the instruction banner, `idle` by default and
          `thinking` on the D-15 G1-2 triggers. Unmounts the moment the
          feedback sheet mounts so the sheet perch is the only mascot on
          screen (AC-79.1 / one-mascot matrix). */}
      {!hasAnswered && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-9 left-4 z-10"
        >
          <Mascot mood={thinking ? 'thinking' : 'idle'} size="companion" />
        </span>
      )}

      {/* CR-79 C1: the body fills the card's free height (my-auto
          centers it; overflow-y keeps tiles reachable on short
          viewports) - no more dead bottom band on phones. */}
      <div className={QUESTION_BODY}>
        <div className={QUESTION_BODY_CENTER}>
          {renderQuestionBody(
            question,
            currentAnswer,
            onSubmitOption,
            onSubmitListening,
            onSubmitExtraLetter,
            onSubmitPronunciation,
            onSubmitPairMatching,
            onSubmitTracing,
            speakerKey,
            /* D-15: bodies forward their audio-loading state - the
               thinking pose debounces on it (>400ms). */
            setAudioLoading,
            /* spec s12.7: tracing's finger-down flag. */
            setIsDrawing,
          )}
        </div>
      </div>

      {/* pronunciation-recording renders its own complete feedback panel
          (transcript + score + explanation) - see PronunciationRecordingQuestion. */}
      {showFeedbackZone ? (
        /* CR-73 QuestionFrame s5.2 + s6 (r22 amendment): the feedback
           ZONE is the panel plus the Next control as one bottom-anchored
           unit. It is a fixed bottom sheet at every height - never in
           flow - so mounting it cannot push answers off-screen. Width
           matches the BatchScreen mx-auto max-w-2xl column. */
        /* CR-82 (s9.3 rev2 F4): the sheet perch is a SIBLING of the
           bounded FeedbackPanel inside this non-scrolling, non-clipping
           wrapper - protruding art would be clipped/scrolled inside the
           panel. The wrapper must keep overflow: visible. */
        <div
          data-testid="feedback-sheet"
          className="fixed inset-x-2 bottom-0 z-40 mx-auto max-w-[40rem] rounded-t-2xl bg-desk p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        >
          {sheetPerch && (
            <span
              aria-hidden="true"
              data-testid="sheet-perch"
              className="pointer-events-none absolute -top-11 right-4 z-10"
            >
              {/* CR-82 (spec s16.2): streak rings pulse BEHIND the perch
                  mascot (1 at streak 3, 2 at 5, 3 at 10). */}
              {currentAnswer.isCorrect && <StreakBurst streak={correctStreak} />}
              <span className="relative z-10 block">
                <Mascot mood={verdictMood} size="companion" />
              </span>
            </span>
          )}
          <FeedbackPanel
            kind={question.kind}
            isCorrect={currentAnswer.isCorrect}
            correctWord={getCorrectWord(question)}
            explanation={question.explanation}
            pickedAnswer={pickedAnswerText(question, currentAnswer)}
            fullSentence={
              question.kind === 'listening-sentence-fill-blank' ? question.sentence : undefined
            }
            picture={
              pictureVisual ? { emoji: pictureVisual.emoji, imageUrl: pictureVisual.imageUrl } : undefined
            }
            celebrate={correctStreak >= 3}
            streak={currentAnswer.isCorrect ? correctStreak : 0}
            mascotPlacement={sheetPerch ? 'none' : 'inline'}
            headlines={KIND_HEADLINES[question.kind]}
          />
          {nextButton}
        </div>
      ) : (
        <span className="block w-full self-center sm:w-auto">{nextButton}</span>
      )}
    </div>
      </LottieBudgetProvider>
    </BoardPerchContext.Provider>
  );
}
