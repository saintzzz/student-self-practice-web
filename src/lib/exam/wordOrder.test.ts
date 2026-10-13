import { describe, expect, it } from 'vitest';
import { acceptedWordOrders, isWordOrderCorrect } from './wordOrder';
import { REORDER_G3, REORDER_G45 } from '../../data/reorderBank';
import { getWordsByGrade } from '../../data/vocabulary';
import { sentencesForWord } from '../generators/listeningSentenceFillBlank';

// external-review r4: punctuation emitted as its own tile joins with a
// space ("home ."), and a bare strip left a trailing space so every
// correct answer scored wrong.
describe('isWordOrderCorrect', () => {
  it('accepts correct order when the final period is its own tile', () => {
    expect(isWordOrderCorrect('I go home.', ['I', 'go', 'home', '.'])).toBe(true);
  });

  it('accepts correct order when punctuation is glued to the last word', () => {
    expect(isWordOrderCorrect('I go home.', ['I', 'go', 'home.'])).toBe(true);
  });

  it('accepts correct order when the sentence has no punctuation', () => {
    expect(isWordOrderCorrect('I love father', ['I', 'love', 'father'])).toBe(true);
  });

  it('ignores case differences', () => {
    expect(isWordOrderCorrect('we eat mooncakes.', ['We', 'eat', 'mooncakes.'])).toBe(true);
  });

  it('accepts correct order with an internal comma tile (r5)', () => {
    expect(isWordOrderCorrect('Yesterday, I played.', ['Yesterday', ',', 'I', 'played', '.'])).toBe(true);
  });

  it('accepts correct order when the comma is glued to its word', () => {
    expect(isWordOrderCorrect('Yesterday, I played.', ['Yesterday,', 'I', 'played.'])).toBe(true);
  });

  it('rejects wrong order', () => {
    expect(isWordOrderCorrect('I go home.', ['go', 'I', 'home.'])).toBe(false);
  });

  it('rejects a different sentence sharing the same words', () => {
    expect(isWordOrderCorrect('She is my mother.', ['my', 'She', 'is', 'mother.'])).toBe(false);
  });

  // Content audit 2026-10: valid grammatical alternates of authored
  // reorderBank sentences must not score wrong.
  it('accepts a fronted sentence-final time adjunct', () => {
    expect(
      isWordOrderCorrect('My father drives me to school every day.', [
        'Every', 'day', 'my', 'father', 'drives', 'me', 'to', 'school.',
      ]),
    ).toBe(true);
  });

  it('accepts a fronted place adjunct', () => {
    expect(
      isWordOrderCorrect('She is reading a book in the library.', [
        'In', 'the', 'library', 'she', 'is', 'reading', 'a', 'book.',
      ]),
    ).toBe(true);
  });

  it('accepts a fronted medial adverb', () => {
    expect(
      isWordOrderCorrect('I usually get up at six o\'clock.', [
        'Usually', 'I', 'get', 'up', 'at', 'six', "o'clock.",
      ]),
    ).toBe(true);
  });

  it('accepts subject-auxiliary inversion on a declarative', () => {
    expect(
      isWordOrderCorrect('She is reading a book in the library.', [
        'Is', 'she', 'reading', 'a', 'book', 'in', 'the', 'library?',
      ]),
    ).toBe(true);
  });

  it('accepts a conjunct swap', () => {
    expect(
      isWordOrderCorrect('We have English and maths on Mondays.', [
        'We', 'have', 'maths', 'and', 'English', 'on', 'Mondays.',
      ]),
    ).toBe(true);
  });

  it('accepts the declarative order of an authored question', () => {
    expect(
      isWordOrderCorrect('Would you like some orange juice?', [
        'You', 'would', 'like', 'some', 'orange', 'juice.',
      ]),
    ).toBe(true);
  });

  it('accepts a locative adjunct fronting', () => {
    expect(
      isWordOrderCorrect('There is a big garden behind my house.', [
        'Behind', 'my', 'house', 'there', 'is', 'a', 'big', 'garden.',
      ]),
    ).toBe(true);
  });

  it('rejects inversion across a wh-phrase', () => {
    expect(
      isWordOrderCorrect('How many students are there in your class?', [
        'Are', 'how', 'many', 'students', 'there', 'in', 'your', 'class?',
      ]),
    ).toBe(false);
  });

  it('rejects inversion across a wh-word question', () => {
    expect(
      isWordOrderCorrect('What do you do at break time?', [
        'Do', 'what', 'you', 'do', 'at', 'break', 'time?',
      ]),
    ).toBe(false);
  });

  it('rejects a random shuffle that is not grammatical', () => {
    expect(
      isWordOrderCorrect('I usually get up at six o\'clock.', [
        'Up', 'get', 'usually', 'I', "o'clock", 'six', 'at.',
      ]),
    ).toBe(false);
  });

  // Round-2 review: transformations must not produce broken English.
  it('rejects have/do-as-main-verb inversion', () => {
    expect(
      isWordOrderCorrect('I have a dog.', ['Have', 'I', 'a', 'dog?']),
    ).toBe(false);
    expect(
      isWordOrderCorrect('We have English and maths on Mondays.', [
        'Have', 'we', 'English', 'and', 'maths', 'on', 'Mondays?',
      ]),
    ).toBe(false);
    expect(
      isWordOrderCorrect('They had a picnic by the lake last Sunday.', [
        'Had', 'they', 'a', 'picnic', 'by', 'the', 'lake', 'last', 'Sunday?',
      ]),
    ).toBe(false);
  });

  it('rejects conjunct swaps that garble noun phrases', () => {
    expect(
      isWordOrderCorrect('I have a pen and a ruler.', [
        'I', 'have', 'a', 'a', 'and', 'pen', 'ruler.',
      ]),
    ).toBe(false);
    expect(
      isWordOrderCorrect('I am from Saint Vincent and the Grenadines.', [
        'I', 'am', 'from', 'Saint', 'the', 'and', 'Vincent', 'Grenadines.',
      ]),
    ).toBe(false);
    expect(
      isWordOrderCorrect('I am from Saint Kitts and Nevis.', [
        'I', 'am', 'from', 'Saint', 'Nevis', 'and', 'Kitts.',
      ]),
    ).toBe(false);
  });

  it('rejects adjunct fronting that strands a be-verb complement', () => {
    expect(
      isWordOrderCorrect('Our classroom is on the second floor.', [
        'On', 'the', 'second', 'floor', 'our', 'classroom', 'is.',
      ]),
    ).toBe(false);
    expect(
      isWordOrderCorrect('I am at school.', ['At', 'school', 'I', 'am.']),
    ).toBe(false);
    expect(
      isWordOrderCorrect('She is good at maths.', ['At', 'maths', 'she', 'is', 'good.']),
    ).toBe(false);
  });

  it('rejects fronting a noun-phrase fragment', () => {
    expect(
      isWordOrderCorrect('I read the last page.', ['Last', 'page', 'I', 'read', 'the.']),
    ).toBe(false);
  });

  it('rejects inversion of an auxiliary inside a subordinate clause', () => {
    expect(
      isWordOrderCorrect('I think it is big.', ['Is', 'I', 'think', 'it', 'big?']),
    ).toBe(false);
    expect(
      isWordOrderCorrect('Yes, I can.', ['Can', 'yes', 'I?']),
    ).toBe(false);
  });

  it('rejects de-inversion of an imperative', () => {
    expect(
      isWordOrderCorrect('Have a nice day.', ['A', 'have', 'nice', 'day.']),
    ).toBe(false);
  });

  it('still accepts passive-adjunct fronting', () => {
    expect(
      isWordOrderCorrect('I was born in a small village in 2015.', [
        'In', 'a', 'small', 'village', 'in', '2015', 'I', 'was', 'born.',
      ]),
    ).toBe(true);
  });

  // Round-3 review regressions.
  it('accepts adjunct fronting after an object pronoun', () => {
    // "her" is the OBJECT pronoun here, not a possessive determiner -
    // "next week" is a real movable adjunct.
    expect(
      isWordOrderCorrect('I will visit her next week.', [
        'Next', 'week', 'I', 'will', 'visit', 'her.',
      ]),
    ).toBe(true);
    expect(
      isWordOrderCorrect('I saw her last night.', [
        'Last', 'night', 'I', 'saw', 'her.',
      ]),
    ).toBe(true);
  });

  it('accepts inversion of a contracted auxiliary (real bank sentence)', () => {
    // bareToken strips the apostrophe: "can't" -> "cant".
    expect(
      isWordOrderCorrect("He can't ride a horse.", [
        "Can't", 'he', 'ride', 'a', 'horse?',
      ]),
    ).toBe(true);
  });

  // External-review r19-01: a PP bound to the preceding verb is a
  // complement, not a movable adjunct - fronting produces non-English.
  it('rejects fronting a verb-bound prepositional complement', () => {
    expect(
      isWordOrderCorrect('I look at a cat.', ['At', 'a', 'cat', 'I', 'look.']),
    ).toBe(false);
    expect(
      isWordOrderCorrect('I play with a ball.', ['With', 'a', 'ball', 'I', 'play.']),
    ).toBe(false);
    expect(
      isWordOrderCorrect('I listen to music.', ['To', 'music', 'I', 'listen.']),
    ).toBe(false);
    expect(
      isWordOrderCorrect('She goes to school.', ['To', 'school', 'she', 'goes.']),
    ).toBe(false);
    // r20-01: the bond list must match real inflections, not naive
    // `${verb}s`/`${verb}ing` output ("gos", "siting", "writeing").
    expect(
      isWordOrderCorrect('She is listening to music.', ['To', 'music', 'she', 'is', 'listening.']),
    ).toBe(false);
    expect(
      isWordOrderCorrect('He is sitting on the floor.', ['On', 'the', 'floor', 'he', 'is', 'sitting.']),
    ).toBe(false);
    expect(
      isWordOrderCorrect('The bird flies to the tree.', ['To', 'the', 'tree', 'the', 'bird', 'flies.']),
    ).toBe(false);
  });

  it('still accepts a genuine adjunct fronted off a non-bound verb', () => {
    // "at seven" is a time adjunct, not the complement of "get up".
    expect(
      isWordOrderCorrect('I get up at seven.', ['At', 'seven', 'I', 'get', 'up.']),
    ).toBe(true);
  });

  // External-review r19-02: conjunct swap must not tear a noun phrase -
  // "a red pen and blue ruler" has modifiers inside each conjunct.
  it('rejects conjunct swap when conjuncts carry modifiers', () => {
    expect(
      isWordOrderCorrect('I have a red pen and a blue ruler.', [
        'I', 'have', 'a', 'red', 'blue', 'and', 'pen', 'a', 'ruler.',
      ]),
    ).toBe(false);
    expect(
      isWordOrderCorrect('I have a pen and a ruler.', [
        'I', 'have', 'a', 'a', 'and', 'pen', 'ruler.',
      ]),
    ).toBe(false);
  });

  it('still accepts a clean bare-noun conjunct swap', () => {
    expect(
      isWordOrderCorrect('I like English and maths.', [
        'I', 'like', 'maths', 'and', 'English.',
      ]),
    ).toBe(true);
    expect(
      isWordOrderCorrect('English and maths are fun.', [
        'Maths', 'and', 'English', 'are', 'fun.',
      ]),
    ).toBe(true);
  });
});

/**
 * Bank-wide sweep (round-2 review ask): acceptedWordOrders must only ever
 * produce a small set of clean alternates - no orphaned determiners,
 * no dangling conjunction, no trailing articles. This catches whole
 * classes of garbled accepts across every authored and templated
 * sentence without hand-listing them.
 */
describe('acceptedWordOrders bank sweep', () => {
  const GRADES = ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5'];
  const bankSentences = [...REORDER_G3, ...REORDER_G45];
  const templateSentences = GRADES.flatMap((g) =>
    getWordsByGrade(g).flatMap((w) => sentencesForWord(w)),
  );
  const all = [...new Set([...bankSentences, ...templateSentences])];

  // "the and" / "a the" / "and and" are always garbled; "and the" is a
  // legitimate sequence (e.g. "Saint Vincent and the Grenadines") and a
  // sentence may legitimately open with "The" - the checks target real
  // breaks only.
  const BROKEN = /\b(?:a|an|the)\s+(?:a|an|the|and)\b|\band\s+and\b|^\s*and\b|\b(?:a|an|the|and)\s*$/;

  it('never emits a garbled order (double/orphan determiners, dangling and)', () => {
    const offenders: string[] = [];
    for (const sentence of all) {
      for (const variant of acceptedWordOrders(sentence)) {
        if (BROKEN.test(variant)) offenders.push(`${sentence} -> ${variant}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('always contains the authored order', () => {
    for (const sentence of all) {
      const accepted = acceptedWordOrders(sentence);
      // same normalization as bareToken + join(' ') inside the scorer
      const normalized = sentence
        .trim()
        .toLowerCase()
        .replace(/[.,!?;:'"’]+/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
      expect(accepted).toContain(normalized);
    }
  });
});
