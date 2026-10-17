import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Mascot, { type MascotMood } from './Mascot';

const MOODS: MascotMood[] = ['idle', 'thinking', 'greeting', 'happy', 'encouraging', 'celebrating'];

/**
 * plan.md v10 "App-Wide Mascot" (AC38-AC39); CR-82 M4: the pose set grew
 * to six (idle/thinking/greeting/happy/celebrating/encouraging) rendered
 * by the shared pose rig. Under jsdom `window.matchMedia` is absent, so
 * D-09 forces the static renderer - `data-mascot-renderer="static"` and
 * the MascotStaticPose group structure (data-pose-group) are the stable
 * assertions; tests never assert the Lottie renderer itself.
 */
describe('Mascot (plan.md v10, AC38-AC39; CR-82 s9.2)', () => {
  it.each(MOODS)('renders the Bé Heo pose rig for the %s mood', (mood) => {
    render(<Mascot mood={mood} />);

    const mascot = screen.getByTestId('mascot');
    expect(mascot).toHaveAttribute('data-mascot-mood', mood);
    expect(mascot).toHaveAttribute('data-mascot-renderer', 'static');
    // The shared bust groups are always present.
    expect(mascot.querySelector('[data-pose-group="head"]')).not.toBeNull();
    expect(mascot.querySelector('[data-pose-group="eyes"]')).not.toBeNull();
    expect(mascot.querySelector('[data-pose-group="snout"]')).not.toBeNull();
  });

  it('thinking adds the thought bubble; celebrating adds confetti specks', () => {
    const { rerender } = render(<Mascot mood="thinking" />);
    expect(screen.getByTestId('mascot').querySelector('[data-pose-group="bubble"]')).not.toBeNull();
    expect(screen.getByTestId('mascot').querySelector('[data-pose-group="confetti"]')).toBeNull();

    rerender(<Mascot mood="celebrating" />);
    expect(screen.getByTestId('mascot').querySelector('[data-pose-group="confetti"]')).not.toBeNull();
    expect(screen.getByTestId('mascot').querySelector('[data-pose-group="bubble"]')).toBeNull();
  });

  it('greeting raises the right hoof (wave arm replaces the resting hoof)', () => {
    render(<Mascot mood="greeting" />);
    const mascot = screen.getByTestId('mascot');
    // The raised hoof sits high on the artboard (cy ~196 of 512).
    const hoof = mascot.querySelector('[data-pose-group="hoofR"] ellipse[cy="196"]');
    expect(hoof).not.toBeNull();
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

  it.each(MOODS)('size="inline" is always the static 32px pose for %s (D-09)', (mood) => {
    render(<Mascot mood={mood} size="inline" />);

    const mascot = screen.getByTestId('mascot');
    expect(mascot).toHaveAttribute('data-mascot-renderer', 'static');
    const svg = mascot.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
  });

  it('keeps the mood mapping at inline size (FeedbackPanel usage)', () => {
    render(<Mascot mood="happy" size="inline" />);

    const mascot = screen.getByTestId('mascot');
    expect(mascot).toHaveAttribute('data-mascot-mood', 'happy');
  });
});
