import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ALL_WORDS } from '../../data/vocabulary';
import { toEmojiKey } from './emojiKey';

describe('toEmojiKey (AC-1.6, ADR-3)', () => {
  it.each([
    ['🐱', '1f431'],
    ['🐿️', '1f43f'],
    ['✈️', '2708'],
    ['1️⃣', '31-20e3'],
    ['🔟', '1f51f'],
    ['🧑‍⚕️', '1f9d1-200d-2695-fe0f'],
    ['🧑‍🍳', '1f9d1-200d-1f373'],
  ])('maps %s -> %s', (emoji, expected) => {
    expect(toEmojiKey(emoji)).toBe(expected);
  });

  it('produces a non-empty lowercase hex key for every bank emoji', () => {
    for (const word of ALL_WORDS) {
      const key = toEmojiKey(word.emoji);
      expect(key, `${word.id} (${word.emoji})`).toMatch(/^[0-9a-f]+(-[0-9a-f]+)*$/);
    }
  });

  it('strips FE0F unless a ZWJ is present', () => {
    expect(toEmojiKey('✈️')).toBe('2708'); // fe0f stripped, no zwj
    expect(toEmojiKey('☀️')).toBe('2600');
  });
});

describe('parity with scripts/lib/emojiKey.mjs (ADR-3 drift guard)', () => {
  const scriptUrl = pathToFileURL(
    path.resolve(__dirname, '../../../scripts/lib/emojiKey.mjs'),
  ).href;

  function scriptKey(emoji: string): string {
    return execFileSync(
      process.execPath,
      ['-e', `import('${scriptUrl}').then(m=>console.log(m.toEmojiKey(${JSON.stringify(emoji)})))`],
      { encoding: 'utf8' },
    ).trim();
  }

  it('matches on the design-spec examples', () => {
    for (const emoji of ['🐱', '🐿️', '✈️', '1️⃣', '🔟', '🧑‍⚕️', '🧑‍🍳']) {
      expect(scriptKey(emoji)).toBe(toEmojiKey(emoji));
    }
  });

  it('matches on every distinct bank emoji', () => {
    const distinct = [...new Set(ALL_WORDS.map((w) => w.emoji))];
    const expr =
      `import('${scriptUrl}').then(m=>{` +
      `const a=${JSON.stringify(distinct)};` +
      `console.log(JSON.stringify(a.map(e=>m.toEmojiKey(e))))})`;
    const out = JSON.parse(execFileSync(process.execPath, ['-e', expr], { encoding: 'utf8' }));
    expect(out).toEqual(distinct.map(toEmojiKey));
  });
});
