import { describe, expect, it } from 'vitest';
import { mixHex, scenePalette } from './theme';
import type { LandKey } from './theme';

/** CR-82 (DESIGN-SPEC-v5 s6.4): dusk/night derivation, never-mixed
 *  lights, unknown-land -> sky guard (spec s6.2 N3). */
describe('mixHex / scenePalette', () => {
  it('mixHex interpolates channels linearly', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('day returns base fills unchanged; dusk/night mix toward navy', () => {
    const day = scenePalette('sky', 'day');
    const dusk = scenePalette('sky', 'dusk');
    const night = scenePalette('sky', 'night');
    expect(day.ground[0]).toBe('#86efac');
    expect(dusk.ground[0]).toBe(mixHex('#86efac', '#101a36', 0.3));
    expect(night.ground[0]).toBe(mixHex('#86efac', '#0b1224', 0.5));
    expect(dusk.ground[0]).not.toBe(day.ground[0]);
    expect(night.props.cloud).not.toBe(day.props.cloud);
  });

  it('lights are never mixed - windows/stars stay bright at night', () => {
    for (const land of ['sky', 'town', 'city', 'space', 'brand'] as LandKey[]) {
      const day = scenePalette(land, 'day');
      const night = scenePalette(land, 'night');
      expect(night.lights).toEqual(day.lights);
    }
  });

  it('unknown land resolves to the sky palette (spec s6.2 N3)', () => {
    const unknown = scenePalette('atlantis' as LandKey, 'dusk');
    expect(unknown).toEqual(scenePalette('sky', 'dusk'));
  });
});
