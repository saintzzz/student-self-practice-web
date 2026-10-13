import { describe, expect, it } from 'vitest';
import { generateScienceQuestions } from './scienceQuestions';

/**
 * Content audit 2026-10 regression: the old templates hard-coded "a"/"A"
 * and produced "A Earth is a planet.", "Which one is a animal?", "A water
 * is a liquid." These tests regenerate every science question for every
 * grade and fail on any ungrammatical article or malformed sentence.
 */
const GRADES = ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5'];

const VOWEL_SOUND = /^[aeiou]/i;

describe('generateScienceQuestions - content audit invariants', () => {
  const allQuestions = GRADES.flatMap((g) => generateScienceQuestions(g));

  it('no generated prompt/statement/sentence misuses a/an', () => {
    const texts: string[] = [];
    for (const q of allQuestions) {
      // counting-image carries a CountingImageOption prompt - skip it
      if ('prompt' in q && typeof q.prompt === 'string' && q.prompt) texts.push(q.prompt);
      if ('statement' in q && q.statement) texts.push(q.statement);
      if ('sentence' in q && q.sentence) texts.push(q.sentence);
      if ('displaySentence' in q && q.displaySentence) texts.push(q.displaySentence);
    }
    const offenders = texts.filter((t) => {
      for (const m of t.matchAll(/\b(a|an)\s+([a-zA-Z']+)/gi)) {
        const art = m[1]!.toLowerCase();
        const word = m[2]!;
        if (art === 'an' && !VOWEL_SOUND.test(word)) return true;
        if (art === 'a' && VOWEL_SOUND.test(word)) return true;
      }
      return false;
    });
    expect(offenders).toEqual([]);
  });

  it('unique nouns get "the" - no bare "Sun is" / "Moon is" statements', () => {
    const statements = allQuestions.flatMap((q) => [
      ('statement' in q && q.statement) || '',
      ('sentence' in q && q.sentence) || '',
    ]);
    // Bare-subject check: "Sun is a thing in the sky." is missing "The".
    const bare = statements.filter((t) => /^(sun|moon|sky)\s+(is|are)\b/i.test(t));
    expect(bare).toEqual([]);
    // Positive check: the bank does contain sun/moon, so the definite
    // article must actually appear (guards against a silent skip).
    expect(statements.some((t) => /^The (sun|moon) /i.test(t))).toBe(true);
    // Mass nouns may start bare ("Water is a liquid.") - no "A water".
    const massWithArticle = statements.filter((t) =>
      /^(a|an)\s+(water|milk|juice|oil|rain|snow|ice|air|steam|oxygen|hydrogen|carbon dioxide|wood|metal|glass|bread|rice|paper|soap|sand|soil|fire|wind|skin)\b/i.test(t),
    );
    expect(massWithArticle).toEqual([]);
  });

  it('no generated text has a stacked article ("a the", "a an")', () => {
    const texts = allQuestions.flatMap((q) => [
      ('statement' in q && q.statement) || '',
      ('sentence' in q && q.sentence) || '',
      ('displaySentence' in q && q.displaySentence) || '',
      ('prompt' in q && typeof q.prompt === 'string' && q.prompt) || '',
    ]);
    const offenders = texts.filter((t) => /\b(a|an)\s+(a|an|the)\b/i.test(t));
    expect(offenders).toEqual([]);
  });

  it('every statement is a non-empty capitalized sentence ending in a period', () => {
    for (const q of allQuestions) {
      if (q.kind === 'true-false-reading') {
        expect(q.statement).toMatch(/^[A-Z].*\.$/);
      }
    }
  });

  it('fill-in accept lists only contain short typeable answers', () => {
    for (const q of allQuestions) {
      if (q.kind === 'text-answer') {
        for (const a of q.accept) {
          // a child must be able to type it - cap at 3 words / 40 chars
          expect(a.split(/\s+/).length).toBeLessThanOrEqual(3);
          expect(a.length).toBeLessThanOrEqual(40);
        }
      }
    }
  });

  it('every MCQ still has exactly one correct index and 4 distinct options', () => {
    for (const q of allQuestions) {
      if (q.kind === 'grammar-mcq') {
        expect(new Set(q.options.map((o) => o.toLowerCase())).size).toBe(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(4);
      }
    }
  });
});
