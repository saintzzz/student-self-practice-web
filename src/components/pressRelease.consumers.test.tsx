import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * CR-82 (spec s16.1): every listed interactive consumer carries the
 * press-release micro-interaction - either a direct `usePressRelease`
 * spread (single-button surfaces) or the shared `PressableOptionButton`
 * shell (each instance owns a hook - required because option lists are
 * .map()-rendered and hooks cannot run inside the map body).
 *
 * Exam controls are EXCLUDED - the formal exam paper surface stays
 * press-release-free.
 */

const SRC = resolve(__dirname, '..');

function readSrc(rel: string): string {
  return readFileSync(resolve(SRC, rel), 'utf8');
}

const DIRECT_CONSUMERS = [
  'components/StartBatchScreen.tsx',
  'components/RoundSummary.tsx',
  'components/BatchSummary.tsx',
  'components/flashcards/FlashcardScreen.tsx',
  'components/DailyQuestCard.tsx',
];

const SHELL_OR_DIRECT_CONSUMERS = [
  'components/ImageChoiceQuestion.tsx',
  'components/ListeningImageChoiceQuestion.tsx',
  'components/CountingImageQuestion.tsx',
  'components/DescribeAndChooseImageQuestion.tsx',
  'components/PhonicsSoundChoiceQuestion.tsx',
  'components/PhonicsWordChoiceQuestion.tsx',
  'components/PhonicsEndingChoiceQuestion.tsx',
  'components/PhonicsRhymeChoiceQuestion.tsx',
  'components/ExtraLetterQuestion.tsx',
  'components/PicturePairMatchingQuestion.tsx',
  'components/drag/SpellItDrag.tsx',
  'components/drag/GapBankDrag.tsx',
  'components/PetCard.tsx',
];

describe('usePressRelease consumer coverage (CR-82 s16.1)', () => {
  it.each(DIRECT_CONSUMERS)('%s spreads usePressRelease', (rel) => {
    expect(readSrc(rel)).toMatch(/usePressRelease\(/);
  });

  it.each(SHELL_OR_DIRECT_CONSUMERS)(
    '%s uses usePressRelease or the PressableOptionButton shell',
    (rel) => {
      expect(readSrc(rel)).toMatch(/usePressRelease\(|PressableOptionButton/);
    },
  );

  it('PressableOptionButton owns the hook and composes external pointer handlers', () => {
    const src = readSrc('components/PressableOptionButton.tsx');
    expect(src).toMatch(/usePressRelease\(/);
    /* drag tiles must keep their gesture wiring - handlers compose. */
    expect(src).toMatch(/onPointerDown\?\.\(e\)/);
    expect(src).toMatch(/onPointerUp\?\.\(e\)/);
  });

  it('exam surfaces are press-release-free', () => {
    const examFiles = readdirSync(resolve(SRC, 'components'))
      .filter((f) => /^Exam.*\.tsx$/.test(f))
      .map((f) => `components/${f}`);
    expect(examFiles.length).toBeGreaterThan(0);
    for (const rel of examFiles) {
      expect(readSrc(rel), rel).not.toMatch(/usePressRelease|PressableOptionButton/);
    }
  });

  it('every optionButtonStyle consumer carries press release', () => {
    const optionUsers = SHELL_OR_DIRECT_CONSUMERS.filter((f) =>
      /components\/(ImageChoice|ListeningImageChoice|CountingImage|DescribeAndChooseImage|Phonics(Sound|Word|Ending|Rhyme)Choice)Question\.tsx$/.test(f),
    );
    expect(optionUsers).toHaveLength(8);
  });
});
