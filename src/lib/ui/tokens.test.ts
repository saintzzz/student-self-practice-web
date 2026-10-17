import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as tokens from './tokens';

/**
 * CR-82 (DESIGN-SPEC-v5 s5.3 rule 3, FF-2): surface composites carry a
 * surface-bound ink and exactly one size. Paper composites never carry a
 * light ink; navy composites never carry a dark ink; no composite holds
 * two non-prefixed text-* sizes; geometry tokens are never imported by
 * components.
 */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SRC_DIR = path.join(REPO_ROOT, 'src');

const LIGHT_INK =
  /\btext-(white|amber-[123]00|sky-[123]00|slate-[123]00)\b/;
const DARK_INK = /\btext-(slate-[6-9]00|slate-950|navy-\w+|[a-z]+-[7-9]\d{0,2}|[a-z]+-950)\b/;
const SIZE_CLASS = /(^|\s)text-(xs|sm|base|lg|[2-9]?xl)(?=\s|$)/g;

const allExports = tokens as Record<string, unknown>;

function compositeNames(suffix: '_PAPER' | '_NAVY'): string[] {
  return Object.keys(allExports).filter(
    (k) => k.startsWith('TYPE_') && k.endsWith(suffix) && typeof allExports[k] === 'string',
  );
}

describe('type composites (CR-82 s5.3 rule 3)', () => {
  it('every TYPE_*_PAPER composite carries a dark ink (no light-ink class)', () => {
    for (const name of compositeNames('_PAPER')) {
      const value = allExports[name] as string;
      expect(LIGHT_INK.test(value), `${name}: ${value}`).toBe(false);
    }
  });

  it('every TYPE_*_NAVY composite carries a light ink (no dark-ink class)', () => {
    for (const name of compositeNames('_NAVY')) {
      const value = allExports[name] as string;
      expect(DARK_INK.test(value), `${name}: ${value}`).toBe(false);
    }
  });

  it('no composite holds two non-prefixed text-* size classes', () => {
    for (const name of [...compositeNames('_PAPER'), ...compositeNames('_NAVY')]) {
      const value = allExports[name] as string;
      const sizes = value.match(SIZE_CLASS) ?? [];
      expect(sizes.length, `${name}: ${value}`).toBeLessThanOrEqual(1);
    }
  });
});

describe('v5 token hygiene', () => {
  const V5_PREFIXES = [
    'material',
    'TYPE_',
    'INK_',
    'EXAM_',
    'SPELL_',
    'WORD_CHIP',
    'GAP_INPUT_TOGGLE',
    'SENTENCE_GAP',
    'DRAG_GHOST',
    'TRACE_',
    'FLASH_',
    'BTN_FLASH_',
    'CHIP_PAPER_',
    'GOLD_HAIRLINE',
    'TRAIL_TILE_ARENA',
    'scene',
  ];

  it('v5 tokens never use unloaded weights (font-semibold/font-black)', () => {
    const offenders: string[] = [];
    const scan = (name: string, value: unknown) => {
      if (typeof value === 'string' && /font-(semibold|black)\b/.test(value)) {
        offenders.push(name);
      } else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          scan(`${name}.${k}`, v);
        }
      }
    };
    for (const [name, value] of Object.entries(allExports)) {
      if (V5_PREFIXES.some((p) => name === p || name.startsWith(p))) scan(name, value);
    }
    expect(offenders).toEqual([]);
  });
});

function collectSource(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectSource(full, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('FF-2b: geometry tokens never imported by components', () => {
  it('no source file outside tokens.ts references a *_GEO type token', () => {
    const offenders: string[] = [];
    for (const file of collectSource(SRC_DIR)) {
      if (file.endsWith(path.join('lib', 'ui', 'tokens.ts'))) continue;
      const source = readFileSync(file, 'utf8');
      if (/\bTYPE_[A-Z_]+_GEO\b/.test(source)) {
        offenders.push(path.relative(REPO_ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
