import { useAudioPlayback } from '../../hooks/useAudioPlayback';
import { speakWord } from '../../lib/speech';
import { EmojiVisual } from '../EmojiVisual';
import AudioPlaybackWarning from '../AudioPlaybackWarning';
import { IconSpeaker } from '../icons';
import type { DeckCard } from '../../lib/flashcards/deck';
import type { SwipeHandlers } from '../../hooks/useSwipeCard';
import type { KidBand } from '../../lib/ui/theme';
import {
  BTN_AUDIO,
  FLASH_CARD,
  FLASH_FLIP,
  FLASH_FLIP_BACK,
  FLASH_FACE_FRONT,
  FLASH_FACE_BACK,
  TYPE_CARD_GLYPH_PAPER,
  TYPE_LETTER_CARD_NAVY,
  TYPE_IPA_NAVY,
  TYPE_BODY_NAVY,
} from '../../lib/ui/tokens';

/**
 * CR-82 (spec s14.3): one flashcard - exactly one flip control
 * (`flashcard-flip`), the speaker a sibling so it can never flip, and the
 * inactive face isolated from the a11y tree (`inert` + `aria-hidden`;
 * unmounted under reduced motion, where no 3D is needed).
 *
 * Face content per band (s14.1):
 *  - G1-2 front = big picture (+ word audio autoplay, run by the deck);
 *    back = word + IPA + Vietnamese meaning.
 *  - G3-5 front = big word + audio button (recall first); back = picture
 *    + meaning.
 */
export interface FlashcardCardProps {
  card: DeckCard;
  band: KidBand;
  face: 'front' | 'back';
  index: number;
  total: number;
  onFlip: () => void;
  swipe: SwipeHandlers;
  /** Fly-out direction while the deck animates the committed card away. */
  exiting?: 'left' | 'right' | null;
  reducedMotion: boolean;
}

function clampDeg(dx: number): number {
  return Math.max(-12, Math.min(12, dx / 20));
}

export default function FlashcardCard({
  card,
  band,
  face,
  index,
  total,
  onFlip,
  swipe,
  exiting = null,
  reducedMotion,
}: FlashcardCardProps) {
  const audio = useAudioPlayback(
    (onStatus, speed) => speakWord(card.word, onStatus, speed),
    card.word,
  );

  /* Swipe transform lives on the group; the 3D flip lives on
     flashcard-flip. Dragging = direct manipulation (no transition, even
     reduced); fly-out 250ms ease-out-expo, spring-back 300ms ease-out-
     quint; reduced = 150ms opacity fade, no rotation (spec s14.4). */
  let transform = '';
  let transition = '';
  let opacity = 1;
  if (exiting) {
    if (reducedMotion) {
      transition = 'opacity 150ms ease-in-out-soft';
      opacity = 0;
    } else {
      transform = `translateX(${exiting === 'right' ? 130 : -130}%) rotate(${exiting === 'right' ? 12 : -12}deg)`;
      transition = 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1), opacity 250ms';
      opacity = 0;
    }
  } else if (swipe.dragging) {
    transform = `translateX(${swipe.dx}px)${reducedMotion ? '' : ` rotate(${clampDeg(swipe.dx)}deg)`}`;
  } else {
    transition = 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)'; // spring back (ease-out-quint)
  }

  const inactive = (which: 'front' | 'back') =>
    face !== which ? ({ inert: '', 'aria-hidden': true } as const) : {};

  const front = (
    <div className={FLASH_FACE_FRONT} {...inactive('front')}>
      {band === 'G12' ? (
        <>
          <EmojiVisual
            emoji={card.emoji}
            imageUrl={card.imageUrl}
            className="text-8xl leading-none"
          />
          {audio.playbackFailed && <AudioPlaybackWarning />}
        </>
      ) : (
        <>
          <span className={TYPE_CARD_GLYPH_PAPER}>{card.word}</span>
          {audio.playbackFailed && <AudioPlaybackWarning />}
        </>
      )}
    </div>
  );

  const back = (
    <div className={FLASH_FACE_BACK} {...inactive('back')}>
      {band === 'G12' ? (
        <>
          <span className={TYPE_LETTER_CARD_NAVY}>{card.word}</span>
          {card.ipa && <span className={TYPE_IPA_NAVY}>{card.ipa}</span>}
          <span className={TYPE_BODY_NAVY}>{card.explanation}</span>
        </>
      ) : (
        <>
          <EmojiVisual
            emoji={card.emoji}
            imageUrl={card.imageUrl}
            className="text-7xl leading-none"
          />
          <span className={TYPE_BODY_NAVY}>{card.explanation}</span>
        </>
      )}
    </div>
  );

  return (
    <div
      data-testid="flashcard-card"
      data-face={face}
      role="group"
      aria-roledescription="thẻ từ vựng"
      aria-label={`Thẻ ${index} trên ${total}`}
      className={`${FLASH_CARD} touch-pan-y`}
      style={{ transform: transform || undefined, transition: transition || undefined, opacity }}
      onPointerDown={swipe.onPointerDown}
      onPointerMove={swipe.onPointerMove}
      onPointerUp={swipe.onPointerUp}
      onPointerCancel={swipe.onPointerCancel}
      onLostPointerCapture={swipe.onLostPointerCapture}
    >
      <button
        type="button"
        data-testid="flashcard-flip"
        className={`${FLASH_FLIP}${face === 'back' ? ` ${FLASH_FLIP_BACK}` : ''}`}
        aria-label={face === 'front' ? 'Lật thẻ để xem mặt sau' : 'Lật thẻ để xem mặt trước'}
        onClick={(e) => {
          if (swipe.shouldSuppressClick(e.detail)) return;
          onFlip();
        }}
      >
        {/* Reduced motion drops the inactive face entirely - no 3D. */}
        {reducedMotion ? (face === 'front' ? front : back) : (<>{front}{back}</>)}
      </button>
      <button
        type="button"
        data-testid="flashcard-speaker"
        className={`${BTN_AUDIO} absolute right-3 top-3 z-10`}
        aria-label={`Nghe từ ${card.word}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          audio.play();
        }}
      >
        <IconSpeaker size={20} aria-hidden="true" />
        <span className="sr-only">{`Nghe từ ${card.word}`}</span>
      </button>
    </div>
  );
}
