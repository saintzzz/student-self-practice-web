import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readReviewStore,
  saveFlashRating,
  __resetFlashReviewSession,
} from './reviewStore';

/**
 * CR-82 (R-v5-11): the flash-review store is local-only, capped, and
 * degrades silently - corrupt data reads as empty and storage failures
 * fall back to session memory without throwing.
 */

const GRADE = 'grade-2';
const KEY = `ea-flash-review:${GRADE}`;

beforeEach(() => {
  window.localStorage.clear();
  __resetFlashReviewSession();
});

describe('reviewStore', () => {
  it('returns an empty map when nothing is stored', () => {
    expect(readReviewStore(GRADE).size).toBe(0);
  });

  it('persists a rating and reads it back', () => {
    saveFlashRating(GRADE, 'apple', 'k', 1000);
    saveFlashRating(GRADE, 'book', 'a', 2000);

    const map = readReviewStore(GRADE);
    expect(map.get('apple')).toEqual({ r: 'k', t: 1000 });
    expect(map.get('book')).toEqual({ r: 'a', t: 2000 });
  });

  it('re-rating a word overwrites the previous entry', () => {
    saveFlashRating(GRADE, 'apple', 'a', 1000);
    saveFlashRating(GRADE, 'apple', 'k', 3000);

    expect(readReviewStore(GRADE).get('apple')).toEqual({ r: 'k', t: 3000 });
  });

  it('grades are namespaced - a rating for grade-2 never leaks to grade-3', () => {
    saveFlashRating(GRADE, 'apple', 'k', 1000);
    expect(readReviewStore('grade-3').size).toBe(0);
  });

  it('corrupt JSON reads as empty and is rewritten on next save', () => {
    window.localStorage.setItem(KEY, '{not json');
    expect(readReviewStore(GRADE).size).toBe(0);

    saveFlashRating(GRADE, 'apple', 'k', 1000);
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toMatchObject({ v: 1 });
    expect(readReviewStore(GRADE).get('apple')).toEqual({ r: 'k', t: 1000 });
  });

  it('a wrong schema version reads as empty', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ v: 99, e: { apple: { r: 'k', t: 1 } } }));
    expect(readReviewStore(GRADE).size).toBe(0);
  });

  it('invalid entries inside a valid blob are dropped, valid ones kept', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        v: 1,
        e: {
          apple: { r: 'k', t: 1 },
          bad1: { r: 'x', t: 2 },
          bad2: 'nope',
          bad3: { r: 'a' },
          book: { r: 'a', t: 4 },
        },
      }),
    );
    const map = readReviewStore(GRADE);
    expect(map.size).toBe(2);
    expect(map.get('apple')).toEqual({ r: 'k', t: 1 });
    expect(map.get('book')).toEqual({ r: 'a', t: 4 });
  });

  it('caps at 200 entries, evicting the oldest timestamps', () => {
    const entries: Record<string, { r: string; t: number }> = {};
    for (let i = 0; i < 210; i += 1) entries[`w${i}`] = { r: 'k', t: i };
    window.localStorage.setItem(KEY, JSON.stringify({ v: 1, e: entries }));

    saveFlashRating(GRADE, 'newest', 'a', 5000);

    const map = readReviewStore(GRADE);
    expect(map.size).toBe(200);
    expect(map.get('newest')).toEqual({ r: 'a', t: 5000 });
    // 210 stored + 1 new = 211 entries; the eleven oldest (w0..w10)
    // are evicted - w11 (t=11) is the oldest survivor.
    expect(map.has('w0')).toBe(false);
    expect(map.has('w10')).toBe(false);
    expect(map.has('w11')).toBe(true);
  });

  it('storage write failure never throws and the rating still reads back this session', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota');
      });
    try {
      expect(() => saveFlashRating(GRADE, 'apple', 'k', 1000)).not.toThrow();
      expect(readReviewStore(GRADE).get('apple')).toEqual({ r: 'k', t: 1000 });
    } finally {
      spy.mockRestore();
    }
  });

  it('a successful write after a failure persists the earlier session ratings (r34-B3)', () => {
    /* First write fails -> rating lives only in the session spill. The
       next write (storage recovered) must carry the spilled rating
       into storage instead of discarding it. */
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementationOnce(() => {
        throw new Error('quota');
      });
    saveFlashRating(GRADE, 'apple', 'a', 1000); // lands in spill only
    saveFlashRating(GRADE, 'book', 'k', 2000); // storage recovers
    spy.mockRestore();

    const stored = window.localStorage.getItem(KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!) as { e: Record<string, { r: string; t: number }> };
    expect(parsed.e['apple']).toEqual({ r: 'a', t: 1000 });
    expect(parsed.e['book']).toEqual({ r: 'k', t: 2000 });
    expect(readReviewStore(GRADE).get('apple')).toEqual({ r: 'a', t: 1000 });
  });
});
