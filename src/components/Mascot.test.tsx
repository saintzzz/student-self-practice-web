import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Mascot, { type MascotMood } from './Mascot';

const MOODS: MascotMood[] = ['greeting', 'happy', 'encouraging', 'celebrating'];

/**
 * plan.md v10 "App-Wide Mascot" (AC38-AC39). Reduced-motion support is
 * verified CSS-only (checking that every `animate-*` utility class is
 * always paired with a `motion-reduce:animate-none` override) rather than
 * via `window.matchMedia` mocking - this app's existing test suite has no
 * precedent for mocking `matchMedia`, and Tailwind's `motion-reduce:`
 * variant is a pure CSS media-query mechanism that jsdom does not evaluate
 * anyway, so asserting the class pairing is the meaningful, honest check.
 */
describe('Mascot (plan.md v10, AC38-AC39)', () => {
  it.each(MOODS)('renders the 🐷 pig for the %s mood', (mood) => {
    render(<Mascot mood={mood} />);

    const mascot = screen.getByTestId('mascot');
    expect(mascot).toHaveTextContent('🐷');
    expect(mascot).toHaveAttribute('data-mascot-mood', mood);
  });

  it('pairs sparkle accent with the happy mood', () => {
    render(<Mascot mood="happy" />);

    expect(screen.getByTestId('mascot')).toHaveTextContent('✨');
  });

  it('pairs confetti accent with the celebrating mood', () => {
    render(<Mascot mood="celebrating" />);

    expect(screen.getByTestId('mascot')).toHaveTextContent('🎉');
  });

  it('has no accent emoji for greeting or encouraging moods', () => {
    render(<Mascot mood="greeting" />);
    expect(screen.getByTestId('mascot')).not.toHaveTextContent('✨');
    expect(screen.getByTestId('mascot')).not.toHaveTextContent('🎉');
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
    expect(mascot.className).toContain('text-2xl');
    expect(mascot.className).not.toContain('text-5xl');
  });
});
