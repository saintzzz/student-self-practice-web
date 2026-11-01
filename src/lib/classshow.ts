import type { ExamQuestion } from '../types/exam';

/** CR-114: Sân khấu lớp - teacher-led projector show.
 *  Pure helpers: roster parsing and ExamQuestion -> big-screen
 *  ShowQuestion normalization. One screen for the whole class; the
 *  teacher taps the verdict so question rendering stays display-only. */

export interface ShowQuestion {
  id: string;
  /** 'choice' = pick 1 of N; 'bool' = Đúng/Sai; 'reveal' = class answers aloud, teacher reveals. */
  kind: 'choice' | 'bool' | 'reveal';
  /** Big headline text on stage. */
  prompt: string;
  /** Secondary context line (passage caption, instruction). */
  subPrompt?: string;
  options?: readonly string[];
  correctIndex?: number;
  boolAnswer?: boolean;
  /** Text revealed after the class answers aloud (reveal kind). */
  revealText?: string;
  imageUrl?: string;
}

/** Structural detection - a question is stage-displayable when the
 *  class can answer it aloud or by pointing, without typing. */
export function normalizeShowQuestion(q: ExamQuestion): ShowQuestion | null {
  const anyQ = q as unknown as Record<string, unknown>;
  switch (q.kind) {
    case 'grammar-mcq': {
      const options = (anyQ.optionImages ? null : q.options) as readonly string[] | null;
      if (!options?.length) return null;
      return {
        id: q.id, kind: 'choice', prompt: q.prompt,
        subPrompt: q.passage ?? (q.transcript ? 'Nghe cô đọc câu này nhé!' : undefined),
        options, correctIndex: q.correctIndex, imageUrl: q.imageUrl,
      };
    }
    case 'odd-pronunciation':
      return {
        id: q.id, kind: 'choice', prompt: 'Từ nào phát âm khác các từ còn lại?',
        options: q.options, correctIndex: q.correctIndex,
      };
    case 'true-false-reading':
      return {
        id: q.id, kind: 'bool', prompt: q.statement,
        subPrompt: q.passage, boolAnswer: q.answer,
      };
    case 'text-answer':
      return {
        id: q.id, kind: 'reveal', prompt: q.displaySentence,
        revealText: q.accept[0], imageUrl: q.imageUrl,
      };
    case 'missing-letter':
      return {
        id: q.id, kind: 'reveal', prompt: q.displaySentence,
        subPrompt: `Điền chữ còn thiếu: ${q.maskedWord}`, revealText: q.word,
      };
    case 'word-order':
      return {
        id: q.id, kind: 'reveal', prompt: 'Sắp xếp các từ thành câu đúng:',
        subPrompt: q.tiles.join('  ·  '), revealText: q.sentence,
      };
    default: {
      // Practice-kind questions that happen to be text-option MCQs still
      // stage fine - detect the shape instead of whitelisting every kind.
      if (Array.isArray(anyQ.options) && typeof anyQ.correctIndex === 'number'
          && (anyQ.options as unknown[]).every((o) => typeof o === 'string')) {
        return {
          id: q.id, kind: 'choice',
          prompt: String(anyQ.prompt ?? anyQ.sentence ?? q.kind),
          options: anyQ.options as readonly string[],
          correctIndex: anyQ.correctIndex as number,
        };
      }
      return null;
    }
  }
}

export const SHOW_POINTS = 10;

/** 8 sample names so a guest teacher can press play instantly -
 *  the same zero-cold-start trick as Questora's "class of 12". */
export const SAMPLE_ROSTER = [
  'Minh Anh', 'Bảo Nam', 'Khánh Linh', 'Gia Huy',
  'Thu Hà', 'Quốc Bảo', 'Ngọc Diệp', 'Tuấn Kiệt',
];

export const ROSTER_STORAGE_KEY = 'ea-classshow-roster';

/** Built-in stage questions - the show must go on even when the school
 *  wifi drops or the guest challenge fails mid-class (Questora samples
 *  are bundled for the same reason). Mixed kinds, grade-3-ish English. */
export const SAMPLE_QUESTIONS: readonly ShowQuestion[] = [
  { id: 'sq1', kind: 'choice', prompt: 'She ___ to school every day.', options: ['go', 'goes', 'going', 'went'], correctIndex: 1 },
  { id: 'sq2', kind: 'choice', prompt: 'Từ nào phát âm khác các từ còn lại?', options: ['cake', 'name', 'cat', 'lake'], correctIndex: 2 },
  { id: 'sq3', kind: 'bool', subPrompt: 'Tom is nine years old. He has a small dog named Bingo.', prompt: 'Tom has a cat.', boolAnswer: false },
  { id: 'sq4', kind: 'choice', prompt: 'There ___ three books on the table.', options: ['is', 'are', 'am', 'be'], correctIndex: 1 },
  { id: 'sq5', kind: 'reveal', prompt: 'Điền chữ còn thiếu: "I like to read b__ks."', revealText: 'books' },
  { id: 'sq6', kind: 'choice', prompt: 'What color is the sun?', options: ['Blue', 'Green', 'Yellow', 'Purple'], correctIndex: 2 },
  { id: 'sq7', kind: 'bool', subPrompt: 'Five plus five equals ten.', prompt: 'Five plus five equals eleven.', boolAnswer: false },
  { id: 'sq8', kind: 'reveal', prompt: 'Sắp xếp các từ thành câu đúng:', subPrompt: 'likes  ·  She  ·  apples  ·  red', revealText: 'She likes red apples.' },
  { id: 'sq9', kind: 'choice', prompt: 'Chọn từ đúng: "___ is my teacher."', options: ['She', 'Her', 'Hers', 'Him'], correctIndex: 0 },
  { id: 'sq10', kind: 'choice', prompt: 'How many legs does a spider have?', options: ['Six', 'Seven', 'Eight', 'Ten'], correctIndex: 2 },
  { id: 'sq11', kind: 'reveal', prompt: 'Điền chữ còn thiếu: "The cat is ___ the box." (ở trong)', revealText: 'in' },
  { id: 'sq12', kind: 'bool', subPrompt: 'Monday comes before Tuesday.', prompt: 'Tuesday comes before Monday.', boolAnswer: false },
];

/** Parse a textarea roster: commas/newlines separate names, trim,
 *  dedupe case-insensitively, cap at 60 (Pro-sized class). */
export function parseRoster(text: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const raw of text.split(/[\n,;]+/)) {
    const name = raw.trim().replace(/\s+/g, ' ');
    const key = name.toLowerCase();
    if (name.length >= 2 && name.length <= 40 && !seen.has(key)) {
      seen.add(key);
      names.push(name);
      if (names.length >= 60) break;
    }
  }
  return names;
}

/** Spotlight pick: avoid repeating the same student twice in a row
 *  when the roster has 2+ names. */
export function pickStudent(names: readonly string[], lastIndex: number, rand: () => number): number {
  if (names.length <= 1) return 0;
  let idx = Math.floor(rand() * names.length);
  if (idx === lastIndex) idx = (idx + 1) % names.length;
  return idx;
}

/** Rank the roster for the podium: stable by score desc, name asc. */
export function podiumOrder(scores: readonly { name: string; score: number }[]): { name: string; score: number }[] {
  return [...scores].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'vi'));
}
