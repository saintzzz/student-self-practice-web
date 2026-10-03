/**
 * CR-48 - adapter giua canonical V6 question bank (Supabase
 * `practice.qb_*`) va engine ExamQuestion hien co. RPC
 * fetch_questions/fetch_form tra row qb_questions + asset_paths +
 * audio_transcripts; mapper o day doi thanh cac kind renderer da biet
 * nen scoring/review khong thay doi.
 */
import { getSupabase, isSupabaseConfigured } from '../supabase/client';
import type { ExamProgramId, ExamQuestion } from '../../types/exam';
import { examConfigForGrade, type ExamState } from '../exam/examSession';
import { seededShuffleIndices } from '../prng';

export interface QbRow {
  id: string;
  grade: number;
  subject: 'english' | 'math' | 'science';
  domain: string | null;
  skill: string;
  question_type: string;
  difficulty: number;
  topic_key: string | null;
  prompt_text: string;
  transcript: string | null;
  choices: string[] | null;
  answer: { index?: number; boolean?: boolean; text?: string };
  explanation_vi: string | null;
  variant_group_id: string | null;
  asset_paths: string[];
  audio_transcripts: string[];
}

export type BankMode = 'practice' | 'mock';

/** Program id <-> bank subject: trung nhau ngoai tru 'english' = 'english'. */
const SUBJECTS: Record<ExamProgramId, QbRow['subject']> = {
  english: 'english',
  math: 'math',
  science: 'science',
};

export function gradeNumber(gradeId: string): number {
  const n = Number(gradeId.replace(/\D/g, ''));
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : 5;
}

export async function fetchBankQuestions(
  programId: ExamProgramId,
  gradeId: string,
  count: number,
  mode: BankMode,
): Promise<QbRow[]> {
  const { data, error } = await (await getSupabase()).rpc('fetch_questions', {
    p_grade: gradeNumber(gradeId),
    p_subject: SUBJECTS[programId],
    p_count: count,
    p_mode: mode,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as QbRow[];
}

export async function fetchBankForm(formId: string): Promise<QbRow[]> {
  const { data, error } = await (await getSupabase()).rpc('fetch_form', {
    p_form_id: formId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as QbRow[];
}

function assetUrl(path: string): string {
  return `/${path.replace(/^\/+/, '')}`;
}

function toFour<T>(list: T[] | null | undefined): [T, T, T, T] | null {
  if (!list || list.length !== 4) return null;
  return [list[0]!, list[1]!, list[2]!, list[3]!];
}

/** V6 choices/prompts may carry numbers (math banks) - renderers expect strings. */
function str(v: unknown): string {
  return typeof v === 'string' ? v : String(v ?? '');
}

/**
 * Map 1 V6 row -> ExamQuestion. Tra null khi row khong auto-score duoc
 * bang engine hien co (choices khong phai 4, answer thieu...).
 */
export function toExamQuestion(row: QbRow): ExamQuestion | null {
  const topicId = row.topic_key ?? row.domain ?? 'v6';
  const explanation = str(row.explanation_vi);
  const imageUrl = row.asset_paths[0] ? assetUrl(row.asset_paths[0]) : undefined;
  const transcript = row.audio_transcripts[0] ?? row.transcript ?? undefined;

  switch (row.question_type) {
    case 'mcq':
    case 'image-to-word-mcq':
    case 'word-to-image-mcq':
    case 'visual-mcq':
    case 'visual-count-mcq': {
      const options = toFour(row.choices?.map(str));
      const correctIndex = row.answer.index;
      if (!options || correctIndex === undefined || correctIndex < 0 || correctIndex > 3) return null;
      const optionImages =
        row.question_type === 'word-to-image-mcq' && row.asset_paths.length === 4
          ? (toFour(row.asset_paths.map(assetUrl)) ?? undefined)
          : undefined;
      return {
        id: row.id,
        topicId,
        kind: 'grammar-mcq',
        prompt: transcript ? 'Nghe và chọn đáp án đúng.' : str(row.prompt_text),
        options,
        correctIndex: correctIndex as 0 | 1 | 2 | 3,
        explanation,
        imageUrl: row.question_type === 'word-to-image-mcq' ? undefined : imageUrl,
        optionImages,
        transcript,
      };
    }
    case 'true-false': {
      if (row.answer.boolean === undefined) return null;
      return {
        id: row.id,
        topicId,
        kind: 'true-false-reading',
        passage: str(row.transcript),
        statement: str(row.prompt_text),
        answer: row.answer.boolean,
        explanation,
      };
    }
    case 'text-answer': {
      const accept = row.answer.text !== undefined ? [str(row.answer.text)] : null;
      if (!accept) return null;
      return {
        id: row.id,
        topicId,
        kind: 'text-answer',
        sentence: str(row.prompt_text),
        displaySentence: str(row.prompt_text),
        accept,
        explanation,
        imageUrl,
      };
    }
    case 'reorder': {
      const sentence = str(row.answer.text);
      if (!sentence) return null;
      const tokens = sentence.split(/\s+/).filter(Boolean);
      if (tokens.length < 2) return null;
      // Scramble deterministic theo id; lap lai neu trung dung thu tu.
      let tiles = tokens.slice();
      for (let attempt = 0; attempt < 3; attempt++) {
        const order = seededShuffleIndices(tokens.length, `${row.id}-${attempt}`);
        tiles = order.map((i) => tokens[i]!);
        if (tiles.join(' ') !== tokens.join(' ')) break;
      }
      return { id: row.id, topicId, kind: 'word-order', sentence, tiles, explanation };
    }
    default:
      return null;
  }
}

/**
 * CR-48 - formal exam / drill lay truc tiep tu V6 bank qua RPC.
 * Fetch du ~30% de bu cac row khong map duoc; thieu tiep tuc fallback
 * sang fetch them khong (RPC da random + loai rubric-type). Tra null
 * khi khong co mang/khong lay duoc cau nao - caller quyet dinh
 * fallback.
 */
export async function createExamFromBank(
  programId: ExamProgramId,
  gradeId: string,
  nowMs: number,
  opts: { count?: number; mode?: BankMode; formId?: string },
): Promise<ExamState | null> {
  if (!isSupabaseConfigured()) return null;
  const config = examConfigForGrade(gradeId);
  const target = opts.count ?? config.examCount;
  const rows = opts.formId
    ? await fetchBankForm(opts.formId)
    : await fetchBankQuestions(programId, gradeId, Math.ceil(target * 1.3), opts.mode ?? 'practice');
  const questions = rows
    .map(toExamQuestion)
    .filter((q): q is ExamQuestion => q !== null)
    .slice(0, target);
  if (questions.length === 0) return null;
  return {
    programId,
    gradeId,
    questions,
    answers: questions.map(() => null),
    currentIndex: 0,
    startedAtMs: nowMs,
    timeLimitSec: config.examTimeSec,
    finishedAtMs: null,
  };
}
