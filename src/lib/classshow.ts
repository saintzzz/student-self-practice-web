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
  /** Image-option MCQs (word-to-image-mcq): same letters, picture cells. */
  optionImages?: readonly string[];
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
  /* CR-142 D1: pending/unkeyed bank rows (bankId marker) have no
     revealable answer - on stage they render a FABRICATED verdict
     (MCQ highlights A, true-false marks SAI, text-answer shows an
     empty green box). Ungradeable questions must never reach the
     projector. */
  if (anyQ.bankId) return null;
  switch (q.kind) {
    case 'grammar-mcq': {
      // word-to-image-mcq rows carry optionImages - the class points at
      // the letter, so picture cells are stage-displayable too.
      const imgs = anyQ.optionImages as readonly string[] | undefined;
      const options = q.options as readonly string[] | null;
      /* CR-142 D1b: a missing key index would highlight the same cell
         every show - treat as unstageable. r198: integer check too -
         NaN/fractional keys pass `typeof number` but match no cell. */
      if (!options?.length || !Number.isInteger(q.correctIndex) || (q.correctIndex as number) < 0 || (q.correctIndex as number) >= options.length) return null;
      return {
        id: q.id, kind: 'choice', prompt: q.prompt,
        subPrompt: q.passage ?? (q.transcript ? 'Nghe cô đọc câu này nhé!' : undefined),
        options, optionImages: imgs, correctIndex: q.correctIndex, imageUrl: q.imageUrl,
      };
    }
    case 'odd-pronunciation':
      if (!q.options?.length || !Number.isInteger(q.correctIndex)
          || (q.correctIndex as number) < 0 || (q.correctIndex as number) >= q.options.length) return null;
      return {
        id: q.id, kind: 'choice', prompt: 'Từ nào phát âm khác các từ còn lại?',
        options: q.options, correctIndex: q.correctIndex,
      };
    case 'true-false-reading':
      if (typeof q.answer !== 'boolean') return null;
      return {
        id: q.id, kind: 'bool', prompt: q.statement,
        subPrompt: q.passage, boolAnswer: q.answer,
      };
    case 'text-answer':
      if (!q.accept?.length || !q.displaySentence) return null;
      return {
        id: q.id, kind: 'reveal', prompt: q.displaySentence,
        revealText: q.accept[0], imageUrl: q.imageUrl,
      };
    case 'missing-letter':
      if (!q.displaySentence || !q.word) return null;
      return {
        id: q.id, kind: 'reveal', prompt: q.displaySentence,
        subPrompt: `Điền chữ còn thiếu: ${q.maskedWord}`, revealText: q.word,
      };
    case 'word-order':
      if (!q.sentence || !q.tiles?.length) return null;
      return {
        id: q.id, kind: 'reveal', prompt: 'Sắp xếp các từ thành câu đúng:',
        subPrompt: q.tiles.join('  ·  '), revealText: q.sentence,
      };
    default: {
      // Practice-kind questions that happen to be text-option MCQs still
      // stage fine - detect the shape instead of whitelisting every kind.
      if (Array.isArray(anyQ.options) && typeof anyQ.correctIndex === 'number'
          && (anyQ.options as unknown[]).every((o) => typeof o === 'string')) {
        const opts = anyQ.options as readonly string[];
        const idx = anyQ.correctIndex as number;
        if (!Number.isInteger(idx) || idx < 0 || idx >= opts.length) return null;
        return {
          id: q.id, kind: 'choice',
          prompt: String(anyQ.prompt ?? anyQ.sentence ?? q.kind),
          options: opts,
          correctIndex: idx,
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
  { id: 'sq13', kind: 'choice', prompt: 'I ___ a student.', options: ['is', 'am', 'are', 'be'], correctIndex: 1 },
  { id: 'sq14', kind: 'bool', subPrompt: 'Mai likes pink. Her bag is pink.', prompt: 'Mai has a blue bag.', boolAnswer: false },
  { id: 'sq15', kind: 'choice', prompt: 'Từ nào phát âm khác các từ còn lại?', options: ['pen', 'ten', 'hen', 'fine'], correctIndex: 3 },
  { id: 'sq16', kind: 'reveal', prompt: 'Điền chữ còn thiếu: "Good ___, teacher!" (buổi sáng)', revealText: 'morning' },
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
 *  when the roster has 2+ names; `exclude` skips students who already
 *  missed this question (steal mechanic). Returns -1 when nobody is
 *  eligible. */
export function pickStudent(names: readonly string[], lastIndex: number, rand: () => number, exclude?: ReadonlySet<number>): number {
  const eligible = names.map((_, i) => i).filter((i) => !exclude?.has(i));
  if (!eligible.length) return -1;
  const fresh = eligible.filter((i) => i !== lastIndex);
  const pool = fresh.length ? fresh : eligible;
  return pool[Math.floor(rand() * pool.length)] ?? -1;
}

/** Rank the roster for the podium: score desc; ties keep roster order
 *  (Array.sort is stable) so "An" never beats "Vy" just for the name. */
export function podiumOrder(scores: readonly { name: string; score: number }[]): { name: string; score: number }[] {
  return [...scores].sort((a, b) => b.score - a.score);
}
