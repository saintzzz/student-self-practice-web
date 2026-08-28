import { useState, type FormEvent } from 'react';
import type { ListeningSentenceFillBlankQuestion as ListeningSentenceFillBlankQuestionType } from '../types';
import { speakSentence } from '../lib/speech';

interface ListeningSentenceFillBlankQuestionProps {
  question: ListeningSentenceFillBlankQuestionType;
  hasAnswered: boolean;
  onSubmit: (typedAnswer: string) => void;
}

/**
 * Round 2 of the v5 Batch/Round model (plan.md "Round 2 - Listening
 * Sentence Fill-Blank"). Reuses the exact same play-audio-button /
 * answer-input / submit-answer-button / answer-feedback contract as the
 * older bare-word ListeningFillBlankQuestion - only the content is now a
 * full sentence with the target word blanked out.
 */
export default function ListeningSentenceFillBlankQuestion({
  question,
  hasAnswered,
  onSubmit,
}: ListeningSentenceFillBlankQuestionProps) {
  const [inputValue, setInputValue] = useState('');
  const [hasPlayed, setHasPlayed] = useState(false);

  function handlePlay(): void {
    speakSentence(question.sentence);
    setHasPlayed(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (hasAnswered) return;
    onSubmit(inputValue);
  }

  return (
    <div>
      <p className="mb-4 text-xl font-semibold text-sky-700">Nghe câu và điền từ còn thiếu nhé!</p>
      <p className="mb-6 text-3xl font-extrabold text-sky-900">{question.displaySentence}</p>
      <button
        type="button"
        data-testid="play-audio-button"
        onClick={handlePlay}
        className="mb-6 rounded-full bg-indigo-500 px-8 py-5 text-2xl font-bold text-white shadow-md transition hover:bg-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-400"
      >
        {hasPlayed ? '🔁 Nghe lại' : '🔊 Nghe'}
      </button>
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <input
          type="text"
          data-testid="answer-input"
          value={inputValue}
          disabled={hasAnswered}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Gõ từ còn thiếu..."
          className="w-full rounded-2xl border-4 border-sky-200 px-5 py-4 text-2xl font-semibold text-sky-900 focus:outline-none focus:ring-4 focus:ring-sky-500 disabled:bg-slate-100 sm:w-64"
        />
        <button
          type="submit"
          data-testid="submit-answer-button"
          disabled={hasAnswered}
          className="rounded-2xl bg-emerald-500 px-8 py-4 text-2xl font-bold text-white shadow-md transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Kiểm tra
        </button>
      </form>
    </div>
  );
}
