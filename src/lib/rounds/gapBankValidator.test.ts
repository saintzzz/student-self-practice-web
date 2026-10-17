import { describe, expect, it } from 'vitest';
import type { ListeningSentenceFillBlankQuestion, VocabWord } from '../../types';
import { norm, pickGapBank, validateGapBank } from './gapBankValidator';
import { blankOutWord } from '../generators/listeningSentenceFillBlank';

/**
 * CR-82 (DESIGN-SPEC-v5 s13.5 item 5): the required fixture matrix - one
 * fixture per rejection type plus the two eligible baselines and the
 * generator walk. Fixture VocabWords reuse REAL topicIds so
 * `sentenceClassFor` resolves the same classes production sees.
 */

let seq = 0;
function word(partial: Partial<VocabWord> & { word: string }): VocabWord {
  seq += 1;
  return {
    id: partial.id ?? `fx-${seq}`,
    topicId: partial.topicId ?? 'g2-animals',
    word: partial.word,
    plural: partial.plural,
    emoji: '🐾',
    countable: partial.countable ?? true,
    explanation: `fixture ${partial.word}`,
  };
}

let qSeq = 0;
function questionFor(answer: VocabWord, sentence: string): ListeningSentenceFillBlankQuestion {
  qSeq += 1;
  return {
    id: `fx-q-${qSeq}`,
    topicId: answer.topicId,
    kind: 'listening-sentence-fill-blank',
    word: answer.word,
    wordId: answer.id,
    sentence,
    displaySentence: blankOutWord(sentence, answer.word),
    explanation: answer.explanation,
  };
}

function check(
  question: ListeningSentenceFillBlankQuestion,
  answer: VocabWord,
  distractors: readonly VocabWord[],
  audio: 'sentence' | 'none' = 'sentence',
) {
  return validateGapBank({ question, answer, distractors, audio });
}

describe('norm', () => {
  it('normalizes case, punctuation and whitespace', () => {
    expect(norm('Dog.')).toBe('dog');
    expect(norm(' dog')).toBe('dog');
    expect(norm('DOG')).toBe('dog');
    expect(norm('  Teddy   Bear! ')).toBe('teddy bear');
    expect(norm('yo-yo')).toBe('yo yo');
  });
});

describe('validateGapBank - spec s13.5 fixtures', () => {
  /* 1 - eligible baseline (countable animal, "I can see a ___"). */
  it('fixture 1: cat + dog/bird is eligible', () => {
    const answer = word({ id: 'cat', word: 'cat' });
    const q = questionFor(answer, 'I can see a cat.');
    const result = check(q, answer, [word({ id: 'dog', word: 'dog' }), word({ id: 'bird', word: 'bird' })]);
    expect(result.eligible, result.reasons.join('; ')).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  /* 2 - eligible weekday-style set: identical frames, audio selects. */
  it('fixture 2: same-frame set (Monday + Tuesday/Friday) is eligible', () => {
    const answer = word({ id: 'monday', topicId: 'g2-colors', word: 'Monday', countable: false });
    const q = questionFor(answer, 'I like Monday.');
    const result = check(q, answer, [
      word({ id: 'tuesday', topicId: 'g2-colors', word: 'Tuesday', countable: false }),
      word({ id: 'friday', topicId: 'g2-colors', word: 'Friday', countable: false }),
    ]);
    expect(result.eligible, result.reasons.join('; ')).toBe(true);
  });

  it('fixture 3: one distractor only -> V0', () => {
    const answer = word({ id: 'cat', word: 'cat' });
    const q = questionFor(answer, 'I can see a cat.');
    const result = check(q, answer, [word({ id: 'dog', word: 'dog' })]);
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.startsWith('V0'))).toBe(true);
  });

  it('fixture 4: three distractors -> V0', () => {
    const answer = word({ id: 'cat', word: 'cat' });
    const q = questionFor(answer, 'I can see a cat.');
    const result = check(q, answer, [
      word({ id: 'dog', word: 'dog' }),
      word({ id: 'bird', word: 'bird' }),
      word({ id: 'fish', word: 'fish' }),
    ]);
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.startsWith('V0'))).toBe(true);
  });

  it.each(['  ', '.'])('fixture 5: distractor "%s" empty after norm -> V0', (blank) => {
    const answer = word({ id: 'cat', word: 'cat' });
    const q = questionFor(answer, 'I can see a cat.');
    const result = check(q, answer, [word({ id: 'dog', word: 'dog' }), word({ word: blank })]);
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.startsWith('V0'))).toBe(true);
  });

  it('fixture 6: answer twice in the sentence -> V1', () => {
    const answer = word({ id: 'cat', word: 'cat' });
    const q = questionFor(answer, 'I can see a cat and the cat sleeps.');
    // displaySentence built from the same sentence only blanks the first
    // occurrence - the leftover "cat" also trips V6 for the answer.
    const result = check(q, answer, [word({ id: 'dog', word: 'dog' }), word({ id: 'bird', word: 'bird' })]);
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.startsWith('V1'))).toBe(true);
  });

  it('fixture 7: within-topic category mismatch (spoon + chef/jar) -> V2', () => {
    const answer = word({ id: 'spoon', topicId: 'g2-kitchen', word: 'spoon' });
    const q = questionFor(answer, 'I have a spoon.');
    const result = check(q, answer, [
      word({ id: 'chef', topicId: 'g2-kitchen', word: 'chef', countable: false }),
      word({ id: 'jar', topicId: 'g2-kitchen', word: 'jar' }),
    ]);
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.startsWith('V2') && r.includes('chef'))).toBe(true);
  });

  it('fixture 8: mass/countable mismatch (spoon + salt/jar) -> V2', () => {
    const answer = word({ id: 'spoon', topicId: 'g2-kitchen', word: 'spoon' });
    const q = questionFor(answer, 'I have a spoon.');
    const result = check(q, answer, [
      word({ id: 'salt', topicId: 'g2-kitchen', word: 'salt', countable: false }),
      word({ id: 'jar', topicId: 'g2-kitchen', word: 'jar' }),
    ]);
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.startsWith('V2') && r.includes('salt'))).toBe(true);
  });

  it('fixture 9: article mismatch (cat + owl/dog) -> V2', () => {
    const answer = word({ id: 'cat', word: 'cat' });
    const q = questionFor(answer, 'I can see a cat.');
    const result = check(q, answer, [
      word({ id: 'owl', word: 'owl' }),
      word({ id: 'dog', word: 'dog' }),
    ]);
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.startsWith('V2') && r.includes('owl'))).toBe(true);
  });

  it('fixture 10: topic not in GAP_BANK_TOPICS -> V3', () => {
    const answer = word({ id: 'cat', topicId: 'g99-unreviewed', word: 'cat' });
    const q = questionFor(answer, 'I can see a cat.');
    const result = check(q, answer, [
      word({ id: 'dog', topicId: 'g99-unreviewed', word: 'dog' }),
      word({ id: 'bird', topicId: 'g99-unreviewed', word: 'bird' }),
    ]);
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.startsWith('V3'))).toBe(true);
  });

  it('fixture 11: group mismatch inside an allowlisted grouped topic -> V3', () => {
    /* ice (foods group) + salt (foods) + chopsticks (utensils group):
       every other rule passes - the reviewed group is the sole gate. */
    const answer = word({ id: 'ice', topicId: 'g2-kitchen', word: 'ice', countable: false });
    const q = questionFor(answer, 'I like ice.');
    const result = check(q, answer, [
      word({ id: 'salt', topicId: 'g2-kitchen', word: 'salt', countable: false }),
      word({ id: 'chopsticks', topicId: 'g2-kitchen', word: 'chopsticks', countable: false }),
    ]);
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.startsWith('V3'))).toBe(true);
  });

  it('fixture 12: mixed-category set (weekday + Holiday/Weekend) -> V2/V3', () => {
    const answer = word({ id: 'monday', topicId: 'g2-colors', word: 'Monday', countable: false });
    const q = questionFor(answer, 'I like Monday.');
    const result = check(q, answer, [
      /* 'weekend' has a real WORD_ID_OVERRIDES entry ('the-noun') so its
         frames ("I like the ___") never match the bare "I like ___" stem. */
      word({ id: 'weekend', topicId: 'g2-colors', word: 'weekend', countable: false }),
      word({ id: 'holiday', topicId: 'g99-unreviewed', word: 'holiday', countable: false }),
    ]);
    expect(result.eligible).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('fixture 13: duplicate distractors dog/dog -> V4', () => {
    const answer = word({ id: 'cat', word: 'cat' });
    const q = questionFor(answer, 'I can see a cat.');
    const result = check(q, answer, [
      word({ id: 'dog-a', word: 'dog' }),
      word({ id: 'dog-b', word: 'dog' }),
    ]);
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.startsWith('V4'))).toBe(true);
  });

  it('fixture 14: normalized duplicate Dog/dog. -> V4', () => {
    const answer = word({ id: 'cat', word: 'cat' });
    const q = questionFor(answer, 'I can see a cat.');
    const result = check(q, answer, [
      word({ id: 'dog-a', word: 'Dog' }),
      word({ id: 'dog-b', word: 'dog.' }),
    ]);
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.startsWith('V4'))).toBe(true);
  });

  it('fixture 15: plural pair among distractors cats/cat (answer dog) -> V4', () => {
    const answer = word({ id: 'dog', word: 'dog' });
    const q = questionFor(answer, 'I can see a dog.');
    const result = check(q, answer, [
      word({ id: 'cats', word: 'cats' }),
      word({ id: 'cat', word: 'cat', plural: 'cats' }),
    ]);
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.startsWith('V4'))).toBe(true);
  });

  it('fixture 16: homophone with answer (four / for) -> V4', () => {
    const answer = word({ id: 'four', topicId: 'g2-numbers', word: 'four', countable: false });
    const q = questionFor(answer, 'I can count to four.');
    const result = check(q, answer, [
      word({ id: 'for', topicId: 'g2-numbers', word: 'for', countable: false }),
      word({ id: 'seven', topicId: 'g2-numbers', word: 'seven', countable: false }),
    ]);
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.startsWith('V4'))).toBe(true);
  });

  it('fixture 17: minimal pair with answer cat/hat -> V5', () => {
    const answer = word({ id: 'cat', word: 'cat' });
    const q = questionFor(answer, 'I can see a cat.');
    const result = check(q, answer, [
      word({ id: 'hat', word: 'hat' }),
      word({ id: 'dog', word: 'dog' }),
    ]);
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.startsWith('V5'))).toBe(true);
  });

  it('fixture 18: stem leak (distractor printed in the sentence) -> V6', () => {
    const answer = word({ id: 'cat', word: 'cat' });
    const q = questionFor(answer, 'I can see a cat near the dog.');
    const result = check(q, answer, [
      word({ id: 'dog', word: 'dog' }),
      word({ id: 'bird', word: 'bird' }),
    ]);
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.startsWith('V6') && r.includes('dog'))).toBe(true);
  });

  it('fixture 19: silent context-only variant -> V7', () => {
    const answer = word({ id: 'cat', word: 'cat' });
    const q = questionFor(answer, 'I can see a cat.');
    const result = check(q, answer, [word({ id: 'dog', word: 'dog' }), word({ id: 'bird', word: 'bird' })], 'none');
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.startsWith('V7'))).toBe(true);
  });
});

describe('pickGapBank - fixture 20 + bank shape', () => {
  it('returns null when the pool has only one valid distractor (never padded)', () => {
    const answer = word({ id: 'cat', word: 'cat' });
    const q = questionFor(answer, 'I can see a cat.');
    /* Pool: answer + 'dog' (the only frame/audible-valid candidate) +
       'hat' (V5 minimal pair). No pair of valid distractors exists. */
    const pool = [answer, word({ id: 'dog', word: 'dog' }), word({ id: 'hat', word: 'hat' })];
    expect(pickGapBank(q, pool, 'seed-20')).toBeNull();
  });

  it('returns the answer plus exactly 2 same-topic distractors, shuffled, with word ids', () => {
    const answer = word({ id: 'cat', word: 'cat' });
    const dog = word({ id: 'dog', word: 'dog' });
    const bird = word({ id: 'bird', word: 'bird' });
    const q = questionFor(answer, 'I can see a cat.');
    const bank = pickGapBank(q, [answer, dog, bird], 'seed-bank');
    expect(bank).not.toBeNull();
    expect(bank!.options).toHaveLength(3);
    expect([...bank!.options].sort()).toEqual(['bird', 'cat', 'dog']);
    expect(bank!.optionWordIds[bank!.options.indexOf('cat')]).toBe('cat');
    expect(bank!.optionWordIds[bank!.options.indexOf('dog')]).toBe('dog');
    expect(bank!.optionWordIds[bank!.options.indexOf('bird')]).toBe('bird');
  });

  it('is deterministic per seed', () => {
    const answer = word({ id: 'cat', word: 'cat' });
    const pool = [answer, word({ id: 'dog', word: 'dog' }), word({ id: 'bird', word: 'bird' }), word({ id: 'fish', word: 'fish' })];
    const q = questionFor(answer, 'I can see a cat.');
    const a = pickGapBank(q, pool, 'seed-det');
    const b = pickGapBank(q, pool, 'seed-det');
    expect(a).toEqual(b);
  });
});
