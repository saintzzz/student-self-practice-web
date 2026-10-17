import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import StarRain from './StarRain';
import ChestReveal from './ChestReveal';

/**
 * CR-82 (spec s16.2): reward chrome is SVG, not emoji - StarRain gold
 * medallion discs with IconStar, ChestReveal a gold IconChest. The
 * star-drop timing is retained (180ms stagger).
 */

describe('StarRain SVG medallions (CR-82 s16.2)', () => {
  it('renders 3 SVG medallion discs - earned stars gold, unearned dimmed', () => {
    const { container, queryAllByTestId } = render(<StarRain stars={2} />);
    const medals = queryAllByTestId(/^star-medallion-/);
    expect(medals).toHaveLength(3);
    expect(medals[0]!.getAttribute('data-earned')).toBe('true');
    expect(medals[1]!.getAttribute('data-earned')).toBe('true');
    expect(medals[2]!.getAttribute('data-earned')).toBe('false');
    /* SVG icons, no emoji glyphs */
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(3);
    expect(container.textContent).not.toContain('⭐');
  });

  it('keeps the 180ms star-drop stagger', () => {
    const { queryAllByTestId } = render(<StarRain stars={3} />);
    const medals = queryAllByTestId(/^star-medallion-/);
    expect(medals.map((m) => m.style.animationDelay)).toEqual(['0ms', '180ms', '360ms']);
  });

  it('renders nothing at 0 stars', () => {
    const { queryAllByTestId } = render(<StarRain stars={0} />);
    expect(queryAllByTestId(/^star-medallion-/)).toHaveLength(0);
  });
});

describe('ChestReveal SVG chest (CR-82 s16.2)', () => {
  it('renders the IconChest SVG - no gift emoji', () => {
    const { getByTestId, container } = render(
      <ChestReveal chestStars={2} totalStars={10} newStickers={[]} />,
    );
    expect(getByTestId('chest-svg').querySelector('svg')).toBeTruthy();
    expect(container.textContent).not.toContain('🎁');
  });
});
