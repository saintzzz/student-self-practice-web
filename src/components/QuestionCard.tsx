import type { Question } from '../types';
import type { CurrentAnswer } from '../lib/practiceSession';
import { getCorrectWord } from '../lib/practiceSession';
import ImageChoiceQuestion from './ImageChoiceQuestion';
import ListeningFillBlankQuestion from './ListeningFillBlankQuestion';
import ListeningSentenceFillBlankQuestion from './ListeningSentenceFillBlankQuestion';
import ListeningImageChoiceQuestion from './ListeningImageChoiceQuestion';
import CountingImageQuestion from './CountingImageQuestion';
import ExtraLetterQuestion from './ExtraLetterQuestion';
import PronunciationRecordingQuestion from './PronunciationRecordingQuestion';
import DescribeAndChooseImageQuestion from './DescribeAndChooseImageQuestion';
import PicturePairMatchingQuestion from './PicturePairMatchingQuestion';
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

  return (
    <div
      data-testid="question-card"
      data-question-kind={question.kind}
      data-count-direction={question.kind === 'counting-image' ? question.direction : undefined}
      data-description-type={question.kind === 'describe-and-choose-image' ? question.descriptionType : undefined}
      className="py-2 text-center [@media(max-height:420px)]:py-1"
    >
      {/* No own mx-auto/max-w-2xl/px-4 here (plan.md v9 fix) - BatchScreen's
          wrapper already provides that exact centering/padding, and this
          component is always rendered nested inside it; re-applying the
          same px-4 here was doubling the horizontal padding and shrinking
          the width available for wrapped tile rows on narrow phones. */}
      <p
        data-testid="question-progress"
        className="mb-1 text-base font-bold text-sky-600 [@media(max-height:420px)]:mb-0"
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
        />
      )}

      <button
        type="button"
        data-testid="next-button"
        disabled={!hasAnswered}
        onClick={onNext}
        className={`mt-2 [@media(max-height:420px)]:mt-1 ${CONTINUE_BUTTON_CLASSNAME}`}
      >
        Câu tiếp theo →
      </button>
    </div>
  );
}
