import { AUDIO_BUTTON_CLASSNAME } from './actionButtonStyle';

interface ListenButtonsProps {
  hasPlayed: boolean;
  play: () => void;
  playSlow: () => void;
}

/**
 * Shared listen controls for every audio question kind. After the first
 * play a smaller "Nghe chậm" companion appears - field feedback showed
 * kids could not catch the word even at the reduced default rate, so
 * replaying one notch slower is always one tap away.
 */
export default function ListenButtons({ hasPlayed, play, playSlow }: ListenButtonsProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        data-testid="play-audio-button"
        onClick={play}
        className={AUDIO_BUTTON_CLASSNAME}
      >
        {hasPlayed ? '🔁 Nghe lại' : '🔊 Nghe'}
      </button>
      {hasPlayed && (
        <button
          type="button"
          data-testid="play-slow-button"
          onClick={playSlow}
          className="inline-flex min-h-[56px] items-center justify-center rounded-full bg-slate-700/80 px-5 py-2 text-lg font-bold text-sky-200 ring-1 ring-sky-400/40 transition hover:bg-slate-600/80 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 focus:outline-none focus:ring-4 focus:ring-sky-400"
        >
          🐢 Nghe chậm
        </button>
      )}
    </div>
  );
}
