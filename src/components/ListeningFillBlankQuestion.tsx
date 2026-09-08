import { useState, type FormEvent } from 'react';
import type { ListeningFillBlankQuestion as ListeningFillBlankQuestionType } from '../types';
import { speakWord } from '../lib/speech';
import { AUDIO_BUTTON_CLASSNAME, SUBMIT_ANSWER_BUTTON_CLASSNAME } from './actionButtonStyle';

interface ListeningFillBlankQuestionProps {
  question: ListeningFillBlankQuestionType;
  hasAnswered: boolean;
  onSubmit: (typedAnswer: string) => void;
}

export default function ListeningFillBlankQuestion({
  question,
  hasAnswered,
  onSubmit,
}: ListeningFillBlankQuestionProps) {
  const [inputValue, setInputValue] = useState('');
  const [hasPlayed, setHasPlayed] = useState(false);

  function handlePlay(): void {
    speakWord(question.word);
    setHasPlayed(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (hasAnswered) return;
    onSubmit(inputValue);
  }

  return (
    <div>
      <p className="mb-2 text-xl font-semibold text-sky-700">Nghe và gõ từ em nghe được nhé!</p>
      <button
        type="button"
        data-testid="play-audio-button"
        onClick={handlePlay}
        className={`mb-3 ${AUDIO_BUTTON_CLASSNAME}`}
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
          placeholder="Gõ từ em nghe được..."
          className="min-h-[76px] w-full rounded-2xl border-4 border-sky-200 px-5 py-4 text-2xl font-semibold text-sky-900 focus:outline-none focus:ring-4 focus:ring-sky-500 disabled:bg-slate-100 sm:w-64"
        />
        <button type="submit" data-testid="submit-answer-button" disabled={hasAnswered} className={SUBMIT_ANSWER_BUTTON_CLASSNAME}>
          Kiểm tra
        </button>
      </form>
    </div>
  );
}
