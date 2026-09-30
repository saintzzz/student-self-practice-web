import { describe, expect, it } from 'vitest';
import type { VocabWord } from '../../types';
import { ALL_WORDS } from '../../data/vocabulary';
import {
  blankOutWord,
  generateListeningSentenceFillBlankQuestions,
  sentenceClassFor,
} from './listeningSentenceFillBlank';
import baselineJson from './listeningSentenceFillBlank.baseline.json';

/**
 * PRD US-11 / BR-16 tests (category T-4: new file, no existing assertion
 * touched). Baseline JSON produced by scripts/dump-sentence-baseline.mjs at
 * commit ebd58a5 covers the 283 pre-feature words.
 */

const baseline = baselineJson as {
  wordIds: string[];
  questions: Record<string, { id: string; sentence: string; displaySentence: string }[]>;
};

/** The exact 71-word change list from PRD section 5.1 (word ids). */
const CHANGED_WORD_IDS = new Set([
  // g2-colors (9)
  'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'black', 'white', 'brown',
  // g2-family (7)
  'mom', 'dad', 'grandma', 'grandpa', 'sister', 'brother', 'baby',
  // g2-feelings (6 existing)
  'happy', 'sad', 'angry', 'scared', 'tired', 'surprised',
  // g2-body-parts (7)
  'eye', 'ear', 'hand', 'foot', 'nose', 'mouth', 'leg',
  // g2-numbers (10)
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  // g2-occupations (11)
  'doctor', 'teacher', 'farmer', 'policeman', 'firefighter', 'pilot',
  'astronaut', 'artist', 'builder', 'mechanic', 'scientist',
  // g2-sports (12 sport + 1 override)
  'basketball', 'tennis', 'badminton', 'volleyball', 'golf', 'bowling',
  'boxing', 'surfing', 'table-tennis', 'baseball', 'hockey', 'swimming',
  'skateboard',
  // g2-weather (6)
  'sun', 'rain', 'cloud', 'snow', 'wind', 'rainbow',
  // g2-nature overrides (2)
  'ocean', 'fire',
  // CR-16: g2-places moved to the 'place' class ("I go to the ...").
  'house', 'beach', 'street',
]);

function word(id: string): VocabWord {
  const found = ALL_WORDS.find((w) => w.id === id);
  if (!found) {
    throw new Error(`word id ${id} missing from vocabulary bank`);
  }
  return found;
}

describe('sentenceClassFor (AC-11.1, BR-16 precedence)', () => {
  it('maps every Table A topic to its class', () => {
    expect(sentenceClassFor(word('happy'))).toBe('feeling');
    expect(sentenceClassFor(word('doctor'))).toBe('occupation');
    expect(sentenceClassFor(word('mom'))).toBe('family');
    expect(sentenceClassFor(word('eye'))).toBe('body-part');
    expect(sentenceClassFor(word('red'))).toBe('color');
    expect(sentenceClassFor(word('seven'))).toBe('number');
    expect(sentenceClassFor(word('sun'))).toBe('the-noun');
    expect(sentenceClassFor(word('basketball'))).toBe('sport');
  });

  it('applies every Table B word-id override', () => {
    expect(sentenceClassFor(word('chef'))).toBe('occupation');
    expect(sentenceClassFor(word('moon'))).toBe('the-noun');
    expect(sentenceClassFor(word('ocean'))).toBe('the-noun');
    expect(sentenceClassFor(word('fire'))).toBe('the-noun');
    expect(sentenceClassFor(word('skateboard'))).toBe('countable');
  });

  it('keeps the actions topic and countable/mass defaults', () => {
    expect(sentenceClassFor(word('swim'))).toBe('action');
    expect(sentenceClassFor(word('cat'))).toBe('countable');
    expect(sentenceClassFor(word('rice'))).toBe('mass');
  });
});

describe('new template families produce grammatical sentences', () => {
  function sentencesFor(id: string): string[] {
    return generateListeningSentenceFillBlankQuestions([word(id)]).map((q) => q.sentence);
  }

  it('feelings read as adjectives (AC-11.2)', () => {
    for (const id of ['happy', 'sad', 'excited', 'sick', 'cold', 'hot']) {
      const sentences = sentencesFor(id);
      expect(sentences).toContain(`I am ${word(id).word}.`);
      expect(sentences).toContain(`I feel ${word(id).word}.`);
      expect(sentences.every((s) => !s.includes('I want some'))).toBe(true);
    }
  });

  it('occupations read as roles (AC-11.3)', () => {
    for (const id of ['doctor', 'chef']) {
      const w = word(id);
      const article = /^[aeiou]/i.test(w.word) ? 'an' : 'a';
      expect(sentencesFor(id)).toEqual([
        `He is ${article} ${w.word}.`,
        `I want to be ${article} ${w.word}.`,
      ]);
    }
  });

  it('family/body-part/color/number/the-noun/sport classes are grammatical (AC-11.4)', () => {
    expect(sentencesFor('mom')).toEqual(['This is my mom.', 'I love my mom.']);
    expect(sentencesFor('hand')).toEqual(['This is my hand.', 'Touch your hand.']);
    expect(sentencesFor('red')).toEqual(['I like red.', 'I can see red.', 'It is red.']);
    expect(sentencesFor('seven')).toEqual(['I can count to seven.']);
    expect(sentencesFor('sun')).toEqual(['I like the sun.', 'I can see the sun.']);
    expect(sentencesFor('tennis')).toEqual(['I like tennis.', 'Do you like tennis?']);
    expect(sentencesFor('moon')).toEqual(['I like the moon.', 'I can see the moon.']);
    expect(sentencesFor('skateboard')).toEqual([
      'I have a skateboard.',
      'I can see a skateboard.',
      'This is a skateboard.',
    ]);
  });
});

describe('baseline snapshot (AC-11.5, AC-11.6)', () => {
  const current = new Map<string, { id: string; sentence: string; displaySentence: string }[]>();
  for (const q of generateListeningSentenceFillBlankQuestions(ALL_WORDS)) {
    const list = current.get(q.wordId) ?? [];
    list.push({ id: q.id, sentence: q.sentence, displaySentence: q.displaySentence });
    current.set(q.wordId, list);
  }

  it('covers exactly the 283 baseline word ids', () => {
    expect(baseline.wordIds).toHaveLength(283);
    for (const id of baseline.wordIds) {
      expect(ALL_WORDS.some((w) => w.id === id), `baseline wordId ${id} must still exist`).toBe(true);
    }
  });

  it('every word outside the change list is byte-identical (AC-11.5)', () => {
    for (const id of baseline.wordIds) {
      if (CHANGED_WORD_IDS.has(id)) continue;
      expect(current.get(id), `questions for unchanged word ${id}`).toEqual(baseline.questions[id]);
    }
  });

  it('the changed set is exactly the 74 listed words (AC-11.6 + CR-16)', () => {
    const actuallyChanged = baseline.wordIds.filter(
      (id) => JSON.stringify(current.get(id)) !== JSON.stringify(baseline.questions[id]),
    );
    expect(new Set(actuallyChanged)).toEqual(CHANGED_WORD_IDS);
    expect(actuallyChanged).toHaveLength(74);
  });
});

describe('bank-wide invariants (AC-11.7)', () => {
  const questions = generateListeningSentenceFillBlankQuestions(ALL_WORDS);

  it('every generated question id is unique', () => {
    const ids = questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every sentence ends with "." or "?"', () => {
    for (const q of questions) {
      expect(
        /[.?]$/.test(q.sentence),
        `${q.id}: sentence "${q.sentence}" must end with "." or "?"`,
      ).toBe(true);
    }
  });

  it('blanking the word out of each sentence yields its displaySentence', () => {
    for (const q of questions) {
      expect(
        blankOutWord(q.sentence, q.word),
        `${q.id}: blankOutWord("${q.sentence}", "${q.word}")`,
      ).toBe(q.displaySentence);
    }
  });
});
