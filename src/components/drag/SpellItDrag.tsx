import { useCallback, useEffect, useState } from 'react';
import type { SpellTile } from '../../types';
import { useDragTile } from '../../hooks/useDragTile';
import { playSfx } from '../../lib/sfx';
import { SUBMIT_ANSWER_BUTTON_CLASSNAME } from '../actionButtonStyle';
import PressableOptionButton from '../PressableOptionButton';
import { material, SPELL_SLOT, SPELL_SLOT_TARGET, SPELL_TILE } from '../../lib/ui/tokens';

/**
 * CR-82 (DESIGN-SPEC-v5 s13, ARCHITECTURE-v5 s4.3): the G1-2 Spell-it
 * surface - hear a word, place letter tiles into the slots to build it.
 * Drag, tap and keyboard all reach the same placement state (WCAG 2.5.7):
 * - tap a bank tile -> it lands in the first empty slot;
 * - tap a filled slot -> the tile returns to the bank;
 * - drag a bank tile onto an empty slot -> place; onto a filled slot -> swap;
 * - drag a placed tile onto the bank -> return it;
 * - Enter/Space on a tile places; Backspace removes the last placed tile.
 * Judging is unchanged: the composed string leaves through
 * `onSubmit` -> `onSubmitListening` -> `submitListeningAnswer`.
 */
export interface SpellItDragProps {
  /** Payload `question.spell.tiles` (seeded by the question id). */
  tiles: readonly SpellTile[];
  /** Word length - number of letter slots. */
  slotCount: number;
  /** hasAnswered - the judged state disables everything. */
  disabled: boolean;
  reducedMotion: boolean;
  onSubmit: (composed: string) => void;
}

export default function SpellItDrag({ tiles, slotCount, disabled, onSubmit }: SpellItDragProps) {
  /* placement[slot] = bank index of the tile in that slot (null = empty). */
  const [placement, setPlacement] = useState<readonly (number | null)[]>(() =>
    Array<number | null>(slotCount).fill(null),
  );
  const [announcement, setAnnouncement] = useState('');

  const tileInSlot = useCallback(
    (bankIndex: number): number | null => {
      const at = placement.indexOf(bankIndex);
      return at === -1 ? null : at;
    },
    [placement],
  );

  const firstEmptySlot = placement.indexOf(null);
  const allFilled = firstEmptySlot === -1;
  const enabled = !disabled;

  const placeTile = useCallback(
    (bankIndex: number, slotIndex: number) => {
      setPlacement((prev) => {
        const next = [...prev];
        /* Swap (spec s13.3): an occupied slot's tile returns to the bank
           before the incoming tile takes the slot. `placement` is
           slot->bank, so overwriting already "returns" it. */
        next[slotIndex] = bankIndex;
        return next;
      });
      const letter = tiles[bankIndex]?.letter ?? '';
      setAnnouncement(`Đã đặt chữ ${letter} vào ô ${slotIndex + 1}`);
      /* CR-82 (spec s16.3): tile drop pop - ui tier, dropped silently
         while a verdict/reward or speech is playing. */
      playSfx('pop');
    },
    [tiles],
  );

  const removeFromSlot = useCallback(
    (slotIndex: number) => {
      const bankIndex = placement[slotIndex];
      if (bankIndex === null || bankIndex === undefined) return;
      setPlacement((prev) => {
        const next = [...prev];
        next[slotIndex] = null;
        return next;
      });
      setAnnouncement(`Đã trả chữ ${tiles[bankIndex]?.letter ?? ''} về khay`);
    },
    [placement, tiles],
  );

  /* Bank tiles -> slot targets (cross-namespace: bank index N may drop
     on slot N). Dropping over no target just springs back - the tile
     stays in the bank. */
  const bankDrag = useDragTile({
    enabled,
    targetAttr: 'data-slot-index',
    crossNamespace: true,
    onDrop: (src, dst) => placeTile(src, dst),
    onDropOutside: () => {},
    ghostClassName: `${SPELL_TILE} flex items-center justify-center`,
    renderGhost: (src) => tiles[src]?.letter ?? '',
  });

  /* Placed tiles -> the bank zone returns them. */
  const slotDrag = useDragTile({
    enabled,
    targetAttr: 'data-bank-drop',
    onDrop: (src) => removeFromSlot(src),
    onDropOutside: () => {},
    ghostClassName: `${SPELL_TILE} flex items-center justify-center`,
    renderGhost: (src) => {
      const bankIndex = placement[src];
      return bankIndex === null || bankIndex === undefined ? '' : tiles[bankIndex]?.letter ?? '';
    },
  });

  function handleTileClick(bankIndex: number, detail: number): void {
    if (!enabled || bankDrag.shouldSuppressClick(detail)) return;
    if (tileInSlot(bankIndex) !== null) return;
    const slot = placement.indexOf(null);
    if (slot === -1) return;
    placeTile(bankIndex, slot);
  }

  function handleSlotClick(slotIndex: number, detail: number): void {
    if (!enabled || slotDrag.shouldSuppressClick(detail)) return;
    removeFromSlot(slotIndex);
  }

  /* Backspace removes the last placed tile (spec s13.3). Listening at
     document level because tapping a tile unmounts it (the dashed hole
     replaces the button) and focus falls back to <body>. */
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Backspace') return;
      for (let i = placement.length - 1; i >= 0; i -= 1) {
        if (placement[i] !== null && placement[i] !== undefined) {
          e.preventDefault();
          removeFromSlot(i);
          return;
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [enabled, placement, removeFromSlot]);

  const composed = allFilled
    ? placement.map((bankIndex) => tiles[bankIndex!]!.letter).join('')
    : '';

  return (
    <div>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>

      {/* Letter slots - one line, floored at 48px (spec s13.4 cap). */}
      <div className="mb-4 flex justify-center gap-1.5" role="group" aria-label="Các ô chữ">
        {Array.from({ length: slotCount }, (_, i) => {
          const bankIndex = placement[i];
          const filled = bankIndex !== null && bankIndex !== undefined;
          const letter = filled ? tiles[bankIndex!]!.letter : null;
          const targeted = bankDrag.dragging && bankDrag.hoverIndex === i;
          return (
            <button
              key={i}
              type="button"
              data-testid={`spell-slot-${i}`}
              data-slot-index={i}
              disabled={!enabled}
              aria-label={filled ? `Ô ${i + 1}: chữ ${letter}` : `Ô ${i + 1}: trống`}
              onClick={(e) => handleSlotClick(i, e.detail)}
              onPointerDown={slotDrag.onPointerDown(i)}
              onPointerMove={slotDrag.onPointerMove}
              onPointerUp={slotDrag.onPointerUp}
              onPointerCancel={slotDrag.onPointerCancel}
              onLostPointerCapture={slotDrag.onLostPointerCapture}
              className={`${SPELL_SLOT} ${targeted ? SPELL_SLOT_TARGET : ''} ${
                filled ? `border-solid ${material.tileFocus} ${enabled ? 'touch-none' : ''}` : ''
              }`}
            >
              {letter ? (
                <span aria-hidden="true" className={`${SPELL_TILE} flex items-center justify-center`}>
                  {letter}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Letter bank - placed tiles leave a dashed hole (spec s13.6). */}
      <div
        data-testid="spell-bank"
        data-bank-drop
        role="group"
        aria-label="Các chữ cái"
        className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-2"
      >
        {tiles.map((tile, i) => {
          const placed = tileInSlot(i) !== null;
          return placed ? (
            <span key={tile.id} aria-hidden="true" className={`${SPELL_SLOT} w-[64px] flex-none`} />
          ) : (
            <PressableOptionButton
              key={tile.id}
              type="button"
              data-testid={`spell-tile-${i}`}
              data-tile-id={tile.id}
              aria-label={`Chữ ${tile.letter}`}
              disabled={!enabled}
              onClick={(e) => handleTileClick(i, e.detail)}
              onPointerDown={bankDrag.onPointerDown(i)}
              onPointerMove={bankDrag.onPointerMove}
              onPointerUp={bankDrag.onPointerUp}
              onPointerCancel={bankDrag.onPointerCancel}
              onLostPointerCapture={bankDrag.onLostPointerCapture}
              className={`${SPELL_TILE} ${material.tileFocus} ${material.tilePress} ${material.tileHover} disabled:opacity-50 ${
                enabled ? 'touch-none' : ''
              }`}
            >
              {tile.letter}
            </PressableOptionButton>
          );
        })}
      </div>

      {/* Submit - gated on a fully-spelled word (spec s13.3/s13.6). */}
      <div className="mt-4 flex flex-col items-center gap-1">
        <button
          type="button"
          data-testid="submit-answer-button"
          disabled={!allFilled || disabled}
          aria-disabled={!allFilled || disabled}
          onClick={() => {
            if (allFilled && !disabled) onSubmit(composed);
          }}
          className={SUBMIT_ANSWER_BUTTON_CLASSNAME}
        >
          Kiểm tra
        </button>
        {!allFilled && !disabled ? (
          <span className="text-sm font-medium text-slate-300">Em điền hết các ô nhé</span>
        ) : null}
      </div>

      {bankDrag.ghostNode}
      {slotDrag.ghostNode}
    </div>
  );
}
