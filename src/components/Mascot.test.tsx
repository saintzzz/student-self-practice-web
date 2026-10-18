import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Mascot, { type MascotMood } from './Mascot';

const MOODS: MascotMood[] = ['idle', 'thinking', 'greeting', 'happy', 'encouraging', 'celebrating'];

const MOOD_FILE: Record<MascotMood, string> = {
  idle: 'be-heo-idle',
  thinking: 'be-heo-thinking',
  greeting: 'be-heo-portrait',
  happy: 'be-heo-happy',
  celebrating: 'be-heo-celebrating',
  encouraging: 'be-heo-encouraging',
};

/**
 * plan.md v10 "App-Wide Mascot" (AC38-AC39); CR-82 s9.2; bespoke-art
 * unification: every mood renders the generated webp + a CSS motion
 * class (transform-only). `data-mascot-renderer="art"` replaces the old
 * lottie/static split - the assertions below are DOM facts, no renderer
 * internals.
 */
describe('Mascot (plan.md v10, AC38-AC39; CR-82 s9.2)', () => {
  it.each(MOODS)('renders the generated Bé Heo art for the %s mood', (mood) => {
    render(<Mascot mood={mood} />);

    const mascot = screen.getByTestId('mascot');
    expect(mascot).toHaveAttribute('data-mascot-mood', mood);
    expect(mascot).toHaveAttribute('data-mascot-renderer', 'art');
    const img = mascot.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('src')).toBe(`/images/mascot/${MOOD_FILE[mood]}.webp`);
  });

  it('maps each mood to its motion class (bob/rock/wave/bounce/nod/hop)', () => {
    const cases: [MascotMood, string][] = [
      ['idle', 'mascot-idle'],
      ['thinking', 'mascot-rock'],
      ['greeting', 'mascot-wave'],
      ['happy', 'mascot-bounce'],
      ['encouraging', 'mascot-nod'],
      ['celebrating', 'mascot-hop'],
    ];
    for (const [mood, cls] of cases) {
      const { unmount } = render(<Mascot mood={mood} />);
      expect(screen.getByTestId('mascot').querySelector('img')!.className).toContain(cls);
      unmount();
    }
  });

  it.each([
    ['idle', 'Heo con đang chờ em'],
    ['thinking', 'Heo con đang suy nghĩ'],
    ['greeting', 'Heo con vẫy chào'],
    ['happy', 'Heo con vui mừng'],
    ['encouraging', 'Heo con động viên'],
    ['celebrating', 'Heo con ăn mừng'],
  ] as const)('exposes the %s mood as accessible name "%s" (AC-1.9)', (mood, label) => {
    render(<Mascot mood={mood} />);

    expect(screen.getByTestId('mascot')).toHaveAttribute('aria-label', label);
    expect(screen.getByTestId('mascot')).toHaveAttribute('role', 'img');
  });

  it.each(MOODS)('size="inline" renders the head-only face art at 32px for %s', (mood) => {
    render(<Mascot mood={mood} size="inline" />);

    const mascot = screen.getByTestId('mascot');
    const img = mascot.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('src')).toBe('/images/mascot/be-heo-face.webp');
    expect(img).toHaveAttribute('width', '32');
    expect(img).toHaveAttribute('height', '32');
  });

  it('keeps the mood mapping at inline size (FeedbackPanel usage)', () => {
    render(<Mascot mood="happy" size="inline" />);

    const mascot = screen.getByTestId('mascot');
    expect(mascot).toHaveAttribute('data-mascot-mood', 'happy');
  });
});
