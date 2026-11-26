import { beforeEach, describe, expect, it } from 'vitest';
import {
  choosePet,
  getPet,
  markPetStageSeen,
  petStageForXp,
  recordCorrectAnswers,
  resetForTests,
  PET_XP_PER_CORRECT,
} from './store';

// CR-36 acceptance criteria.

beforeEach(() => resetForTests());

describe('pet XP (AC-36.1)', () => {
  it('every correct answer feeds the pet even before one is picked', () => {
    expect(getPet().species).toBeNull();
    recordCorrectAnswers(5);
    expect(getPet().xp).toBe(5 * PET_XP_PER_CORRECT);
  });

  it('wrong/empty answers grant nothing', () => {
    recordCorrectAnswers(0);
    expect(getPet().xp).toBe(0);
  });

  it('xp keeps accumulating past the daily quest cap', () => {
    recordCorrectAnswers(15); // quest caps at 10, xp must not
    expect(getPet().xp).toBe(150);
  });
});

describe('pet stages (AC-36.2)', () => {
  it('maps xp to egg/baby/kid/adult/hero/legend thresholds', () => {
    expect(petStageForXp(0)).toBe(0);
    expect(petStageForXp(49)).toBe(0);
    expect(petStageForXp(50)).toBe(1);
    expect(petStageForXp(249)).toBe(1);
    expect(petStageForXp(250)).toBe(2);
    expect(petStageForXp(599)).toBe(2);
    expect(petStageForXp(600)).toBe(3);
    // CR-148 P1-5: two more apex stages keep the arc alive past 600xp.
    expect(petStageForXp(1499)).toBe(3);
    expect(petStageForXp(1500)).toBe(4);
    expect(petStageForXp(3999)).toBe(4);
    expect(petStageForXp(4000)).toBe(5);
    expect(petStageForXp(99999)).toBe(5);
  });

  it('P1-5: stages 4/5 resolve their own bespoke art', () => {
    recordCorrectAnswers(160); // 1600 xp -> hero stage
    choosePet('dragon');
    const pet = getPet();
    expect(pet.stage).toBe(4);
    expect(pet.stageName).toBe('Anh hùng');
    expect(pet.art).toBe('/images/pets/pet-dragon-4.webp');
    recordCorrectAnswers(240); // 4000 xp -> legend stage
    expect(getPet().art).toBe('/images/pets/pet-dragon-5.webp');
  });

  it('choosing a species keeps earned xp and resolves emoji/name', () => {
    recordCorrectAnswers(6); // 60 xp -> baby
    choosePet('dragon');
    const pet = getPet();
    expect(pet.nameVi).toBe('Rồng Con');
    expect(pet.emoji).toBe('🦎');
    expect(pet.stage).toBe(1);
    expect(pet.xpToNext).toBe(250 - 60);
  });

  it('CR-57: the adult bunny stays a rabbit - crowned, never a horse-like glyph', () => {
    recordCorrectAnswers(70); // 700 xp -> adult
    choosePet('bunny');
    const pet = getPet();
    expect(pet.stageName).toBe('Trưởng thành');
    expect(pet.emoji).toContain('🐇');
    expect(pet.emoji).not.toContain('🦄');
  });

  it('a maxed pet reports no next stage', () => {
    recordCorrectAnswers(400); // 4000 xp -> legend (CR-148 P1-5)
    choosePet('cat');
    const pet = getPet();
    expect(pet.stageName).toBe('Huyền thoại');
    expect(pet.xpToNext).toBeNull();
  });
});

describe('evolution congrats (AC-36.3)', () => {
  it('flags exactly once per new stage until marked seen', () => {
    choosePet('bunny');
    expect(getPet().justEvolved).toBe(false);
    recordCorrectAnswers(5); // egg -> baby
    expect(getPet().justEvolved).toBe(true);
    markPetStageSeen();
    expect(getPet().justEvolved).toBe(false);
    recordCorrectAnswers(1); // still baby
    expect(getPet().justEvolved).toBe(false);
    recordCorrectAnswers(19); // 250 xp -> kid
    expect(getPet().justEvolved).toBe(true);
  });
});
