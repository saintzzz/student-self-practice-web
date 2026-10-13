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
