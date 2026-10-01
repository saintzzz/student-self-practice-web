import type { MissingLetterQuestion } from '../../types/exam';
import type { VocabWord } from '../../types';
import { hashString } from '../prng';
import { sentencesForWord } from '../generators/listeningSentenceFillBlank';

const MIN_WORD_LEN = 4;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * CR-24 - IOE "điền chữ còn thiếu" ("two big __dows" -> win). Masks a
 * contiguous run of 1-3 letters strictly inside the word (first and last
 * letters stay visible, like IOE's __dows pattern) so the fragment is
 * readable and the answer is a short letter run, not a full spelling test.
 */
export function generateMissingLetterQuestions(words: readonly VocabWord[]): MissingLetterQuestion[] {
  const questions: MissingLetterQuestion[] = [];

  for (const word of words) {
    const w = word.word.trim();
    // Single alphabetic words only - spaces/hyphens inside the word would
    // make the masked run ambiguous to type.
    if (w.length < MIN_WORD_LEN || !/^[a-z]+$/i.test(w)) continue;

    const sentences = sentencesForWord(word);
    if (sentences.length === 0) continue;

    // Missing run length scales mildly with word length: 4-6 -> 1-2,
    // 7+ -> 2-3.
    const runLen = w.length >= 7 ? 2 + (hashString(`${word.id}-len`) % 2) : 1 + (hashString(`${word.id}-len`) % 2);
    // Start index inside the word, never covering first or last letter.
    const maxStart = w.length - runLen - 1;
    const start = 1 + (hashString(`${word.id}-start`) % Math.max(1, maxStart));
    const missing = w.slice(start, start + runLen);
    const maskedWord = `${w.slice(0, start)}___${w.slice(start + runLen)}`;

    const sentence = sentences[hashString(`${word.id}-s`) % sentences.length]!;
    const pattern = new RegExp(`\\b${escapeRegExp(w)}\\b`, 'i');
    const displaySentence = sentence.replace(pattern, maskedWord);
    if (displaySentence === sentence) continue; // word absent - skip

    questions.push({
      id: `q-ml-${word.id}`,
      topicId: word.topicId,
      kind: 'missing-letter',
      word: w,
      wordId: word.id,
      maskedWord,
      missing,
      sentence,
      displaySentence,
      explanation: `Chữ còn thiếu là "${missing}" - từ đúng là "${w}". ${word.explanation}`,
    });
  }

  return questions;
}
