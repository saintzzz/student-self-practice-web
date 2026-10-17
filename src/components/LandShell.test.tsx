import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import LandShell from './LandShell';
import type { LandKey } from '../lib/ui/theme';

describe('LandShell (CR-82 M2)', () => {
  it('unknown land override resolves to the sky land (spec N3)', () => {
    render(<LandShell land={'atlantis' as LandKey}>hi</LandShell>);
    expect(screen.getByTestId('land-scene')).toHaveAttribute('data-land', 'sky');
  });

  it('renders children inside the shell', () => {
    render(<LandShell land="town">content</LandShell>);
    expect(screen.getByText('content')).toBeInTheDocument();
    expect(screen.getByTestId('land-scene')).toHaveAttribute('data-land', 'town');
  });

  it('forwards variant + tone to LandScene', () => {
    render(<LandShell gradeId="grade-1" variant="hero" tone="dusk">x</LandShell>);
    const scene = screen.getByTestId('land-scene');
    expect(scene).toHaveAttribute('data-variant', 'hero');
    expect(scene).toHaveAttribute('data-tone', 'dusk');
    expect(scene).toHaveAttribute('data-land', 'playground');
  });

  it('legacy night prop maps to tone=night', () => {
    render(<LandShell land="brand" night>x</LandShell>);
    expect(screen.getByTestId('land-scene')).toHaveAttribute('data-tone', 'night');
  });
});
