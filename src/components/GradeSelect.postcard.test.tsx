import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GradeSelect from './GradeSelect';
import { GRADES } from '../data/vocabulary';

/** CR-82 M2 (spec s6.6): each grade card carries a 96px day-tone land
 *  strip "postcard" header rendered by LandScene, clipped to the card. */
describe('GradeSelect postcards', () => {
  it('renders one aria-hidden day-tone 96px postcard per grade card', () => {
    render(<GradeSelect grades={GRADES} onSelectGrade={vi.fn()} />);
    for (const grade of GRADES) {
      const postcard = screen.getByTestId(`grade-postcard-${grade.id}`);
      expect(postcard).toHaveAttribute('aria-hidden', 'true');
      expect(postcard.className).toContain('h-24'); // 96px
      const scene = postcard.querySelector('[data-testid="land-scene"]');
      expect(scene).not.toBeNull();
      expect(scene).toHaveAttribute('data-variant', 'strip');
      expect(scene).toHaveAttribute('data-tone', 'day');
    }
  });

  it('postcard land matches the grade land', () => {
    render(<GradeSelect grades={GRADES} onSelectGrade={vi.fn()} />);
    const lands = Object.fromEntries(
      GRADES.map((g) => [g.id, screen.getByTestId(`grade-postcard-${g.id}`).querySelector('[data-land]')?.getAttribute('data-land')]),
    );
    expect(lands).toEqual({
      'grade-1': 'playground',
      'grade-2': 'town',
      'grade-3': 'jungle',
      'grade-4': 'city',
      'grade-5': 'space',
    });
  });
});
