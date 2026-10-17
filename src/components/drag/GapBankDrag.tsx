import { useCallback, useState } from 'react';
import { useDragTile } from '../../hooks/useDragTile';
import { playSfx } from '../../lib/sfx';
import { SUBMIT_ANSWER_BUTTON_CLASSNAME } from '../actionButtonStyle';
import PressableOptionButton from '../PressableOptionButton';
import { material, SENTENCE_GAP, WORD_CHIP } from '../../lib/ui/tokens';

/**
 * CR-82 (DESIGN-SPEC-v5 s13, ARCHITECTURE-v5 s4.4): the G1-2 "fill the
 * gap" surface - drag (or tap) the right word chip into the blank inside
 * the sentence. Exactly three options (answer + 2 validated distractors,
 * s13.5) and never more than one gap.
 *
 * Dual input (R-v5-10): tapping / pressing Enter on the EMPTY gap calls
 * `onRequestTyping` so the child can switch to the peer typed input; a
 * gap holding a chip removes it on tap instead.
 */
export interface GapBankDragProps {
  /** The displayed stem - contains exactly one '___'. */
  displaySentence: string;
  /** Payload `question.bank.options` (answer + 2 distractors, seeded). */
  options: readonly [string, string, string];
  /** hasAnswered - the judged state disables everything. */
  disabled: boolean;
  reducedMotion: boolean;
  /** Tap/Enter on the EMPTY sentence-gap (peer typed input, s13.7). */
  onRequestTyping: () => void;
  /** Chosen chip word -> the existing onSubmitListening path. */
  onSubmit: (word: string) => void;
}

export default function GapBankDrag({
  displaySentence,
  options,
  disabled,
  onRequestTyping,
  onSubmit,
}: GapBankDragProps) {
  /* The bank index currently sitting in the single gap (null = empty). */
  const [placed, setPlaced] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const enabled = !disabled;

  const placeChip = useCallback(
    (bankIndex: number) => {
      setPlaced(bankIndex);
      setAnnouncement(`Đã chọn từ "${options[bankIndex] ?? ''}"`);
      /* CR-82 (spec s16.3): tile drop pop - ui tier, dropped silently
         while a verdict/reward or speech is playing. */
      playSfx('pop');
    },
    [options],
  );

  const removeChip = useCallback(() => {
    setPlaced((prev) => {
      if (prev !== null) setAnnouncement(`Đã trả từ "${options[prev] ?? ''}" về khay`);
      return null;
    });
  }, [options]);

  /* Chips -> the single sentence gap (cross-namespace: chip index 0 may
     drop on gap index 0). Drop over no target springs back. */
  const chipDrag = useDragTile({
    enabled,
    targetAttr: 'data-slot-index',
    crossNamespace: true,
    onDrop: (src) => placeChip(src),
    onDropOutside: () => {},
    ghostClassName: `${WORD_CHIP} inline-flex items-center justify-center`,
    renderGhost: (src) => options[src] ?? '',
  });

  /* The placed chip -> dragged back onto the bank zone to return it. */
  const gapDrag = useDragTile({
    enabled,
    targetAttr: 'data-bank-drop',
    onDrop: () => removeChip(),
    onDropOutside: () => {},
    ghostClassName: `${WORD_CHIP} inline-flex items-center justify-center`,
    renderGhost: () => (placed === null ? '' : options[placed] ?? ''),
  });

  function handleChipClick(bankIndex: number, detail: number): void {
    if (!enabled || chipDrag.shouldSuppressClick(detail)) return;
    if (placed === bankIndex) return;
    placeChip(bankIndex);
  }

  function handleGapClick(detail: number): void {
    if (!enabled || gapDrag.shouldSuppressClick(detail)) return;
    if (placed === null) {
      /* s13.7: only the EMPTY gap opens typing mode - a placed chip is
         removed by tap, never silently swapped for the keyboard. */
      onRequestTyping();
    } else {
      removeChip();
    }
  }

  const [before, after] = displaySentence.split('___');
  const gapFilled = placed !== null;
  const gapTargeted = chipDrag.dragging && chipDrag.hoverIndex === 0;

  return (
    <div>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>

      <p className="mb-3 text-3xl font-extrabold text-white">
        {before}
        <button
          type="button"
          data-testid="sentence-gap"
          data-slot-index={0}
          disabled={!enabled}
          aria-label={gapFilled ? `Chỗ trống: ${options[placed!]}` : 'Chỗ trống: trống - chạm để gõ tay'}
          onClick={(e) => handleGapClick(e.detail)}
          onPointerDown={gapDrag.onPointerDown(0)}
          onPointerMove={gapDrag.onPointerMove}
          onPointerUp={gapDrag.onPointerUp}
          onPointerCancel={gapDrag.onPointerCancel}
          onLostPointerCapture={gapDrag.onLostPointerCapture}
          className={`${SENTENCE_GAP} ${material.tileFocus} ${
            gapTargeted ? 'border-solid border-amber-300 ring-4 ring-amber-300/40' : ''
          } ${gapFilled ? 'border-solid' : ''} ${enabled ? 'touch-none' : ''}`}
        >
          {gapFilled ? (
            <span aria-hidden="true" className={`${WORD_CHIP} inline-flex min-h-[44px] items-center justify-center`}>
              {options[placed!]}
            </span>
          ) : (
            <span aria-hidden="true">___</span>
          )}
        </button>
        {after}
      </p>

      {/* Word bank - a placed chip leaves a dashed hole (spec s13.6). */}
      <div
        data-testid="gap-bank"
        data-bank-drop
        role="group"
        aria-label="Các từ"
        className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-2"
      >
        {options.map((option, i) =>
          placed === i ? (
            <span key={i} aria-hidden="true" className={`${SENTENCE_GAP} min-w-[8ch]`} />
          ) : (
            <PressableOptionButton
              key={i}
              type="button"
              data-testid={`gap-chip-${i}`}
              aria-label={`Từ ${option}`}
              disabled={!enabled}
              onClick={(e) => handleChipClick(i, e.detail)}
              onPointerDown={chipDrag.onPointerDown(i)}
              onPointerMove={chipDrag.onPointerMove}
              onPointerUp={chipDrag.onPointerUp}
              onPointerCancel={chipDrag.onPointerCancel}
              onLostPointerCapture={chipDrag.onLostPointerCapture}
              className={`${WORD_CHIP} ${material.tileFocus} ${material.tilePress} ${material.tileHover} disabled:opacity-50 ${
                enabled ? 'touch-none' : ''
              }`}
            >
              {option}
            </PressableOptionButton>
          ),
        )}
      </div>

      {/* Submit - gated on a chip in the gap. */}
      <div className="mt-4 flex flex-col items-center gap-1">
        <button
          type="button"
          data-testid="submit-answer-button"
          disabled={!gapFilled || disabled}
          aria-disabled={!gapFilled || disabled}
          onClick={() => {
            if (gapFilled && !disabled) onSubmit(options[placed!]!);
          }}
          className={SUBMIT_ANSWER_BUTTON_CLASSNAME}
        >
          Kiểm tra
        </button>
        {!gapFilled && !disabled ? (
          <span className="text-sm font-medium text-slate-300">Em chọn từ điền vào chỗ trống nhé</span>
        ) : null}
      </div>

      {chipDrag.ghostNode}
      {gapDrag.ghostNode}
    </div>
  );
}
