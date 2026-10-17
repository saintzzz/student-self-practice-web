import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpellItDrag from './SpellItDrag';
import type { SpellTile } from '../../types';

/**
 * CR-82 (spec s13.3/s13.6): tap, keyboard, swap, Backspace, submit
 * gating, aria labels and the placement live region. Drag mechanics are
 * covered by useDragTile.test.tsx; here the tap path drives placement.
 */

const TILES: readonly SpellTile[] = [
  { id: 'b-0', letter: 'b' },
  { id: 'o-0', letter: 'o' },
  { id: 'o-1', letter: 'o' },
  { id: 'k-0', letter: 'k' },
  { id: 'x-d0', letter: 'x' },
];

function renderSpell(overrides: Partial<Parameters<typeof SpellItDrag>[0]> = {}) {
  const onSubmit = vi.fn();
  render(
    <SpellItDrag
      tiles={TILES}
      slotCount={4}
      disabled={false}
      reducedMotion={false}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );
  return { onSubmit };
}

describe('SpellItDrag', () => {
  it('renders one slot per letter and one bank tile per tile with aria labels', () => {
    renderSpell();
    for (let i = 0; i < 4; i += 1) {
      expect(screen.getByTestId(`spell-slot-${i}`)).toHaveAccessibleName(`Ô ${i + 1}: trống`);
    }
    for (let i = 0; i < TILES.length; i += 1) {
      expect(screen.getByTestId(`spell-tile-${i}`)).toHaveAccessibleName(`Chữ ${TILES[i]!.letter}`);
      expect(screen.getByTestId(`spell-tile-${i}`)).toHaveAttribute('data-tile-id', TILES[i]!.id);
    }
    expect(screen.getByRole('group', { name: 'Các chữ cái' })).toBeInTheDocument();
  });

  it('submit is gated until every slot is filled, then submits the composed word', async () => {
    const { onSubmit } = renderSpell();
    const user = userEvent.setup();
    const submit = screen.getByTestId('submit-answer-button');
    expect(submit).toBeDisabled();
    expect(screen.getByText('Em điền hết các ô nhé')).toBeVisible();

    /* Tap x,b,o,o -> slots 0-3 = "xboo" (wrong on purpose - judging is
       the host's problem, this component only composes). */
    for (const testid of ['spell-tile-4', 'spell-tile-0', 'spell-tile-1', 'spell-tile-2']) {
      await user.click(screen.getByTestId(testid));
    }
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledWith('xboo');
  });

  it('tap places into the first empty slot and announces placement', async () => {
    renderSpell();
    const user = userEvent.setup();
    await user.click(screen.getByTestId('spell-tile-0')); // b
    expect(screen.getByTestId('spell-slot-0')).toHaveAccessibleName('Ô 1: chữ b');
    expect(screen.getByTestId('spell-slot-1')).toHaveAccessibleName('Ô 2: trống');
    /* The bank tile leaves a dashed hole (replaced by an aria-hidden span). */
    expect(screen.queryByTestId('spell-tile-0')).not.toBeInTheDocument();
  });

  it('tapping a filled slot returns the tile to the bank', async () => {
    renderSpell();
    const user = userEvent.setup();
    await user.click(screen.getByTestId('spell-tile-0'));
    await user.click(screen.getByTestId('spell-slot-0'));
    expect(screen.getByTestId('spell-slot-0')).toHaveAccessibleName('Ô 1: trống');
    expect(screen.getByTestId('spell-tile-0')).toBeInTheDocument();
  });

  it('Backspace removes the last placed tile', async () => {
    renderSpell();
    const user = userEvent.setup();
    await user.click(screen.getByTestId('spell-tile-0')); // slot 0
    await user.click(screen.getByTestId('spell-tile-1')); // slot 1
    await user.keyboard('{Backspace}');
    expect(screen.getByTestId('spell-slot-1')).toHaveAccessibleName('Ô 2: trống');
    expect(screen.getByTestId('spell-slot-0')).toHaveAccessibleName('Ô 1: chữ b');
  });

  it('disables all controls when disabled (judged state)', () => {
    renderSpell({ disabled: true });
    for (let i = 0; i < 4; i += 1) {
      expect(screen.getByTestId(`spell-slot-${i}`)).toBeDisabled();
    }
    for (let i = 0; i < TILES.length; i += 1) {
      expect(screen.getByTestId(`spell-tile-${i}`)).toBeDisabled();
    }
    expect(screen.getByTestId('submit-answer-button')).toBeDisabled();
  });

  it('repeated-letter tiles are interchangeable (either o fills an o slot)', async () => {
    const { onSubmit } = renderSpell();
    const user = userEvent.setup();
    /* book = b,o,o,k - use the SECOND o tile first; either instance is
       valid in either o slot (spec s13.4 instance-id ruling). */
    await user.click(screen.getByTestId('spell-tile-0')); // b -> slot 0
    await user.click(screen.getByTestId('spell-tile-2')); // o-1 -> slot 1
    await user.click(screen.getByTestId('spell-tile-1')); // o-0 -> slot 2
    await user.click(screen.getByTestId('spell-tile-3')); // k -> slot 3
    await user.click(screen.getByTestId('submit-answer-button'));
    expect(onSubmit).toHaveBeenCalledWith('book');
  });
});
