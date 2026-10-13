import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Mascot, { type MascotMood } from './Mascot';

const MOODS: MascotMood[] = ['greeting', 'happy', 'encouraging', 'celebrating'];

/**
 * plan.md v10 "App-Wide Mascot" (AC38-AC39), CR-72 art pass: Bé Heo is a
 * hand-drawn SVG with real per-mood expressions (open eyes / happy arcs /
 * encouraging brows / celebrate grin). Reduced-motion support is verified
 * CSS-only (every `animate-*` utility is paired with a
 * `motion-reduce:animate-none` override) - the app's test suite has no
 * precedent for mocking `matchMedia`, and Tailwind's `motion-reduce:`
 * variant is a pure CSS media-query mechanism jsdom does not evaluate.
 */
describe('Mascot (plan.md v10, AC38-AC39; CR-72)', () => {
  it.each(MOODS)('renders the Bé Heo SVG character for the %s mood', (mood) => {
    render(<Mascot mood={mood} />);

    const mascot = screen.getByTestId('mascot');
    expect(mascot).toHaveAttribute('data-mascot-mood', mood);
    // The illustrated pig head circle is always present.
    expect(mascot.querySelector('svg circle[cx="48"]')).not.toBeNull();
  });

  it('happy and celebrating moods show closed-happy eyes; greeting and encouraging show open eyes', () => {
    const { rerender } = render(<Mascot mood="happy" />);
    expect(screen.getByTestId('mascot').querySelector('circle[r="4"]')).toBeNull();

    rerender(<Mascot mood="celebrating" />);
    expect(screen.getByTestId('mascot').querySelector('circle[r="4"]')).toBeNull();

    rerender(<Mascot mood="greeting" />);
    expect(screen.getByTestId('mascot').querySelectorAll('circle[r="4"]').length).toBe(2);

    rerender(<Mascot mood="encouraging" />);
    expect(screen.getByTestId('mascot').querySelectorAll('circle[r="4"]').length).toBe(2);
  });

  it('greeting shows the waving arm, celebrating shows confetti', () => {
    const { rerender } = render(<Mascot mood="greeting" />);
    // arm path has the M75 68 start point
    expect(screen.getByTestId('mascot').innerHTML).toContain('M75 68');

    rerender(<Mascot mood="celebrating" />);
    expect(screen.getByTestId('mascot').innerHTML).not.toContain('M75 68');
    // confetti rects
    expect(screen.getByTestId('mascot').querySelectorAll('rect').length).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ['greeting', 'Heo con vẫy chào'],
    ['happy', 'Heo con vui mừng'],
    ['encouraging', 'Heo con động viên'],
    ['celebrating', 'Heo con ăn mừng'],
  ] as const)('exposes the %s mood as accessible name "%s" (AC-1.9)', (mood, label) => {
    render(<Mascot mood={mood} />);

    expect(screen.getByTestId('mascot')).toHaveAttribute('aria-label', label);
  });

  it.each(MOODS)('gates the %s mood animation behind motion-reduce:animate-none', (mood) => {
    render(<Mascot mood={mood} />);

    const className = screen.getByTestId('mascot').className;
    expect(className).toMatch(/animate-mascot-\S+/);
    expect(className).toContain('motion-reduce:animate-none');
  });

  it('renders at inline size without changing the mood mapping (FeedbackPanel usage)', () => {
    render(<Mascot mood="happy" size="inline" />);

    const mascot = screen.getByTestId('mascot');
    expect(mascot).toHaveAttribute('data-mascot-mood', 'happy');
    expect(mascot.innerHTML).toContain('h-8 w-8');
  });
});
