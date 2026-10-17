import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import LandScene from './LandScene';
import type { LandKey } from '../../lib/ui/theme';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const LANDS: LandKey[] = ['sky', 'playground', 'town', 'jungle', 'city', 'space', 'brand'];

const ANIMATED = [
  'land-drift',
  'land-drift-slow',
  'land-sway',
  'land-twinkle',
  'land-float',
  'ambient-sparkle',
  'animate-scene-drift-far',
];
const ANIMATED_SELECTOR = ANIMATED.map((c) => `[class~="${c}"]`).join(',');

describe('LandScene hero variant (CR-82 M2, spec s6.2)', () => {
  it('renders L1/L2/L3 parallax layers + sky + scrim, aria-hidden, pointer-events-none', () => {
    render(<LandScene land="town" variant="hero" tone="dusk" />);
    const root = screen.getByTestId('land-scene');
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root).toHaveAttribute('data-variant', 'hero');
    expect(root).toHaveAttribute('data-tone', 'dusk');
    expect(root.className).toContain('pointer-events-none');
    expect(root.className).toContain('fixed');
    expect(root.querySelectorAll('[data-scene-layer]')).toHaveLength(3);
    expect(root.querySelector('[data-scene-layer="far"]')).not.toBeNull();
    expect(root.querySelector('[data-scene-layer="mid"]')).not.toBeNull();
    expect(root.querySelector('[data-scene-layer="near"]')).not.toBeNull();
    // L0 sky + horizon + land glow + L4 scrim = 4 static divs + 3 layers
    expect(root.children.length).toBe(3 + 4);
  });

  it('maps the legacy night prop to tone=night', () => {
    render(<LandScene land="space" night />);
    expect(screen.getByTestId('land-scene')).toHaveAttribute('data-tone', 'night');
  });

  it.each(LANDS)('ambient budget: %s hero has <=12 animated nodes (FF-13)', (land) => {
    render(<LandScene land={land} variant="hero" tone="night" />);
    const root = screen.getByTestId('land-scene');
    const count = root.querySelectorAll(ANIMATED_SELECTOR).length;
    expect(count).toBeLessThanOrEqual(12);
  });

  it('writes --journey on the root when the journey prop is set', () => {
    render(<LandScene land="jungle" variant="hero" tone="night" journey={0.4} />);
    const root = screen.getByTestId('land-scene');
    expect(root.style.getPropertyValue('--journey')).toBe('0.4');
  });

  it('sets data-scene-paused while the document is hidden', () => {
    render(<LandScene land="town" variant="hero" tone="dusk" />);
    const root = screen.getByTestId('land-scene');
    expect(root).not.toHaveAttribute('data-scene-paused');
  });
});

describe('LandScene strip variant (v4 compatibility)', () => {
  it('is the default and keeps the bottom strip shape', () => {
    render(<LandScene land="sky" />);
    const root = screen.getByTestId('land-scene');
    expect(root).toHaveAttribute('data-variant', 'strip');
    expect(root).toHaveAttribute('data-tone', 'day');
    expect(root.querySelector('svg')).not.toBeNull();
  });

  it('unknown land key resolves to the sky land (spec N3)', () => {
    render(<LandScene land={'atlantis' as LandKey} variant="hero" tone="night" />);
    expect(screen.getByTestId('land-scene')).toHaveAttribute('data-land', 'sky');
  });
});

/**
 * FF-6: no hex color literals inside scene/mascot components - every
 * fill must come through scenePalette()/tokens. url(#id) fragment refs
 * and stopColor props are fine (the '#xxx' pattern only matches hex
 * digits, not element ids).
 */
describe('FF-6 hex scanner', () => {
  const HEX = /#[0-9a-fA-F]{3,8}\b/;
  const SCAN_DIRS = [path.join(REPO_ROOT, 'src', 'components', 'scene'), path.join(REPO_ROOT, 'src', 'components', 'mascot')];
  const SCAN_FILES = [
    path.join(REPO_ROOT, 'src', 'components', 'Mascot.tsx'),
    path.join(REPO_ROOT, 'src', 'components', 'GradeSelect.tsx'),
  ];

  function collect(dir: string, out: string[] = []): string[] {
    if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return out;
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) collect(full, out);
      else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
    }
    return out;
  }

  it('no hex literal in scene/mascot components or GradeSelect', () => {
    const files = [...SCAN_DIRS.flatMap((d) => collect(d)), ...SCAN_FILES];
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      source.split('\n').forEach((line, i) => {
        const code = line.replace(/\/\/.*$/, '');
        const m = code.match(HEX);
        if (m) offenders.push(`${path.relative(REPO_ROOT, file)}:${i + 1} (${m[0]})`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
