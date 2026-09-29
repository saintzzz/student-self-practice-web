import { describe, expect, it } from 'vitest';
import { ALL_WORDS, getTopicsByGrade, getWordsByGrade, getWordsByTopic } from './index';
import { generateListeningSentenceFillBlankQuestions } from '../../lib/generators/listeningSentenceFillBlank';
import { generateListeningImageChoiceQuestions } from '../../lib/generators/listeningImageChoice';
import { generateExtraLetterQuestions } from '../../lib/generators/extraLetter';
import { generateImageChoiceQuestions } from '../../lib/generators/imageChoice';
import { generateDescribeAndChooseImageQuestions } from '../../lib/generators/describeAndChooseImage';
import { generatePronunciationRecordingQuestions } from '../../lib/generators/pronunciationRecording';
import { generatePicturePairMatchingBoards } from '../../lib/generators/picturePairMatching';
import { buildRound1Questions } from '../../lib/rounds/round1ExtraLetter';
import { buildRound2Questions } from '../../lib/rounds/round2ListeningSentence';
import { buildRound3Questions } from '../../lib/rounds/round3Pronunciation';
import { buildRound4Questions } from '../../lib/rounds/round4DescribeAndChooseImage';
import baselineJson from './bank.baseline.json';
import type { VocabWord } from '../../types';

/**
 * Bank-wide invariants for the PRD r3 section 7 vocabulary expansion
 * (AC-6.1..AC-6.9). Baseline JSON produced by
 * scripts/dump-word-baseline.mjs at commit ebd58a5.
 */
const baseline = baselineJson as {
  words: Record<string, Omit<VocabWord, 'imageUrl'>>;
};

/** Normative table from docs/sdlc/prd.md section 7.1 (43 rows). */
const NEW_ENTRIES: ReadonlyArray<Omit<VocabWord, 'imageUrl'>> = [
  { id: 'present', topicId: 'g2-party', word: 'present', plural: 'presents', emoji: '🎁', countable: true, explanation: 'Món quà tiếng Anh là "present".' },
  { id: 'cupcake', topicId: 'g2-party', word: 'cupcake', plural: 'cupcakes', emoji: '🧁', countable: true, explanation: 'Bánh nướng nhỏ tiếng Anh là "cupcake".' },
  { id: 'lollipop', topicId: 'g2-party', word: 'lollipop', plural: 'lollipops', emoji: '🍭', countable: true, explanation: 'Kẹo mút tiếng Anh là "lollipop".' },
  { id: 'ribbon', topicId: 'g2-party', word: 'ribbon', plural: 'ribbons', emoji: '🎀', countable: true, explanation: 'Cái nơ ruy băng tiếng Anh là "ribbon".' },
  { id: 'pasta', topicId: 'g2-party', word: 'pasta', emoji: '🍝', countable: false, explanation: 'Mì Ý tiếng Anh là "pasta".' },
  { id: 'pie', topicId: 'g2-party', word: 'pie', plural: 'pies', emoji: '🥧', countable: true, explanation: 'Bánh nướng có nhân tiếng Anh là "pie".' },
  { id: 'hot-dog', topicId: 'g2-party', word: 'hot dog', plural: 'hot dogs', emoji: '🌭', countable: true, explanation: 'Bánh mì kẹp xúc xích tiếng Anh là "hot dog".' },
  { id: 'bubble-tea', topicId: 'g2-party', word: 'bubble tea', emoji: '🧋', countable: false, explanation: 'Trà sữa trân châu tiếng Anh là "bubble tea".' },
  { id: 'island', topicId: 'g2-seaside', word: 'island', plural: 'islands', emoji: '🏝️', countable: true, explanation: 'Hòn đảo tiếng Anh là "island".' },
  { id: 'seal', topicId: 'g2-seaside', word: 'seal', plural: 'seals', emoji: '🦭', countable: true, explanation: 'Con hải cẩu tiếng Anh là "seal".' },
  { id: 'jellyfish', topicId: 'g2-seaside', word: 'jellyfish', plural: 'jellyfish', emoji: '🪼', countable: true, explanation: 'Con sứa tiếng Anh là "jellyfish".' },
  { id: 'coral', topicId: 'g2-seaside', word: 'coral', emoji: '🪸', countable: false, explanation: 'San hô tiếng Anh là "coral".' },
  { id: 'umbrella', topicId: 'g2-seaside', word: 'umbrella', plural: 'umbrellas', emoji: '⛱️', countable: true, explanation: 'Cái ô che nắng tiếng Anh là "umbrella".' },
  { id: 'swimsuit', topicId: 'g2-seaside', word: 'swimsuit', plural: 'swimsuits', emoji: '🩱', countable: true, explanation: 'Đồ bơi tiếng Anh là "swimsuit".' },
  { id: 'bucket', topicId: 'g2-seaside', word: 'bucket', plural: 'buckets', emoji: '🪣', countable: true, explanation: 'Cái xô tiếng Anh là "bucket".' },
  { id: 'palm-tree', topicId: 'g2-seaside', word: 'palm tree', plural: 'palm trees', emoji: '🌴', countable: true, explanation: 'Cây cọ tiếng Anh là "palm tree".' },
  { id: 'goggles', topicId: 'g2-seaside', word: 'goggles', emoji: '🥽', countable: false, explanation: 'Kính bơi tiếng Anh là "goggles".' },
  { id: 'coconut', topicId: 'g2-seaside', word: 'coconut', plural: 'coconuts', emoji: '🥥', countable: true, explanation: 'Quả dừa tiếng Anh là "coconut".' },
  { id: 'spoon', topicId: 'g2-kitchen', word: 'spoon', plural: 'spoons', emoji: '🥄', countable: true, explanation: 'Cái thìa tiếng Anh là "spoon".' },
  { id: 'teapot', topicId: 'g2-kitchen', word: 'teapot', plural: 'teapots', emoji: '🫖', countable: true, explanation: 'Ấm trà tiếng Anh là "teapot".' },
  { id: 'chopsticks', topicId: 'g2-kitchen', word: 'chopsticks', emoji: '🥢', countable: false, explanation: 'Đôi đũa tiếng Anh là "chopsticks".' },
  { id: 'jar', topicId: 'g2-kitchen', word: 'jar', plural: 'jars', emoji: '🫙', countable: true, explanation: 'Cái lọ thủy tinh tiếng Anh là "jar".' },
  { id: 'salt', topicId: 'g2-kitchen', word: 'salt', emoji: '🧂', countable: false, explanation: 'Muối tiếng Anh là "salt".' },
  { id: 'sponge', topicId: 'g2-kitchen', word: 'sponge', plural: 'sponges', emoji: '🧽', countable: true, explanation: 'Miếng bọt biển rửa bát tiếng Anh là "sponge".' },
  { id: 'butter', topicId: 'g2-kitchen', word: 'butter', emoji: '🧈', countable: false, explanation: 'Bơ làm từ sữa tiếng Anh là "butter".' },
  { id: 'ice', topicId: 'g2-kitchen', word: 'ice', emoji: '🧊', countable: false, explanation: 'Đá lạnh tiếng Anh là "ice".' },
  { id: 'chef', topicId: 'g2-kitchen', word: 'chef', emoji: '🧑‍🍳', countable: false, explanation: 'Đầu bếp tiếng Anh là "chef".' },
  { id: 'tent', topicId: 'g2-camping', word: 'tent', plural: 'tents', emoji: '⛺', countable: true, explanation: 'Cái lều tiếng Anh là "tent".' },
  { id: 'torch', topicId: 'g2-camping', word: 'torch', plural: 'torches', emoji: '🔦', countable: true, explanation: 'Đèn pin tiếng Anh là "torch".' },
  { id: 'compass', topicId: 'g2-camping', word: 'compass', plural: 'compasses', emoji: '🧭', countable: true, explanation: 'La bàn tiếng Anh là "compass".' },
  { id: 'map', topicId: 'g2-camping', word: 'map', plural: 'maps', emoji: '🗺️', countable: true, explanation: 'Bản đồ tiếng Anh là "map".' },
  { id: 'wood', topicId: 'g2-camping', word: 'wood', emoji: '🪵', countable: false, explanation: 'Gỗ, củi tiếng Anh là "wood".' },
  { id: 'lantern', topicId: 'g2-camping', word: 'lantern', plural: 'lanterns', emoji: '🏮', countable: true, explanation: 'Đèn lồng tiếng Anh là "lantern".' },
  { id: 'moon', topicId: 'g2-camping', word: 'moon', emoji: '🌙', countable: false, explanation: 'Mặt trăng tiếng Anh là "moon".' },
  { id: 'boot', topicId: 'g2-camping', word: 'boot', plural: 'boots', emoji: '🥾', countable: true, explanation: 'Giày bốt tiếng Anh là "boot".' },
  { id: 'canoe', topicId: 'g2-camping', word: 'canoe', plural: 'canoes', emoji: '🛶', countable: true, explanation: 'Chiếc xuồng tiếng Anh là "canoe".' },
  { id: 'fishing-rod', topicId: 'g2-camping', word: 'fishing rod', plural: 'fishing rods', emoji: '🎣', countable: true, explanation: 'Cần câu cá tiếng Anh là "fishing rod".' },
  { id: 'slide', topicId: 'g2-actions', word: 'slide', emoji: '🛝', countable: false, explanation: 'Chơi cầu trượt tiếng Anh là "slide".' },
  { id: 'skate', topicId: 'g2-actions', word: 'skate', emoji: '⛸️', countable: false, explanation: 'Trượt băng tiếng Anh là "skate".' },
  { id: 'excited', topicId: 'g2-feelings', word: 'excited', emoji: '🤩', countable: false, explanation: 'Háo hức tiếng Anh là "excited".' },
  { id: 'sick', topicId: 'g2-feelings', word: 'sick', emoji: '🤒', countable: false, explanation: 'Bị ốm tiếng Anh là "sick".' },
  { id: 'cold', topicId: 'g2-feelings', word: 'cold', emoji: '🥶', countable: false, explanation: 'Cảm thấy lạnh tiếng Anh là "cold".' },
  { id: 'hot', topicId: 'g2-feelings', word: 'hot', emoji: '🥵', countable: false, explanation: 'Cảm thấy nóng tiếng Anh là "hot".' },
];

/** Flagged words from docs/sdlc/prd.md section 7.3 - must never be added. */
const FLAGGED_WORDS = [
  'party', 'birthday', 'confetti', 'clown', 'card', 'invitation', 'gift',
  'sand', 'wave', 'starfish', 'sandcastle',
  'cup', 'plate', 'fork', 'knife', 'bowl', 'pot', 'pan',
  'stove', 'fridge', 'kettle', 'oven', 'bottle', 'glass',
  'campfire', 'backpack', 'sleeping bag', 'binoculars', 'hut',
  'swing', 'jump', 'kick', 'throw', 'catch', 'ride',
  'hungry', 'thirsty', 'sleepy', 'bored', 'shy', 'worried', 'funny',
];

const byId = new Map(ALL_WORDS.map((w) => [w.id, w]));
const baselineIds = Object.keys(baseline.words);

describe('vocabulary bank invariants (PRD r3 section 7, AC-6.1..AC-6.9)', () => {
  it('AC-6.1: the 43 specified r3 entries exist; CR-07 adds only grade 1/3/4/5 topic words', () => {
    expect(NEW_ENTRIES).toHaveLength(43);
    expect(ALL_WORDS).toHaveLength(524);
    for (const expected of NEW_ENTRIES) {
      const actual = byId.get(expected.id);
      expect(actual, `missing new entry ${expected.id}`).toBeDefined();
      expect({ ...actual, imageUrl: undefined }).toEqual({ ...expected, imageUrl: undefined });
    }
    // Words beyond the 283 baseline + 43 r3 entries are CR-07 additions and
    // must live under the new grade-1/3/4/5 topics (R-G2: grade-2 bank frozen).
    const extra = ALL_WORDS.filter(
      (w) => !baselineIds.includes(w.id) && !NEW_ENTRIES.some((e) => e.id === w.id),
    );
    expect(extra.length).toBeGreaterThan(0);
    for (const w of extra) {
      expect(w.topicId, `word ${w.id} must belong to a new-grade topic`).toMatch(/^g[1345]-/);
    }
  });

  it('AC-6.2: the four new grade-2 topics are registered with >= 4 words each', () => {
    const grade2Topics = getTopicsByGrade('grade-2');
    expect(grade2Topics).toHaveLength(28);
    const titles: Record<string, string> = {
      'g2-party': 'Tiệc sinh nhật',
      'g2-seaside': 'Bãi biển',
      'g2-kitchen': 'Nhà bếp',
      'g2-camping': 'Cắm trại',
    };
    for (const [id, title] of Object.entries(titles)) {
      const topic = grade2Topics.find((t) => t.id === id);
      expect(topic, `missing topic ${id}`).toBeDefined();
      expect(topic?.name).toBe(title);
      expect(getWordsByTopic(id).length).toBeGreaterThanOrEqual(4);
    }
  });

  it('AC-6.3: the only shared emoji across the whole bank are the sanctioned pairs', () => {
    const byEmoji = new Map<string, string[]>();
    for (const w of ALL_WORDS) {
      const list = byEmoji.get(w.emoji) ?? [];
      list.push(w.word);
      byEmoji.set(w.emoji, list);
    }
    const shared = [...byEmoji.entries()].filter(([, words]) => words.length > 1);
    expect(Object.fromEntries(shared)).toEqual({
      '📖': expect.arrayContaining(['book', 'read']),
      '😢': expect.arrayContaining(['cry', 'sad']),
      '😴': expect.arrayContaining(['sleep', 'tired']),
      '🏊': expect.arrayContaining(['swim', 'swimming']),
      // CR-07 sanctioned additions - same real-world object as the emoji:
      // ⚽ is literally a football; 🛝 is playground equipment; 🏮 is the
      // Mid-Autumn lantern itself. Same rationale as the existing book/read pair.
      '⚽': expect.arrayContaining(['ball', 'football']),
      '🛝': expect.arrayContaining(['slide', 'playground']),
      '🏮': expect.arrayContaining(['lantern', 'Mid-Autumn Festival']),
    });
    for (const [, words] of shared) {
      expect(words).toHaveLength(2);
    }
  });

  it('AC-6.4: countable coherence - true requires plural, false forbids it', () => {
    for (const w of ALL_WORDS) {
      if (w.countable) {
        expect(w.plural, `${w.id} countable without plural`).toBeTruthy();
      } else {
        expect(w.plural, `${w.id} non-countable with plural`).toBeUndefined();
      }
    }
  });

  it('AC-6.5: no en/em dashes in any explanation', () => {
    for (const w of ALL_WORDS) {
      expect(
        [0x2013, 0x2014].some((cp) => w.explanation.includes(String.fromCodePoint(cp))),
        `${w.id} explanation`,
      ).toBe(false);
    }
  });

  it('AC-6.6: every Round pool generator accepts the enlarged bank without throwing', () => {
    expect(() => buildRound1Questions('seed-bank', ALL_WORDS)).not.toThrow();
    expect(() => generateExtraLetterQuestions([...ALL_WORDS])).not.toThrow();
    expect(() => generateImageChoiceQuestions([...ALL_WORDS])).not.toThrow();
    expect(() => generateListeningSentenceFillBlankQuestions(ALL_WORDS)).not.toThrow();
    expect(() => generateListeningImageChoiceQuestions(ALL_WORDS)).not.toThrow();
    expect(() => generatePronunciationRecordingQuestions(ALL_WORDS)).not.toThrow();
    expect(() => generateDescribeAndChooseImageQuestions(ALL_WORDS)).not.toThrow();
    expect(() => generatePicturePairMatchingBoards(ALL_WORDS)).not.toThrow();
    // CR-07 AC-G7: per-grade pools must be safe for every pool generator,
    // including the smallest grade (grade-1, 65 words).
    for (const gradeId of ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5']) {
      const pool = getWordsByGrade(gradeId);
      expect(() => buildRound1Questions(`seed-${gradeId}`, pool), `round1 ${gradeId}`).not.toThrow();
      expect(() => buildRound2Questions(`seed-${gradeId}`, pool), `round2 ${gradeId}`).not.toThrow();
      expect(() => buildRound3Questions(`seed-${gradeId}`, pool), `round3 ${gradeId}`).not.toThrow();
      expect(() => buildRound4Questions(`seed-${gradeId}`, pool), `round4 ${gradeId}`).not.toThrow();
    }
    // Countable gate: every new countable word is eligible for describe-and-choose
    const describeQuestions = generateDescribeAndChooseImageQuestions(ALL_WORDS);
    const describeWordIds = new Set(describeQuestions.map((q) => q.optionWordIds[q.correctIndex]));
    for (const entry of NEW_ENTRIES.filter((e) => e.countable)) {
      expect(describeWordIds.has(entry.id), `countable ${entry.id} missing from describe`).toBe(true);
    }
  });

  it('AC-6.7: slide and skate produce the exact verb sentences', () => {
    const questions = generateListeningSentenceFillBlankQuestions(ALL_WORDS);
    const byWord = new Map<string, string[]>();
    for (const q of questions) {
      const list = byWord.get(q.wordId) ?? [];
      list.push(q.sentence);
      byWord.set(q.wordId, list);
    }
    expect(byWord.get('slide')).toEqual(['I can slide.', 'I like to slide.']);
    expect(byWord.get('skate')).toEqual(['I can skate.', 'I like to skate.']);
  });

  it('AC-6.8: all 283 baseline words are unchanged', () => {
    expect(baselineIds).toHaveLength(283);
    for (const id of baselineIds) {
      const actual = byId.get(id);
      expect(actual, `baseline word ${id} was removed`).toBeDefined();
      const expected = baseline.words[id];
      expect({
        id: actual!.id,
        topicId: actual!.topicId,
        word: actual!.word,
        ...(actual!.plural === undefined ? {} : { plural: actual!.plural }),
        emoji: actual!.emoji,
        countable: actual!.countable,
        explanation: actual!.explanation,
      }).toEqual(expected);
    }
  });

  it('AC-6.9: no flagged word from PRD section 7.3 was added', () => {
    const newWords = ALL_WORDS.filter((w) => !baselineIds.includes(w.id));
    const flaggedSet = new Set(FLAGGED_WORDS.map((w) => w.toLowerCase()));
    for (const w of newWords) {
      expect(flaggedSet.has(w.word.toLowerCase()), `flagged word added: ${w.word}`).toBe(false);
    }
  });
});
