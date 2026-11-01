import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LandArt from './LandArt';

describe('LandArt', () => {
  it('renders the generated land art with the LandScene data contract', () => {
    render(<LandArt land="town" variant="strip" tone="day" />);
    const root = screen.getByTestId('land-scene');
    expect(root).toHaveAttribute('data-variant', 'strip');
    expect(root).toHaveAttribute('data-tone', 'day');
    expect(root).toHaveAttribute('data-land', 'town');
    const img = root.querySelector('img');
    /* CR-116: day tone prefers the -day art variant. */
    expect(img?.getAttribute('src')).toBe('/images/lands/land-town-day.webp');
  });

  it('falls back to the base art file when the -day variant is missing', () => {
    render(<LandArt land="town" variant="strip" tone="day" />);
    const img = screen.getByTestId('land-scene').querySelector('img');
    fireEvent.error(img!);
    const next = screen.getByTestId('land-scene').querySelector('img');
    expect(next?.getAttribute('src')).toBe('/images/lands/land-town.webp');
    expect(next).not.toBeNull();
  });

  it('keeps the tone + land on the hero variant and marks the art renderer', () => {
    render(<LandArt land="space" variant="hero" tone="night" />);
    const root = screen.getByTestId('land-scene');
    expect(root).toHaveAttribute('data-variant', 'hero');
    expect(root).toHaveAttribute('data-renderer', 'art');
    const img = root.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/images/lands/land-space.webp');
    expect(img?.className).toContain('scene-layer');
  });

  it('falls back to the vector LandScene when both art files fail', () => {
    render(<LandArt land="jungle" variant="strip" tone="day" />);
    const img = screen.getByTestId('land-scene').querySelector('img');
    fireEvent.error(img!);
    // First error: -day variant missing -> base file takes over (still
    // an <img>, still art renderer).
    const base = screen.getByTestId('land-scene').querySelector('img');
    expect(base?.getAttribute('src')).toBe('/images/lands/land-jungle.webp');
    fireEvent.error(base!);
    // Second error: base missing too -> the SVG vector engine renders
    // instead of a broken img - the root keeps the same data contract.
    const root = screen.getByTestId('land-scene');
    expect(root).toHaveAttribute('data-land', 'jungle');
    expect(root.querySelector('svg')).toBeTruthy();
    expect(root.querySelector('img')).toBeNull();
  });

  it('non-day tones keep requesting the base art file directly', () => {
    render(<LandArt land="jungle" variant="strip" tone="night" />);
    const img = screen.getByTestId('land-scene').querySelector('img');
    expect(img?.getAttribute('src')).toBe('/images/lands/land-jungle.webp');
  });
});
