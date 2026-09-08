import { useState, type FormEvent } from 'react';
import type { ListeningSentenceFillBlankQuestion as ListeningSentenceFillBlankQuestionType } from '../types';
import { speakSentence } from '../lib/speech';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import AudioPlaybackWarning from './AudioPlaybackWarning';
import { AUDIO_BUTTON_CLASSNAME, SUBMIT_ANSWER_BUTTON_CLASSNAME } from './actionButtonStyle';

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
  const { hasPlayed, playbackFailed, play } = useAudioPlayback((onStatus) =>
    speakSentence(question.sentence, onStatus),
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (hasAnswered) return;
    onSubmit(inputValue);
  }

  return (
    <div>
      <p className="mb-2 text-xl font-semibold text-sky-700">Nghe câu và điền từ còn thiếu nhé!</p>
      <p className="mb-3 text-3xl font-extrabold text-sky-900">{question.displaySentence}</p>
      <button
        type="button"
        data-testid="play-audio-button"
        onClick={play}
        className={`mb-3 ${AUDIO_BUTTON_CLASSNAME}`}
      >
        {hasPlayed ? '🔁 Nghe lại' : '🔊 Nghe'}
      </button>
      {playbackFailed && <AudioPlaybackWarning />}
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <input
          type="text"
          data-testid="answer-input"
          value={inputValue}
          disabled={hasAnswered}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Gõ từ còn thiếu..."
          className="min-h-[76px] w-full rounded-2xl border-4 border-sky-200 px-5 py-4 text-2xl font-semibold text-sky-900 focus:outline-none focus:ring-4 focus:ring-sky-500 disabled:bg-slate-100 sm:w-64"
        />
        <button type="submit" data-testid="submit-answer-button" disabled={hasAnswered} className={SUBMIT_ANSWER_BUTTON_CLASSNAME}>
          Kiểm tra
        </button>
      </form>
    </div>
  );
}
