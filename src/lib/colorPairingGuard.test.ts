import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * CR-69 regression gate: the RoundSummary sticker chip shipped
 * `bg-amber-100` + `text-amber-100` - identical hue+shade on both sides
 * makes the label invisible. This guard fails the suite if any source
 * line pairs `bg-{hue}-{shade}` with `text-{same-hue}-{same-shade}`.
 * Line-scoped so a dark-bg text-{hue}-100 elsewhere in the same file is
 * not a false positive.
 */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC_DIR = path.join(REPO_ROOT, 'src');

const BG = /\bbg-([a-z]+)-(\d{2,3})\b/;
const TEXT = (hue: string, shade: string) => new RegExp(`\\btext-${hue}-${shade}\\b`);

function collectTsx(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectTsx(full, out);
    } else if (/\.tsx$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('same-shade bg/text pairing guard (CR-69)', () => {
  it('no source line pairs bg-{hue}-{shade} with text-{same-hue}-{same-shade}', () => {
    const offenders: string[] = [];
    for (const file of collectTsx(SRC_DIR)) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        const bg = line.match(BG);
        if (bg && TEXT(bg[1], bg[2]).test(line)) {
          offenders.push(`${path.relative(REPO_ROOT, file)}:${i + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it('sanity: the guard detects the original sticker-chip bug', () => {
    const buggy = 'className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-100"';
    const bg = buggy.match(BG)!;
    expect(TEXT(bg[1], bg[2]).test(buggy)).toBe(true);
    const fine = 'className="bg-amber-100 text-amber-900"';
    const bg2 = fine.match(BG)!;
    expect(TEXT(bg2[1], bg2[2]).test(fine)).toBe(false);
  });
});

/**
 * CR-82 (DESIGN-SPEC-v5 s5.3 rule 3, FF-3): same-element paper surface +
 * light ink literal. The effective painted surface is the nearest
 * ancestor-or-self background at >=80% opacity - a literal
 * `bg-{paper}` + light `text-*` on one line is the only shape this
 * line-scoped scanner can catch (spec narrowing).
 */
const PAPER_BG = /\bbg-(white(?!\/\d)|slate-50|amber-50|orange-50|sky-50|[a-z]+-50(?:\/9\d)?|[a-z]+-100(?:\/9\d)?)\b/;
const LIGHT_TEXT = /\btext-(white|amber-[123]00|sky-[123]00|slate-[123]00|emerald-[123]00|rose-[123]00|orange-[123]00|lime-[123]00)\b/;
// Same-element approximation: the paper background must precede the light
// text literal on the line (a ternary like `'bg-blue-600 text-white' :
// 'bg-sky-100 text-sky-700'` is NOT a violation).
const PAPER_THEN_LIGHT = new RegExp(`${PAPER_BG.source}[\\s\\S]*${LIGHT_TEXT.source}`);

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

describe('paper surface + light ink guard (CR-82 FF-3)', () => {
  it('no source line pairs a paper background with a light text literal', () => {
    const offenders: string[] = [];
    for (const file of collectSource(SRC_DIR)) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (PAPER_THEN_LIGHT.test(line)) {
          offenders.push(`${path.relative(REPO_ROOT, file)}:${i + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it('sanity: catches the rev-1 flashcard bug shape', () => {
    const bad = `className="bg-amber-50 text-amber-100"`; // 1.07:1 paper+light
    expect(PAPER_THEN_LIGHT.test(bad)).toBe(true);
    const good = `className="bg-amber-50 text-navy-800"`;
    expect(PAPER_THEN_LIGHT.test(good)).toBe(false);
    const translucent = `className="bg-white/10 text-white"`; // not paper
    expect(PAPER_THEN_LIGHT.test(translucent)).toBe(false);
    const ternary = `status === s ? 'bg-blue-600 text-white' : 'bg-sky-100 text-sky-700'`;
    expect(PAPER_THEN_LIGHT.test(ternary)).toBe(false);
  });
});
