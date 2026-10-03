import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PetCard from './PetCard';
import { choosePet, getPet, recordCorrectAnswers, resetForTests } from '../lib/engagement/store';

beforeEach(() => resetForTests());

describe('PetCard (CR-36)', () => {
  it('offers a 3-species picker when no pet is chosen (AC-36.4)', () => {
    render(<PetCard />);
    expect(screen.getByTestId('pet-pick-cat')).toBeTruthy();
    expect(screen.getByTestId('pet-pick-dragon')).toBeTruthy();
    expect(screen.getByTestId('pet-pick-bunny')).toBeTruthy();
  });

  it('picking a species shows the pet and its xp progress', () => {
    render(<PetCard />);
    fireEvent.click(screen.getByTestId('pet-pick-bunny'));
    expect(getPet().species).toBe('bunny');
    expect(screen.getByText(/Thỏ Trắng - Trứng/)).toBeTruthy();
    expect(screen.getByTestId('pet-xp-bar')).toBeTruthy();
  });

  it('shows the one-time evolution congrats and dismisses it (AC-36.3)', () => {
    choosePet('cat');
    recordCorrectAnswers(5); // -> baby
    render(<PetCard />);
    expect(screen.getByTestId('pet-evolved')).toBeTruthy();
    expect(screen.getByText(/Mèo Mun vừa lớn lên thành Bé/)).toBeTruthy();
    fireEvent.click(screen.getByTestId('pet-evolved-ok'));
    expect(screen.queryByTestId('pet-evolved')).toBeNull();
    expect(getPet().justEvolved).toBe(false);
  });
});
