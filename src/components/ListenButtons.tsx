import { AUDIO_BUTTON_CLASSNAME } from './actionButtonStyle';
import { IconRefresh, IconSpeaker } from './icons';
import { EmojiVisual } from './EmojiVisual';

interface ListenButtonsProps {
  hasPlayed: boolean;
  play: () => void;
  playSlow: () => void;
}

/** CR-145 (F-07): the "Nghe chậm" button, shared by every audio question
    kind - the phonics kinds used to copy-paste it 4 times. */
export function PlaySlowButton({ playSlow }: { playSlow: () => void }) {
  return (
    <button
      type="button"
      data-testid="play-slow-button"
      onClick={playSlow}
      className="inline-flex min-h-[56px] items-center justify-center rounded-full bg-slate-700/80 px-5 py-2 text-lg font-bold text-sky-200 ring-1 ring-sky-400/40 transition hover:bg-slate-600/80 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 focus:outline-none focus:ring-4 focus:ring-sky-400"
    >
      <EmojiVisual emoji="🐢" variant="inline" /> Nghe chậm
    </button>
  );
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
        {hasPlayed ? <><IconRefresh size={18} /> Nghe lại</> : <><IconSpeaker size={18} /> Nghe</>}
      </button>
      {hasPlayed && <PlaySlowButton playSlow={playSlow} />}
    </div>
  );
}
