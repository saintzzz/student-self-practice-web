import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import JourneyTrail from './JourneyTrail';

/**
 * CR-82 M3 (DESIGN-SPEC-v5 s7.3): the board's journey trail - one 10px
 * stepping-stone dot per question; done/current amber (current ringed),
 * upcoming white/20; above 12 questions it collapses into the progress
 * track bar. Always aria-hidden - the question-progress text carries the
 * same meaning.
 */
describe('JourneyTrail', () => {
  it('renders one stepping-stone dot per question, aria-hidden', () => {
    const { container } = render(<JourneyTrail current={3} total={10} />);
    const trail = screen.getByTestId('journey-trail');
    expect(trail).toHaveAttribute('aria-hidden', 'true');
    const dots = container.querySelectorAll('[data-step]');
    expect(dots).toHaveLength(10);
  });

  it('marks done + current stones amber and upcoming stones dim', () => {
    const { container } = render(<JourneyTrail current={3} total={10} />);
    const dots = [...container.querySelectorAll('[data-step]')] as HTMLElement[];
    for (const dot of dots.slice(0, 3)) {
      expect(dot.className).toContain('bg-amber-300');
    }
    for (const dot of dots.slice(3)) {
      expect(dot.className).toContain('bg-white/20');
    }
  });

  it('rings only the current stone', () => {
    const { container } = render(<JourneyTrail current={3} total={10} />);
    const dots = [...container.querySelectorAll('[data-step]')] as HTMLElement[];
    expect(dots[2].className).toContain('ring-4');
    expect(dots[2].className).toContain('ring-amber-300/30');
    expect(dots[1].className).not.toContain('ring-4');
    expect(dots[3].className).not.toContain('ring-4');
  });

  it('collapses into the progress track bar above 12 questions', () => {
    const { container } = render(<JourneyTrail current={7} total={16} />);
    expect(container.querySelectorAll('[data-step]')).toHaveLength(0);
    /* the fill carries the current position (7/16 ~ 44%). */
    const fill = container.querySelector('[style]') as HTMLElement;
    expect(fill.style.width).toBe('43.75%');
  });
});
