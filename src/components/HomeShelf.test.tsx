import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomeShelf from './HomeShelf';
import { grantHomeItem, resetForTests } from '../lib/engagement/store';

/** External-review r1 #4: earned gift-box items must have a persistent
 *  visible home - empty state for new kids, owned grid after a grant. */
describe('HomeShelf', () => {
  it('shows the empty state when nothing was earned', () => {
    resetForTests();
    render(<HomeShelf />);
    expect(screen.getByTestId('home-shelf')).toBeInTheDocument();
    expect(screen.getByText(/Chưa có đồ chơi/)).toBeInTheDocument();
    expect(screen.queryByTestId(/home-item-/)).toBeNull();
  });

  it('renders every owned item after gift-box grants', () => {
    resetForTests();
    const first = grantHomeItem('sticker-a', 0)!;
    const second = grantHomeItem('sticker-b', 1)!;

    render(<HomeShelf />);
    expect(screen.getByTestId(`home-item-${first.item.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`home-item-${second.item.id}`)).toBeInTheDocument();
    expect(screen.getByText('2 món đồ trong nhà')).toBeInTheDocument();
  });
});
