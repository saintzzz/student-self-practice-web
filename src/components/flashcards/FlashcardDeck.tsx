import { useEffect, useRef, useState } from 'react';
import { useSwipeCard, type SwipeDirection } from '../../hooks/useSwipeCard';
import { speakWord } from '../../lib/speech';
import { playSfx } from '../../lib/sfx';
import Mascot, { type MascotMood } from '../Mascot';
import { IconCheck, IconRefresh } from '../icons';
import type { DeckCard, DeckRating } from '../../lib/flashcards/deck';
import type { KidBand } from '../../lib/ui/theme';
import FlashcardCard from './FlashcardCard';
import {
  BTN_FLASH_AGAIN,
  BTN_FLASH_KNOWN,
  FLASH_SWIPE_LABEL_AGAIN,
  FLASH_SWIPE_LABEL_KNOWN,
} from '../../lib/ui/tokens';

const EXIT_MS = 250;
const EXIT_REDUCED_MS = 150;
const MOOD_MS = 600;

/**
 * CR-82 (spec s14.3/s14.4): the card stack + decision controls.
 * Swipe, the two always-visible buttons and ArrowLeft/ArrowRight all
 * resolve to the same `onRate` (WCAG 2.5.7 - a swipe is never the only
 * path). `flashcard-live` (polite) announces flips and saved ratings;
 * the D-16 companion mascot perches on the stack's top-left edge and
 * pulses happy/encouraging for 600ms after each decision.
 */
export interface FlashcardDeckProps {
  card: DeckCard;
  index: number;
  total: number;
  band: KidBand;
  reducedMotion: boolean;
  onRate: (rating: DeckRating) => void;
}

export default function FlashcardDeck({ card, index, total, band, reducedMotion, onRate }: FlashcardDeckProps) {
  const [face, setFace] = useState<'front' | 'back'>('front');
  const [exiting, setExiting] = useState<SwipeDirection | null>(null);
  const [mood, setMood] = useState<MascotMood>('idle');
  const [announcement, setAnnouncement] = useState('');
  const ratedOnceRef = useRef(false);
  const moodTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const decide = (dir: SwipeDirection) => {
    if (exiting) return;
    ratedOnceRef.current = true;
    setExiting(dir);
    const rating = dir === 'right' ? 'known' : 'again';
    setMood(rating === 'known' ? 'happy' : 'encouraging');
    setAnnouncement(`Đã lưu: ${rating === 'known' ? 'nhớ rồi' : 'ôn lại'}.`);
    clearTimeout(moodTimer.current);
    moodTimer.current = setTimeout(() => setMood('idle'), MOOD_MS);
    clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(
      () => {
        setExiting(null);
        setFace('front');
        onRate(rating);
      },
      reducedMotion ? EXIT_REDUCED_MS : EXIT_MS,
    );
  };

  const swipe = useSwipeCard({
    enabled: !exiting,
    onCommit: decide,
  });

  /* G1-2 front = picture + word audio autoplay (spec s14.1). */
  useEffect(() => {
    if (band === 'G12') speakWord(card.word);
  }, [band, card.wordId, card.word]);

  /* Focus moves to the next card's flip control after a decision. */
  useEffect(() => {
    if (!ratedOnceRef.current) return;
    document.querySelector<HTMLElement>('[data-testid="flashcard-flip"]')?.focus();
  }, [card.wordId]);

  useEffect(
    () => () => {
      clearTimeout(moodTimer.current);
      clearTimeout(exitTimer.current);
    },
    [],
  );

  const flip = () => {
    const next = face === 'front' ? 'back' : 'front';
    setFace(next);
    /* CR-82 (spec s16.3): flip sound - ui tier, dropped while speech or
       a verdict/reward is playing. */
    playSfx('flip');
    setAnnouncement(
      next === 'back'
        ? `Mặt sau: ${card.word} - ${card.explanation}`
        : `Mặt trước: ${card.word}`,
    );
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      decide('right');
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      decide('left');
    }
  };

  const g345Floor = band === 'G345' ? ' !min-h-[64px]' : '';
  const knownOpacity = swipe.dx > 0 ? Math.min(1, swipe.dx / 90) : 0;
  const againOpacity = swipe.dx < 0 ? Math.min(1, -swipe.dx / 90) : 0;

  return (
    <div onKeyDown={onKeyDown}>
      <div aria-live="polite" data-testid="flashcard-live" className="sr-only">
        {announcement}
      </div>

      {/* Stack: active card + up to two behind it (offset 6px,
          scale .96/.92, decorative only). */}
      <div className="relative mx-auto w-[min(84vw,360px)]">
        <span aria-hidden="true" className="pointer-events-none absolute -top-9 left-2 z-20">
          <Mascot mood={mood} size="companion" />
        </span>
        {index + 2 <= total && (
          <div
            aria-hidden="true"
            className="absolute inset-0 translate-y-2 scale-[0.92] rounded-[2rem] bg-amber-100/50 ring-1 ring-amber-200/50"
          />
        )}
        {index + 1 <= total && (
          <div
            aria-hidden="true"
            className="absolute inset-0 translate-y-1.5 scale-[0.96] rounded-[2rem] bg-amber-100/80 ring-1 ring-amber-200/70"
          />
        )}
        <div className="relative">
          <FlashcardCard
            card={card}
            band={band}
            face={face}
            index={index}
            total={total}
            onFlip={flip}
            swipe={swipe}
            exiting={exiting}
            reducedMotion={reducedMotion}
          />
          {swipe.dx > 0 && (
            <span className={FLASH_SWIPE_LABEL_KNOWN} style={{ opacity: knownOpacity }} aria-hidden="true">
              <IconCheck size={18} /> Nhớ rồi
            </span>
          )}
          {swipe.dx < 0 && (
            <span className={FLASH_SWIPE_LABEL_AGAIN} style={{ opacity: againOpacity }} aria-hidden="true">
              <IconRefresh size={16} /> Ôn lại
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          data-testid="flashcard-again"
          className={`${BTN_FLASH_AGAIN}${g345Floor}`}
          onClick={() => decide('left')}
          disabled={!!exiting}
        >
          <IconRefresh size={18} aria-hidden="true" /> Ôn lại
        </button>
        <button
          type="button"
          data-testid="flashcard-known"
          className={`${BTN_FLASH_KNOWN}${g345Floor}`}
          onClick={() => decide('right')}
          disabled={!!exiting}
        >
          <IconCheck size={18} aria-hidden="true" /> Em nhớ rồi
        </button>
      </div>
    </div>
  );
}
