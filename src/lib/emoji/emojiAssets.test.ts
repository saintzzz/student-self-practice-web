import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { ALL_WORDS } from '../../data/vocabulary';
import { hasLottie, lottieUrl, svgUrl, toEmojiKey } from './emojiAssets';
import lottieKeys from './lottieKeys.generated.json';

const PUBLIC_DIR = path.resolve(__dirname, '../../../public');
const MASCOT = ['🐷', '✨', '🎉'];

describe('emoji asset coverage (AC-1.5)', () => {
  it('every bank + mascot emoji has a vendored Twemoji SVG', () => {
    const missing: string[] = [];
    for (const emoji of [...new Set(ALL_WORDS.map((w) => w.emoji)), ...MASCOT]) {
      const key = toEmojiKey(emoji);
      if (!existsSync(path.join(PUBLIC_DIR, 'emoji/svg', `${key}.svg`))) {
        missing.push(`${emoji} (${key})`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('svgUrl/lottieUrl are same-origin paths', () => {
    expect(svgUrl('1f431')).toMatch(/^\/?emoji\/svg\/1f431\.svg$/);
    expect(lottieUrl('2728')).toMatch(/^\/?emoji\/lottie\/2728\.json$/);
  });
});

describe('lottieKeys.generated.json <-> public/emoji/lottie bijection (ADR-4)', () => {
  it('manifest keys and files on disk match exactly', () => {
    const dir = path.join(PUBLIC_DIR, 'emoji/lottie');
    const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')) : [];
    const fileKeys = new Set(files.map((f) => f.replace(/\.json$/, '')));
    expect(new Set(lottieKeys as string[])).toEqual(fileKeys);
  });

  it('hasLottie reflects the manifest', () => {
    for (const key of ['2728', '1f389']) {
      expect(hasLottie(key)).toBe(true);
    }
    expect(hasLottie('1f437')).toBe(false); // pig has no Noto animation
    expect(hasLottie('dead-beef')).toBe(false);
  });
});
