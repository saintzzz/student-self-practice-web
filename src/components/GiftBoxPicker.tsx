import { useEffect, useRef, useState } from 'react';
import { grantHomeItem, isObjectiveGranted, ownedHomeItems, type HomeItemResult } from '../lib/engagement/store';
import { HOME_ITEMS } from '../data/homeItems';
import { GIFT_BOX } from '../lib/ui/tokens';
import { EmojiVisual } from './EmojiVisual';
import { useLottieSlot } from './fx/LottieBudget';
import { InstructionSpeaker } from './InstructionSpeaker';

interface GiftBoxPickerProps {
  /**
   * The reward-moment identity (a sticker id such as 'first-batch' or
   * 'star-hoard'). `grantHomeItem` keys the grant on it, so a remount /
   * replay of the same summary replays the SAME item instead of granting
   * again (AC-4.4).
   */
  stickerId: string;
  /** Fires once when the pick is settled (fresh pick or replayed grant). */
  onDone?: () => void;
}

const BOX_COUNT = 3;

/**
 * kids-UX (design-kids-ux s3.5.b, AC-4.2/4.4): the pick-1-of-3 gift-box
 * moment. Three identical gold boxes; tapping one deterministically grants
 * ONE free cosmetic home item from `HOME_ITEMS` - the other two boxes fade
 * and their contents are never revealed (no loot-box FOMO, Ruling R-04).
 *
 * alreadyGranted path: if `gift:<stickerId>` is already in the store the
 * previously granted item shows immediately - replays never re-open a gift.
 * An exhausted pool renders nothing (the sticker chips above still show).
 */
export default function GiftBoxPicker({ stickerId, onDone }: GiftBoxPickerProps) {
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<HomeItemResult | null>(null);
  const [poolEmpty] = useState(() => ownedHomeItems().length >= HOME_ITEMS.length);
  const doneFired = useRef(false);
  /* CR-82 (D-20): the reward illustration animates only when the screen
     allocator grants the 'reward' slot (BatchSummary: mascot + reward = 2). */
  const rewardSlot = useLottieSlot('reward');

  /* Replay path: this sticker already granted a home item - skip the offer
     and show the stored item straight away (AC-4.4). */
  useEffect(() => {
    if (result || !isObjectiveGranted(`gift:${stickerId}`)) return;
    const replay = grantHomeItem(stickerId, 0);
    if (replay) setResult(replay);
  }, [stickerId, result]);

  useEffect(() => {
    if (result && !doneFired.current) {
      doneFired.current = true;
      onDone?.();
    }
  }, [result, onDone]);

  function handlePick(index: number): void {
    if (result) return;
    const granted = grantHomeItem(stickerId, index);
    if (!granted) return; // pool exhausted - the offer simply has no gift.
    setPickedIndex(index);
    setResult(granted);
  }

  if (poolEmpty) return null;

  return (
    <div className="mt-4 flex flex-col items-center">
      {!result && (
        <div className="flex items-center justify-center gap-2">
          <p className="text-xl font-semibold text-amber-200">Em mở được quà! Chọn một hộp quà nhé!</p>
          <InstructionSpeaker
            text="Em mở được quà! Chọn một hộp quà nhé!"
            lang="vi-VN"

            autoplayKey={`gift-${stickerId}`}
          />
        </div>
      )}
      <div role="group" aria-label="Chọn một hộp quà" className="mt-3 flex items-center justify-center gap-4">
        {Array.from({ length: BOX_COUNT }, (_, index) => {
          const picked = index === pickedIndex;
          const faded = result !== null && !picked;
          return (
            <button
              key={index}
              type="button"
              data-testid={`gift-box-${index}`}
              aria-label={picked && result ? result.item.nameVi : `Hộp quà ${index + 1}`}
              disabled={result !== null}
              onClick={() => handlePick(index)}
              className={`${GIFT_BOX} ${result ? '' : 'chest-wiggle'} ${faded ? 'opacity-40' : ''}`}
              style={result ? undefined : { animationDelay: `${index * 150}ms` }}
            >
              {/* Only the PICKED box ever reveals its item - the other two
                  stay sealed so there is no "you missed X" moment (R-04). */}
              <EmojiVisual emoji={picked && result ? result.item.emoji : '🎁'} />
            </button>
          );
        })}
      </div>
      {result && (
        <div data-testid="gift-reveal" aria-live="polite" className="mt-4 flex flex-col items-center">
          <span className="sr-only">Em nhận được {result.item.nameVi}!</span>
          <div className="flex items-center justify-center gap-3 rounded-3xl bg-amber-500/15 px-6 py-4 ring-1 ring-amber-400/40">
            <span className="text-5xl" aria-hidden="true">
              <EmojiVisual emoji={result.item.emoji} animated={rewardSlot} variant="block" />
            </span>
            <p className="text-xl font-bold text-amber-100">
              {result.item.nameVi} đã vào nhà của em!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
