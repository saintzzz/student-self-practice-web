import { useState } from 'react';
import type { CountingImageOption, DescribeAndChooseImageQuestion as DescribeAndChooseImageQuestionType } from '../types';
import { speakSentence } from '../lib/speech';
import { getOptionButtonClassName } from './optionButtonStyle';

interface DescribeAndChooseImageQuestionProps {
  question: DescribeAndChooseImageQuestionType;
  selectedIndex: number | null;
  onSelectOption: (index: number) => void;
}

function repeatedEmoji(option: CountingImageOption): string {
  return option.emoji.repeat(option.count);
}

/**
 * Round 4 of the v5/v6 Batch/Round model (plan.md "Round 4 - Describe and
 * Choose Image"). The description sentence is spoken via TTS and shown on
 * screen; the 4 options always render as repeated-emoji images (same shell
 * as CountingImageQuestion's count-to-image direction), reusing
 * `option-{index}` and the shared correct/incorrect option styling.
 */
export default function DescribeAndChooseImageQuestion({
  question,
  selectedIndex,
  onSelectOption,
}: DescribeAndChooseImageQuestionProps) {
  const [hasPlayed, setHasPlayed] = useState(false);
  const hasAnswered = selectedIndex !== null;

  function handlePlay(): void {
    speakSentence(question.sentence);
    setHasPlayed(true);
  }

  return (
    <div>
      <p className="mb-4 text-xl font-semibold text-sky-700">Nghe hoặc đọc câu rồi chọn hình đúng nhé!</p>
      <p className="mb-6 text-3xl font-extrabold text-sky-900">{question.sentence}</p>
      <button
        type="button"
        data-testid="play-audio-button"
        onClick={handlePlay}
        className="mb-6 rounded-full bg-indigo-500 px-8 py-5 text-2xl font-bold text-white shadow-md transition hover:bg-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-400"
      >
        {hasPlayed ? '🔁 Nghe lại' : '🔊 Nghe'}
      </button>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {question.options.map((option, index) => (
          <button
            key={`${option.word}-${option.count}`}
            type="button"
            data-testid={`option-${index}`}
            disabled={hasAnswered}
            onClick={() => onSelectOption(index)}
            className={getOptionButtonClassName(index, selectedIndex, question.correctIndex)}
          >
            <span aria-hidden="true" className="text-4xl leading-relaxed">
              {repeatedEmoji(option)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
