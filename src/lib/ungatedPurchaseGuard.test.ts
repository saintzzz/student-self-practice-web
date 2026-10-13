import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * kids-UX step 13 fitness function: purchase/pricing surfaces must never
 * render to the child without passing through the parent gate. The rule:
 * PricingCard may only be mounted inside files that ALSO reference the
 * parent-gate mechanism (ParentGate/isParentVerified/GatedLink) or are
 * themselves the parent report surface. Any other component importing
 * PricingCard fails the gate.
 */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(REPO_ROOT, 'src');
/** Parent-owned surfaces where PricingCard is allowed without an inline gate. */
const PARENT_SURFACES = new Set(['ParentReportScreen.tsx', 'PricingCard.tsx']);

function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) collectFiles(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe('ungated purchase guard (kids-UX)', () => {
  it('PricingCard is only mounted on gated or parent-owned surfaces', () => {
    const offenders: string[] = [];
    for (const file of collectFiles(SRC)) {
      const rel = path.relative(REPO_ROOT, file);
      if (rel.endsWith('.test.tsx') || rel.endsWith('.test.ts')) continue;
      const content = readFileSync(file, 'utf8');
      if (!content.includes('PricingCard')) continue;
      if (PARENT_SURFACES.has(path.basename(file))) continue;
      const gated =
        content.includes('ParentGate') ||
        content.includes('isParentVerified') ||
        content.includes('GatedLink');
      if (!gated) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });
});
