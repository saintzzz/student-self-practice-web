import type { Question } from '../types';
import type { CurrentAnswer } from '../lib/practiceSession';
import { getCorrectWord } from '../lib/practiceSession';
import { getWordVisual } from '../lib/emoji/wordVisual';
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
import FeedbackPanel from './FeedbackPanel';
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
  onNext: () => void;
  /**
   * kids-UX (design s3.2): round-scoped speaker key - forwarded to every
   * question body so its instruction speaker autoplays once per round
   * (all grades, headless - no speaker button).
   */
  speakerKey?: string;
}

function renderQuestionBody(
  question: Question,
  currentAnswer: CurrentAnswer | null,
  onSubmitOption: (index: number) => void,
  onSubmitListening: (typedAnswer: string) => void,
  onSubmitExtraLetter: (letterIndex: number) => void,
  onSubmitPronunciation: (transcript: string) => void,
  onSubmitPairMatching: (isCorrect: boolean) => void,
  speakerKey?: string,
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
    default:
      return undefined;
  }
}

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
  onNext,
  speakerKey,
}: QuestionCardProps) {
  const hasAnswered = currentAnswer !== null;
  /* r22: the feedback zone renders as a bottom sheet at EVERY viewport
     height (not only <=420px) so mounting it can never push the answer
     zone off-screen. The card reserves matching bottom space so content
     behind the sheet stays reachable. pronunciation-recording renders
     its own in-flow panel - no sheet, no reserve. */
  const showFeedbackZone = hasAnswered && question.kind !== 'pronunciation-recording';
  const pictureWordId = feedbackPictureWordId(question);
  const pictureVisual = pictureWordId ? getWordVisual(pictureWordId) : undefined;

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
    <div
      data-testid="question-card"
      data-question-kind={question.kind}
      data-count-direction={question.kind === 'counting-image' ? question.direction : undefined}
      data-description-type={question.kind === 'describe-and-choose-image' ? question.descriptionType : undefined}
      className={`rounded-3xl bg-gradient-to-b from-[#162C55] to-[#0E1F42] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_20px_40px_-16px_rgba(0,0,0,0.6)] ring-1 ring-[#2a3a5e] [@media(max-height:420px)]:p-2 sm:p-6 ${
        showFeedbackZone ? 'pb-[calc(min(40vh,320px)+5.5rem)]' : ''
      }`}
    >
      {/* No own mx-auto/max-w-2xl/px-4 here (plan.md v9 fix) - BatchScreen's
          wrapper already provides that exact centering/padding, and this
          component is always rendered nested inside it; re-applying the
          same px-4 here was doubling the horizontal padding and shrinking
          the width available for wrapped tile rows on narrow phones. */}
      <p
        data-testid="question-progress"
        className="mx-auto mb-2 inline-block rounded-full bg-amber-500/15 px-3 py-0.5 text-sm font-bold text-amber-200 ring-1 ring-amber-400/30 [@media(max-height:420px)]:mb-1"
      >
        Câu {questionNumber}/{totalQuestions}
      </p>

      {renderQuestionBody(
        question,
        currentAnswer,
        onSubmitOption,
        onSubmitListening,
        onSubmitExtraLetter,
        onSubmitPronunciation,
        onSubmitPairMatching,
      speakerKey,
    )}

      {/* pronunciation-recording renders its own complete feedback panel
          (transcript + score + explanation) - see PronunciationRecordingQuestion. */}
      {showFeedbackZone ? (
        /* CR-73 QuestionFrame s5.2 + s6 (r22 amendment): the feedback
           ZONE is the panel plus the Next control as one bottom-anchored
           unit. It is a fixed bottom sheet at every height - never in
           flow - so mounting it cannot push answers off-screen. Width
           matches the BatchScreen mx-auto max-w-2xl column. */
        <div className="fixed inset-x-2 bottom-0 z-40 mx-auto max-w-[40rem] rounded-t-2xl bg-[#0d1b26] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
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
          />
          {nextButton}
        </div>
      ) : (
        nextButton
      )}
    </div>
  );
}
