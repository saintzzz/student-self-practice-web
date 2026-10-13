import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GiftBoxPicker from './GiftBoxPicker';
import { emptyEngagement, grantHomeItem, ownedHomeItems, writeState } from '../lib/engagement/store';
import { HOME_ITEMS } from '../data/homeItems';

/**
 * kids-UX step 8 (design s3.5.b): pick-1-of-3 gift boxes that grant a home
 * item through grantHomeItem - deterministic, reveal picked only, replays
 * show the stored item instead of re-opening a gift.
 */
describe('GiftBoxPicker', () => {
  beforeEach(() => {
    localStorage.clear();
    writeState(emptyEngagement());
  });

  it('offers exactly three identical gift boxes', () => {
    render(<GiftBoxPicker stickerId="first-batch" />);

    expect(screen.getByRole('group', { name: 'Chọn một hộp quà' })).toBeInTheDocument();
    for (const i of [0, 1, 2]) {
      expect(screen.getByTestId(`gift-box-${i}`)).toBeEnabled();
      expect(screen.getByTestId(`gift-box-${i}`)).toHaveTextContent('🎁');
    }
    expect(screen.queryByTestId('gift-reveal')).not.toBeInTheDocument();
  });

  it('grants the home item for the tapped box and reveals only that item', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<GiftBoxPicker stickerId="first-batch" onDone={onDone} />);

    await user.click(screen.getByTestId('gift-box-1'));

    const reveal = screen.getByTestId('gift-reveal');
    const granted = grantHomeItem('first-batch', 0); // replay read: stored item
    expect(granted).not.toBeNull();
    expect(reveal).toHaveTextContent(`${granted!.item.nameVi} đã vào nhà của em!`);

    // Every box locks; the unpicked two never reveal contents.
    for (const i of [0, 1, 2]) expect(screen.getByTestId(`gift-box-${i}`)).toBeDisabled();
    expect(screen.getByTestId('gift-box-0')).toHaveTextContent('🎁');
    expect(screen.getByTestId('gift-box-2')).toHaveTextContent('🎁');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('is deterministic - the same sticker and box index grant the same item', async () => {
    const user = userEvent.setup();
    const first = render(<GiftBoxPicker stickerId="star-hoard" />);
    await user.click(screen.getByTestId('gift-box-2'));
    const itemId = grantHomeItem('star-hoard', 0)!.item.id;
    first.unmount();

    // Remount replays the stored grant - no fresh offer.
    render(<GiftBoxPicker stickerId="star-hoard" />);
    const reveal = await screen.findByTestId('gift-reveal');
    const item = HOME_ITEMS.find((i) => i.id === itemId)!;
    expect(reveal).toHaveTextContent(`${item.nameVi} đã vào nhà của em!`);
  });

  it('shows a previously granted item immediately without an offer', async () => {
    const seeded = grantHomeItem('first-batch', 2)!;
    render(<GiftBoxPicker stickerId="first-batch" />);

    const reveal = await screen.findByTestId('gift-reveal');
    expect(reveal).toHaveTextContent(seeded.item.nameVi);
    expect(screen.getByTestId('gift-box-0')).toBeDisabled();
  });

  it('renders nothing when the home-item pool is exhausted', () => {
    for (let i = 0; i < HOME_ITEMS.length; i++) {
      grantHomeItem(`exhaust-${i}`, i);
    }
    expect(ownedHomeItems().length).toBe(HOME_ITEMS.length);

    const { container } = render(<GiftBoxPicker stickerId="brand-new-sticker" />);
    expect(container).toBeEmptyDOMElement();
  });
});
