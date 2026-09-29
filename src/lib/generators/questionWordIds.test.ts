import { describe, expect, it } from 'vitest';
import { ALL_WORDS, TOPICS, getWordsByTopic } from '../../data/vocabulary';
import { generateCountingImageQuestions } from './countingImage';
import { generateDescribeAndChooseImageQuestions } from './describeAndChooseImage';
import { generateExtraLetterQuestions } from './extraLetter';
import { generateImageChoiceQuestions } from './imageChoice';
import { generateListeningImageChoiceQuestions } from './listeningImageChoice';
import { generateListeningSentenceFillBlankQuestions } from './listeningSentenceFillBlank';
import { generatePicturePairMatchingBoards } from './picturePairMatching';
import { generatePhonicsSoundChoiceQuestions, generatePhonicsWordChoiceQuestions } from './phonics';
import {
  generatePhonicsBlendChoiceQuestions,
  generatePhonicsFinalChoiceQuestions,
  generatePhonicsRhymeChoiceQuestions,
} from './phonicsDeep';

/**
 * AC-5.8: every generated question carries ids that resolve to real words
 * in the vocabulary bank. Photo/emoji lookup and the FeedbackPanel picture
 * (US-10) depend on this invariant, so it is checked over the real bank -
 * per topic for topic-scoped generators, whole-bank for image-choice
 * (Round 1 mixes topics into its pool).
 */

const BANK_IDS = new Set(ALL_WORDS.map((w) => w.id));
const BANK_WORDS_BY_ID = new Map(ALL_WORDS.map((w) => [w.id, w]));

function expectBankIds(ids: readonly (string | undefined)[], context: string) {
  for (const id of ids) {
    expect(id, `${context}: missing id field`).toBeDefined();
    expect(BANK_IDS.has(id!), `${context}: id "${id}" is not a real word id`).toBe(true);
  }
}

describe('question wordId integrity (AC-5.8)', () => {
  it('extra-letter wordId resolves to the bank word behind correctWord', () => {
    for (const topic of TOPICS) {
      for (const q of generateExtraLetterQuestions(getWordsByTopic(topic.id))) {
        expectBankIds([q.wordId], `extra-letter ${q.id}`);
        expect(
          BANK_WORDS_BY_ID.get(q.wordId)?.word,
          `extra-letter ${q.id}`,
        ).toBe(q.correctWord);
      }
    }
  });

  it('image-choice wordId resolves to the bank word behind the prompt emoji', () => {
    for (const q of generateImageChoiceQuestions([...ALL_WORDS])) {
      expectBankIds([q.wordId], `image-choice ${q.id}`);
      const word = BANK_WORDS_BY_ID.get(q.wordId);
      expect(word?.emoji, `image-choice ${q.id}`).toBe(q.emoji);
      expect(word?.word, `image-choice ${q.id}`).toBe(q.options[q.correctIndex]);
    }
  });

  it('listening-sentence-fill-blank wordId resolves to the bank word behind the blanked word', () => {
    for (const topic of TOPICS) {
      for (const q of generateListeningSentenceFillBlankQuestions(getWordsByTopic(topic.id))) {
        expectBankIds([q.wordId], `listening-sentence-fill-blank ${q.id}`);
        expect(
          BANK_WORDS_BY_ID.get(q.wordId)?.word,
          `listening-sentence-fill-blank ${q.id}`,
        ).toBe(q.word);
      }
    }
  });

  it('listening-image-choice optionWordIds resolve to real bank words matching the option emojis', () => {
    // Production call site (round2ListeningSentence.ts) always passes the
    // whole bank - distractors need >= 3 distinct emojis, which thin topics
    // (e.g. g2-places, 3 words) cannot supply.
    for (const q of generateListeningImageChoiceQuestions(ALL_WORDS)) {
      expectBankIds(q.optionWordIds, `listening-image-choice ${q.id}`);
      // Stronger than presence: each id's word must back the emoji shown
      // in that option slot (photo lookup is keyed by id, AC-5.1/AC-5.6).
      q.optionWordIds.forEach((id, i) => {
        expect(
          BANK_WORDS_BY_ID.get(id)?.emoji,
          `listening-image-choice ${q.id} option ${i}`,
        ).toBe(q.options[i]);
      });
    }
  });

  it('describe-and-choose-image optionWordIds resolve to real bank words', () => {
    for (const topic of TOPICS) {
      for (const q of generateDescribeAndChooseImageQuestions(getWordsByTopic(topic.id))) {
        expectBankIds(q.optionWordIds, `describe-and-choose-image ${q.id}`);
        q.optionWordIds.forEach((id, i) => {
          expect(
            BANK_WORDS_BY_ID.get(id)?.emoji,
            `describe-and-choose-image ${q.id} option ${i}`,
          ).toBe(q.options[i]!.emoji);
        });
      }
    }
  });

  it('counting-image promptWordId resolves to the bank word behind the prompt', () => {
    for (const topic of TOPICS) {
      for (const q of generateCountingImageQuestions(getWordsByTopic(topic.id))) {
        expectBankIds([q.promptWordId], `counting-image ${q.id}`);
        const word = BANK_WORDS_BY_ID.get(q.promptWordId);
        expect(word?.emoji, `counting-image ${q.id}`).toBe(q.prompt.emoji);
        expect(word?.word, `counting-image ${q.id}`).toBe(q.prompt.word);
      }
    }
  });

  it('picture-pair-matching pair wordIds resolve to the bank words behind each pair', () => {
    for (const topic of TOPICS) {
      for (const q of generatePicturePairMatchingBoards(getWordsByTopic(topic.id))) {
        expectBankIds(
          q.pairs.map((p) => p.wordId),
          `picture-pair-matching ${q.id}`,
        );
        for (const pair of q.pairs) {
          const word = BANK_WORDS_BY_ID.get(pair.wordId);
          expect(word?.word, `picture-pair-matching ${q.id}`).toBe(pair.word);
          expect(word?.emoji, `picture-pair-matching ${q.id}`).toBe(pair.emoji);
        }
      }
    }
  });

  it('phonics-sound-choice wordId resolves to the bank word behind word/emoji', () => {
    for (const q of generatePhonicsSoundChoiceQuestions(ALL_WORDS)) {
      expectBankIds([q.wordId], `phonics-sound-choice ${q.id}`);
      const word = BANK_WORDS_BY_ID.get(q.wordId);
      expect(word?.word, `phonics-sound-choice ${q.id}`).toBe(q.word);
      expect(word?.emoji, `phonics-sound-choice ${q.id}`).toBe(q.emoji);
    }
  });

  it('phonics-word-choice optionWordIds resolve to real bank words matching the option emojis', () => {
    for (const q of generatePhonicsWordChoiceQuestions(ALL_WORDS)) {
      expectBankIds(q.optionWordIds, `phonics-word-choice ${q.id}`);
      q.optionWordIds.forEach((id, i) => {
        expect(
          BANK_WORDS_BY_ID.get(id)?.emoji,
          `phonics-word-choice ${q.id} option ${i}`,
        ).toBe(q.options[i]);
      });
      // The carried correct word must back the correct option slot.
      expect(BANK_WORDS_BY_ID.get(q.wordId)?.word, `phonics-word-choice ${q.id}`).toBe(q.word);
      expect(q.optionWordIds[q.correctIndex], `phonics-word-choice ${q.id}`).toBe(q.wordId);
    }
  });

  it('phonics-final-choice wordId resolves to the bank word behind word/emoji', () => {
    for (const q of generatePhonicsFinalChoiceQuestions(ALL_WORDS)) {
      expectBankIds([q.wordId], `phonics-final-choice ${q.id}`);
      const word = BANK_WORDS_BY_ID.get(q.wordId);
      expect(word?.word, `phonics-final-choice ${q.id}`).toBe(q.word);
      expect(word?.emoji, `phonics-final-choice ${q.id}`).toBe(q.emoji);
    }
  });

  it('phonics-blend-choice wordId resolves to the bank word behind word/emoji', () => {
    for (const q of generatePhonicsBlendChoiceQuestions(ALL_WORDS)) {
      expectBankIds([q.wordId], `phonics-blend-choice ${q.id}`);
      const word = BANK_WORDS_BY_ID.get(q.wordId);
      expect(word?.word, `phonics-blend-choice ${q.id}`).toBe(q.word);
      expect(word?.emoji, `phonics-blend-choice ${q.id}`).toBe(q.emoji);
    }
  });

  it('phonics-rhyme-choice wordId + optionWordIds resolve to real bank words matching the option texts', () => {
    for (const q of generatePhonicsRhymeChoiceQuestions(ALL_WORDS)) {
      expectBankIds([q.wordId], `phonics-rhyme-choice ${q.id}`);
      expectBankIds(q.optionWordIds, `phonics-rhyme-choice ${q.id}`);
      expect(BANK_WORDS_BY_ID.get(q.wordId)?.word, `phonics-rhyme-choice ${q.id}`).toBe(q.word);
      q.optionWordIds.forEach((id, i) => {
        expect(
          BANK_WORDS_BY_ID.get(id)?.word,
          `phonics-rhyme-choice ${q.id} option ${i}`,
        ).toBe(q.options[i]);
      });
    }
  });
});
