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
    expect(img?.getAttribute('src')).toBe('/images/lands/land-town.webp');
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

  it('falls back to the vector LandScene when the art file fails', () => {
    render(<LandArt land="jungle" variant="strip" tone="day" />);
    const img = screen.getByTestId('land-scene').querySelector('img');
    fireEvent.error(img!);
    // After the error the SVG vector engine renders instead of a
    // broken img - the root keeps the same data contract.
    const root = screen.getByTestId('land-scene');
    expect(root).toHaveAttribute('data-land', 'jungle');
    expect(root.querySelector('svg')).toBeTruthy();
    expect(root.querySelector('img')).toBeNull();
  });
});
