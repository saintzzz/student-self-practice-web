import { useState } from 'react';
import type { ListeningImageChoiceQuestion as ListeningImageChoiceQuestionType } from '../types';
import { speakWord } from '../lib/speech';
import { getOptionButtonClassName } from './optionButtonStyle';
import { AUDIO_BUTTON_CLASSNAME } from './actionButtonStyle';

interface ListeningImageChoiceQuestionProps {
  question: ListeningImageChoiceQuestionType;
  selectedIndex: number | null;
  onSelectOption: (index: number) => void;
}

/**
 * Round 2 addition (plan.md v8 "Round 2 Addition: Listening Image-Choice").
 * TTS speaks the target word; the student picks the matching image from 4
 * options - no typing. Reuses the same 4-option shell and `option-{index}`
 * testid as ImageChoiceQuestion/CountingImageQuestion, just with the prompt
 * and options reversed (audio prompt, image answer instead of image prompt,
 * text answer).
 */
export default function ListeningImageChoiceQuestion({
  question,
  selectedIndex,
  onSelectOption,
}: ListeningImageChoiceQuestionProps) {
  const [hasPlayed, setHasPlayed] = useState(false);
  const hasAnswered = selectedIndex !== null;

  function handlePlay(): void {
    speakWord(question.word);
    setHasPlayed(true);
  }

  return (
    <div>
      <p className="mb-2 text-xl font-semibold text-sky-700">Nghe từ rồi chọn đúng hình nhé!</p>
      <button
        type="button"
        data-testid="play-audio-button"
        onClick={handlePlay}
        className={`mb-3 ${AUDIO_BUTTON_CLASSNAME}`}
      >
        {hasPlayed ? '🔁 Nghe lại' : '🔊 Nghe'}
      </button>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {question.options.map((emoji, index) => (
          <button
            key={`option-${index}-${emoji}`}
            type="button"
            data-testid={`option-${index}`}
            disabled={hasAnswered}
            onClick={() => onSelectOption(index)}
            className={getOptionButtonClassName(index, selectedIndex, question.correctIndex)}
          >
            <span aria-hidden="true" className="text-6xl">
              {emoji}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
