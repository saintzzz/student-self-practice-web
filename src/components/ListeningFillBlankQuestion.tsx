import { useState, type FormEvent } from 'react';
import type { ListeningFillBlankQuestion as ListeningFillBlankQuestionType } from '../types';
import { speakWord } from '../lib/speech';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import AudioPlaybackWarning from './AudioPlaybackWarning';
import { SUBMIT_ANSWER_BUTTON_CLASSNAME } from './actionButtonStyle';
import ListenButtons from './ListenButtons';
import { InstructionSpeaker } from './InstructionSpeaker';
import { useViewer } from '../lib/viewer/ViewerContext';

const INSTRUCTION = 'Nghe và gõ từ em nghe được nhé!';

interface ListeningFillBlankQuestionProps {
  question: ListeningFillBlankQuestionType;
  hasAnswered: boolean;
  onSubmit: (typedAnswer: string) => void;
  /** kids-UX s3.2: round-scoped autoplay key for the instruction speaker. */
  speakerKey?: string;
}

export default function ListeningFillBlankQuestion({
  question,
  hasAnswered,
  onSubmit,
  speakerKey,
}: ListeningFillBlankQuestionProps) {
  const { band } = useViewer();
  const [inputValue, setInputValue] = useState('');
  const { hasPlayed, playbackFailed, play, playSlow } = useAudioPlayback((onStatus, speed) => speakWord(question.word, onStatus, speed), question.word);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (hasAnswered) return;
    onSubmit(inputValue);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-center gap-2">
        <p className="text-xl font-semibold text-amber-200">{INSTRUCTION}</p>
        <InstructionSpeaker text={INSTRUCTION} lang="vi-VN" autoplay={band === 'G12'} autoplayKey={speakerKey} />
      </div>
      <ListenButtons hasPlayed={hasPlayed} play={play} playSlow={playSlow} />
      {playbackFailed && <AudioPlaybackWarning />}
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <input
          type="text"
          data-testid="answer-input"
          value={inputValue}
          disabled={hasAnswered}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Gõ từ em nghe được..."
          className="min-h-[76px] w-full rounded-2xl border-4 border-[#2a3a5e] bg-gradient-to-b from-[#1d3465] to-[#162C55] px-5 py-4 text-2xl font-semibold text-white shadow-inner transition focus:border-amber-400/70 focus:outline-none focus:ring-4 focus:ring-amber-400/60 focus:shadow-[0_8px_20px_-8px_rgba(56,189,248,0.5)] disabled:bg-white/10 sm:w-64"
        />
        <button type="submit" data-testid="submit-answer-button" disabled={hasAnswered} className={SUBMIT_ANSWER_BUTTON_CLASSNAME}>
          Kiểm tra
        </button>
      </form>
    </div>
  );
}
