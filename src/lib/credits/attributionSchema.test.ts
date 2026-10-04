import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ALL_WORDS } from '../../data/vocabulary';
import type { AttributionManifest } from './attribution';

const MANIFEST_PATH = path.resolve(__dirname, '../../../public/attribution.json');
const PUBLIC_DIR = path.resolve(__dirname, '../../../public');

const COLLECTION_FIELDS = [
  'id',
  'title',
  'author',
  'license',
  'licenseLabel',
  'licenseUrl',
  'sourceUrl',
  'version',
  'paths',
  'modified',
] as const;

const IMAGE_FIELDS = [
  'wordId',
  'word',
  'file',
  'title',
  'creator',
  'creatorUrl',
  'license',
  'licenseVersion',
  'licenseUrl',
  'sourceUrl',
  'provider',
  'openverseId',
  'modified',
  'reviewStatus',
  'reviewedBy',
  'reviewedAt',
] as const;

describe('public/attribution.json schema (PRD 9.2, AC-4.9)', () => {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as AttributionManifest;

  it('has version 1 with collections and images arrays', () => {
    expect(manifest.version).toBe(1);
    expect(Array.isArray(manifest.collections)).toBe(true);
    expect(Array.isArray(manifest.images)).toBe(true);
  });

  it('every collection record carries all 9.2 fields', () => {
    for (const c of manifest.collections) {
      for (const field of COLLECTION_FIELDS) {
        expect(c, `collection ${c.id} missing ${field}`).toHaveProperty(field);
      }
      expect(Array.isArray(c.paths)).toBe(true);
      // CR-53: collections may legitimately be modified (e.g. rendered
      // glyph compositions); the field just has to be declared.
      expect(typeof c.modified).toBe('boolean');
    }
    expect(manifest.collections.map((c) => c.id)).toEqual(
      expect.arrayContaining(['twemoji', 'noto-animated-emoji']),
    );
  });

  it('every image record is complete, approved, cc0|by, and resolvable', () => {
    const wordIds = new Set(ALL_WORDS.map((w) => w.id));
    for (const img of manifest.images) {
      for (const field of IMAGE_FIELDS) {
        expect(img, `image ${img.wordId} missing ${field}`).toHaveProperty(field);
      }
      expect(['cc0', 'by']).toContain(img.license);
      expect(img.reviewStatus).toBe('approved');
      expect(img.reviewedBy).toBeTruthy();
      expect(img.reviewedAt).toBeTruthy();
      expect(wordIds.has(img.wordId)).toBe(true);
      expect(img.file).toMatch(/^\/images\/vocab\//);
      expect(existsSync(path.join(PUBLIC_DIR, img.file))).toBe(true);
      expect(img.modified).toBe(true);
    }
  });

  it('word.imageUrl points at a published file with an approved record (AC-4.9 direction)', () => {
    const approved = new Map(manifest.images.map((r) => [r.wordId, r]));
    for (const w of ALL_WORDS) {
      if (!w.imageUrl) continue;
      const record = approved.get(w.id);
      expect(record, `${w.id} has imageUrl but no approved attribution record`).toBeDefined();
      expect(record?.file).toBe(w.imageUrl);
      expect(existsSync(path.join(PUBLIC_DIR, w.imageUrl))).toBe(true);
    }
  });
});
