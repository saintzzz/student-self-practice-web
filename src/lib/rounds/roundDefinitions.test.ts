import { describe, expect, it } from 'vitest';
import { ROUND_DEFINITIONS } from './roundDefinitions';

describe('ROUND_DEFINITIONS (AC17 - a Batch is exactly 4 fixed-order Rounds)', () => {
  it('has exactly 4 rounds', () => {
    expect(ROUND_DEFINITIONS).toHaveLength(4);
  });

  it('is in fixed order: extra-letter, listening-sentence-fill-blank, pronunciation-recording, describe-and-choose-image', () => {
    expect(ROUND_DEFINITIONS.map((r) => r.roundType)).toEqual([
      'extra-letter',
      'listening-sentence-fill-blank',
      'pronunciation-recording',
      'describe-and-choose-image',
    ]);
  });

  it('numbers rounds 1 through 4 in order', () => {
    expect(ROUND_DEFINITIONS.map((r) => r.roundNumber)).toEqual([1, 2, 3, 4]);
  });

  it('Round 1 and Round 2 have real content generators wired in', () => {
    expect(ROUND_DEFINITIONS[0]?.buildQuestions).toBeTypeOf('function');
    expect(ROUND_DEFINITIONS[1]?.buildQuestions).toBeTypeOf('function');
  });

  it('Round 3 and Round 4 are explicit placeholders with no generator yet', () => {
    expect(ROUND_DEFINITIONS[2]?.buildQuestions).toBeUndefined();
    expect(ROUND_DEFINITIONS[3]?.buildQuestions).toBeUndefined();
  });

  it('every round has a non-empty Vietnamese title with no em-dash', () => {
    for (const round of ROUND_DEFINITIONS) {
      expect(round.titleVi.length).toBeGreaterThan(0);
      expect(round.titleVi).not.toContain('—');
    }
  });
});
