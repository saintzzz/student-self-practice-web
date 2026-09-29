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
}

function renderQuestionBody(
  question: Question,
  currentAnswer: CurrentAnswer | null,
  onSubmitOption: (index: number) => void,
  onSubmitListening: (typedAnswer: string) => void,
  onSubmitExtraLetter: (letterIndex: number) => void,
  onSubmitPronunciation: (transcript: string) => void,
  onSubmitPairMatching: (isCorrect: boolean) => void,
) {
  switch (question.kind) {
    case 'image-choice':
      return (
        <ImageChoiceQuestion
          key={question.id}
          question={question}
          selectedIndex={currentAnswer?.selectedIndex ?? null}
          onSelectOption={onSubmitOption}
        />
      );
    case 'counting-image':
      return (
        <CountingImageQuestion
          key={question.id}
          question={question}
          selectedIndex={currentAnswer?.selectedIndex ?? null}
          onSelectOption={onSubmitOption}
        />
      );
    case 'listening-fill-blank':
      return (
        <ListeningFillBlankQuestion
          key={question.id}
          question={question}
          hasAnswered={currentAnswer !== null}
          onSubmit={onSubmitListening}
        />
      );
    case 'listening-sentence-fill-blank':
      return (
        <ListeningSentenceFillBlankQuestion
          key={question.id}
          question={question}
          hasAnswered={currentAnswer !== null}
          onSubmit={onSubmitListening}
        />
      );
    case 'extra-letter':
      return (
        <ExtraLetterQuestion
          key={question.id}
          question={question}
          selectedLetterIndex={currentAnswer?.selectedLetterIndex ?? null}
          onSelectLetter={onSubmitExtraLetter}
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
        />
      );
    case 'describe-and-choose-image':
      return (
        <DescribeAndChooseImageQuestion
          key={question.id}
          question={question}
          selectedIndex={currentAnswer?.selectedIndex ?? null}
          onSelectOption={onSubmitOption}
        />
      );
    case 'listening-image-choice':
      return (
        <ListeningImageChoiceQuestion
          key={question.id}
          question={question}
          selectedIndex={currentAnswer?.selectedIndex ?? null}
          onSelectOption={onSubmitOption}
        />
      );
    case 'picture-pair-matching':
      return (
        <PicturePairMatchingQuestion
          key={question.id}
          question={question}
          hasAnswered={currentAnswer !== null}
          onSubmit={onSubmitPairMatching}
        />
      );
    case 'phonics-sound-choice':
      return (
        <PhonicsSoundChoiceQuestion
          key={question.id}
          question={question}
          selectedIndex={currentAnswer?.selectedIndex ?? null}
          onSelectOption={onSubmitOption}
        />
      );
    case 'phonics-word-choice':
      return (
        <PhonicsWordChoiceQuestion
          key={question.id}
          question={question}
          selectedIndex={currentAnswer?.selectedIndex ?? null}
          onSelectOption={onSubmitOption}
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
        />
      );
    case 'phonics-rhyme-choice':
      return (
        <PhonicsRhymeChoiceQuestion
          key={question.id}
          question={question}
          selectedIndex={currentAnswer?.selectedIndex ?? null}
          onSelectOption={onSubmitOption}
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
}: QuestionCardProps) {
  const hasAnswered = currentAnswer !== null;
  const pictureWordId = feedbackPictureWordId(question);
  const pictureVisual = pictureWordId ? getWordVisual(pictureWordId) : undefined;

  return (
    <div
      data-testid="question-card"
      data-question-kind={question.kind}
      data-count-direction={question.kind === 'counting-image' ? question.direction : undefined}
      data-description-type={question.kind === 'describe-and-choose-image' ? question.descriptionType : undefined}
      className="rounded-3xl bg-gradient-to-b from-white to-sky-50/60 p-4 text-center shadow-xl ring-1 ring-slate-200/70 [@media(max-height:420px)]:p-2 sm:p-6"
    >
      {/* No own mx-auto/max-w-2xl/px-4 here (plan.md v9 fix) - BatchScreen's
          wrapper already provides that exact centering/padding, and this
          component is always rendered nested inside it; re-applying the
          same px-4 here was doubling the horizontal padding and shrinking
          the width available for wrapped tile rows on narrow phones. */}
      <p
        data-testid="question-progress"
        className="mx-auto mb-2 inline-block rounded-full bg-sky-50 px-3 py-0.5 text-sm font-bold text-sky-700 ring-1 ring-sky-200 [@media(max-height:420px)]:mb-1"
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
      )}

      {/* pronunciation-recording renders its own complete feedback panel
          (transcript + score + explanation) - see PronunciationRecordingQuestion. */}
      {currentAnswer && question.kind !== 'pronunciation-recording' && (
        <FeedbackPanel
          kind={question.kind}
          isCorrect={currentAnswer.isCorrect}
          correctWord={getCorrectWord(question)}
          explanation={question.explanation}
          picture={
            pictureVisual ? { emoji: pictureVisual.emoji, imageUrl: pictureVisual.imageUrl } : undefined
          }
        />
      )}

      <button
        type="button"
        data-testid="next-button"
        disabled={!hasAnswered}
        onClick={onNext}
        className={`mt-2 w-full sm:w-auto [@media(max-height:420px)]:mt-1 ${CONTINUE_BUTTON_CLASSNAME}`}
      >
        Câu tiếp theo →
      </button>
    </div>
  );
}
