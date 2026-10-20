/**
 * CR-48 - adapter giua canonical V6 question bank (Supabase
 * `practice.qb_*`) va engine ExamQuestion hien co. RPC
 * fetch_questions/fetch_form tra row qb_questions + asset_paths +
 * audio_transcripts; mapper o day doi thanh cac kind renderer da biet
 * nen scoring/review khong thay doi.
 */
import { getSupabase, isSupabaseConfigured } from '../supabase/client';
import { getSession } from '../auth/practiceAuth';
import type { ExamProgramId, ExamQuestion } from '../../types/exam';
import { examConfigForGrade, type ExamState } from '../exam/examSession';
import { seededShuffleIndices } from '../prng';
import { isWordOrderCorrect } from '../exam/wordOrder';

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
  /** CR-51 - reading-comprehension passage (was dropped by the v6 import). */
  passage: string | null;
  /** CR-51 - the sentence a true-false item asks the learner to judge. */
  statement?: string | null;
  /** CR-51 - reorder word bank from source (preferred over splitting answer). */
  tokens?: string[] | null;
  /** word-to-image-mcq carries {assetId} objects, not strings. */
  choices: unknown[] | null;
  answer: { index?: number; boolean?: boolean; text?: string; accepted?: unknown[] };
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

/** CR-58/59: optional drill focus - qb skill filter + difficulty floor. */
export interface BankFetchFocus {
  skills?: string[];
  minDifficulty?: number;
}

export async function fetchBankQuestions(
  programId: ExamProgramId,
  gradeId: string,
  count: number,
  mode: BankMode,
  focus?: BankFetchFocus,
): Promise<QbRow[]> {
  const supabase = await getSupabase();
  // Guests always 401 on the authenticated RPC - check the (local,
  // cached) session first so guest starts skip a wasted ~600ms
  // round-trip that can never succeed.
  const params = {
    p_grade: gradeNumber(gradeId),
    p_subject: SUBJECTS[programId],
    p_count: count,
    p_skills: focus?.skills?.length ? focus.skills : null,
    p_min_difficulty: focus?.minDifficulty ?? null,
    p_mode: mode,
  };
  const session = await getSession();
  if (!session) {
    // Guests only reach the public RPC, but it enforces the same mode
    // gates (mock/exam require mockEligible + cleared approval flags).
    const pub = await supabase.rpc('fetch_questions_public', params);
    if (pub.error) throw new Error(pub.error.message);
    return (pub.data ?? []) as QbRow[];
  }
  const { data, error } = await supabase.rpc('fetch_questions', params);
  if (!error) return (data ?? []) as QbRow[];
  // Authenticated RPC failed - fall back to the public surface WITH the
  // same mode so a mock request can never be silently downgraded to
  // practice-eligible content.
  const pub = await supabase.rpc('fetch_questions_public', params);
  if (pub.error) throw new Error(pub.error.message);
  return (pub.data ?? []) as QbRow[];
}

export interface AssessmentFormInfo {
  id: string;
  kind: string;
  grade: number;
  subject: string;
  title: string;
  total_questions: number;
}

export async function listBankForms(
  gradeId: string,
  programId: ExamProgramId,
): Promise<AssessmentFormInfo[]> {
  const { data, error } = await (await getSupabase()).rpc('list_assessment_forms', {
    p_grade: gradeNumber(gradeId),
    p_subject: SUBJECTS[programId],
  });
  if (error) return [];
  return (data ?? []) as AssessmentFormInfo[];
}

export async function fetchBankForm(formId: string): Promise<QbRow[]> {
  const { data, error } = await (await getSupabase()).rpc('fetch_form', {
    p_form_id: formId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as QbRow[];
}

/**
 * CR-98: assignment questions come through the assignment-scoped RPC
 * (enrolled + open), never the admin-only fetch_form.
 */
export async function fetchAssignmentForm(assignmentId: string): Promise<QbRow[]> {
  const { data, error } = await (await getSupabase()).rpc('assignment_form', {
    p_assignment_id: assignmentId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as QbRow[];
}

function assetUrl(path: string): string {
  return `/${path.replace(/^\/+/, '')}`;
}

/**
 * word-to-image-mcq options: choices carry {assetId} objects and the row's
 * asset_paths can link MORE than the 4 rendered options (extras share
 * sort_order slots), so match each choice's assetId to its file path by id
 * stem instead of relying on position or count.
 */
function resolveOptionImages(
  choices: unknown[] | null,
  paths: string[] | null | undefined,
): [string, string, string, string] | undefined {
  if (!choices || choices.length !== 4 || !paths?.length) return undefined;
  // legacy rows with plain string choices pair 1:1 with exactly 4 paths
  if (choices.every((c) => typeof c === 'string') && paths.length === 4)
    return paths.map(assetUrl) as [string, string, string, string];
  const byId = new Map(
    paths.map((p) => [p.replace(/\.[^.]+$/, '').split('/').pop()!, p]),
  );
  const imgs = choices.map((c) => {
    const id =
      c !== null && typeof c === 'object'
        ? (c as Record<string, unknown>).assetId
        : undefined;
    const path = typeof id === 'string' ? byId.get(id) : undefined;
    return path ? assetUrl(path) : undefined;
  });
  return imgs.every(Boolean) ? (imgs as [string, string, string, string]) : undefined;
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
 * V6 choice values are not always plain strings: word-to-image-mcq
 * rows carry {assetId: 'concept-architect-cadcfc'} objects. Extract a
 * human label so verdicts/review never render "[object Object]".
 */
export function optionLabel(choice: unknown): string {
  if (typeof choice === 'string') return choice;
  if (choice !== null && typeof choice === 'object') {
    const c = choice as Record<string, unknown>;
    if (typeof c.text === 'string') return c.text;
    if (typeof c.label === 'string') return c.label;
    if (typeof c.assetId === 'string') {
      const m = c.assetId.match(/^concept-(.+)-[0-9a-f]{6}$/);
      return m ? m[1]!.replace(/-/g, ' ') : c.assetId;
    }
  }
  return String(choice ?? '');
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
      const options = toFour(row.choices?.map(optionLabel));
      const correctIndex = row.answer.index;
      if (!options || correctIndex === undefined || correctIndex < 0 || correctIndex > 3) return null;
      const optionImages =
        row.question_type === 'word-to-image-mcq'
          ? resolveOptionImages(row.choices, row.asset_paths)
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
        passage: row.passage ?? undefined,
        bankSkill: row.skill ?? undefined,
      };
    }
    case 'true-false': {
      // V6 stores the verdict as boolean (sci banks) or {text:'True'|'False',
      // index} (readtf banks) - normalize both.
      const tfChoices =
        Array.isArray(row.choices) &&
        optionLabel(row.choices[0]) === 'True' &&
        optionLabel(row.choices[1]) === 'False';
      const bool =
        row.answer.boolean ??
        (row.answer.text === 'True' || (tfChoices && row.answer.index === 0)
          ? true
          : row.answer.text === 'False' || (tfChoices && row.answer.index === 1)
            ? false
            : undefined);
      if (bool === undefined) return null;
      return {
        id: row.id,
        topicId,
        kind: 'true-false-reading',
        passage: str(row.passage ?? row.transcript),
        statement: str(row.statement ?? row.prompt_text),
        answer: bool,
        explanation,
        bankSkill: row.skill ?? undefined,
      };
    }
    case 'text-answer': {
      const accept = [
        ...(row.answer.text !== undefined ? [str(row.answer.text)] : []),
        ...(Array.isArray(row.answer.accepted) ? row.answer.accepted.map(str).filter(Boolean) : []),
      ].filter(Boolean);
      if (accept.length === 0) return null;
      return {
        id: row.id,
        topicId,
        kind: 'text-answer',
        sentence: str(row.prompt_text),
        displaySentence: str(row.prompt_text),
        accept,
        explanation,
        imageUrl,
        bankSkill: row.skill ?? undefined,
      };
    }
    case 'reorder': {
      const sentence = str(row.answer.text);
      if (!sentence) return null;
      const tokens =
        Array.isArray(row.tokens) && row.tokens.length >= 2
          ? row.tokens.map(str)
          : sentence.split(/\s+/).filter(Boolean);
      if (tokens.length < 2) return null;
      // Scramble deterministic theo id; lap lai neu trung dung thu tu.
      // Rotation fallback guarantees a non-correct order (same trick as
      // wordOrder.ts scramble) so a "shuffled" tile row can never already
      // be the answer.
      let tiles = tokens.slice();
      for (let attempt = 0; attempt < 8; attempt++) {
        const order = seededShuffleIndices(tokens.length, `${row.id}-${attempt}`);
        tiles = order.map((i) => tokens[i]!);
        // A shuffle that lands on any accepted order is a free point.
        if (tiles.join(' ') !== tokens.join(' ') && !isWordOrderCorrect(sentence, tiles)) break;
      }
      if (isWordOrderCorrect(sentence, tiles)) {
        tiles = [...tokens.slice(1), tokens[0]!];
      }
      return { id: row.id, topicId, kind: 'word-order', sentence, tiles, explanation, bankSkill: row.skill ?? undefined };
    }
    default:
      return null;
  }
}

/** CR-63 - so cau toi da nho la "da gap gan day" moi tang luyen. */
const SEEN_CAP = 80;

/**
 * CR-63 - recency exclusion phia client: pool nang cao (d>=4) nho hon
 * drillCount nen random thuan lap ~80% moi buoi. Nho id da gap trong
 * localStorage va uu tien cau chua gap; chi dung lai khi pool can.
 */
function loadSeen(key: string): string[] {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    const arr = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function markSeen(key: string, ids: string[]): void {
  try {
    const merged = [...ids, ...loadSeen(key).filter((x) => !ids.includes(x))].slice(0, SEEN_CAP);
    globalThis.localStorage?.setItem(key, JSON.stringify(merged));
  } catch {
    /* storage bi chan / day - bo qua */
  }
}

/**
 * CR-63 - uu tien cau chua gap gan day; chi lap lai khi pool can.
 * Thu tu trong tung nhom giu nguyen thu tu random cua RPC.
 */
export function pickUnseenFirst(mapped: ExamQuestion[], target: number, seen: string[]): ExamQuestion[] {
  const fresh = mapped.filter((q) => !seen.includes(q.id));
  return [...fresh, ...mapped.filter((q) => !fresh.includes(q))].slice(0, target);
}

/**
 * CR-48 - formal exam / drill lay truc tiep tu V6 bank qua RPC.
 * Fetch du ~30% de bu cac row khong map duoc (x4 khi drill theo do kho -
 * pool nang cao nho nen muon nhin gan het pool de loai cau da gap);
 * thieu tiep tuc fallback sang fetch them khong (RPC da random + loai
 * rubric-type). Tra null khi khong co mang/khong lay duoc cau nao -
 * caller quyet dinh fallback.
 */
export async function createExamFromBank(
  programId: ExamProgramId,
  gradeId: string,
  opts: { count?: number; mode?: BankMode; formId?: string; focus?: BankFetchFocus },
): Promise<ExamState | null> {
  if (!isSupabaseConfigured()) return null;
  const config = examConfigForGrade(gradeId);
  const target = opts.count ?? config.examCount;
  // CR-63/66: moi buoi luyen (khong phai form co dinh) deu uu tien cau
  // chua gap gan day - nho rieng theo mode + tier de drill/thi thu/
  // nang cao khong can tro lan nhau.
  const fixedForm = !!opts.formId;
  const mode = opts.mode ?? 'practice';
  const seenKey = `ea-seen:${programId}:${gradeId}:${mode}:${opts.focus?.minDifficulty ?? 'all'}`;
  const seen = fixedForm ? [] : loadSeen(seenKey);
  const rows = fixedForm
    ? await fetchBankForm(opts.formId!)
    : await fetchBankQuestions(
        programId,
        gradeId,
        // CR-66: tier nang cao fetch gan het pool (hien tai <= ~200) de
        // thay moi cau chua gap - tranh lap qua 20% du pool lon hon
        // sample random. Drill thuong van fetch the, khong can het pool.
        opts.focus?.minDifficulty ? 250 : Math.ceil(target * 1.6),
        mode,
        opts.focus,
      );
  const mapped = rows.map(toExamQuestion).filter((q): q is ExamQuestion => q !== null);
  // r5: malformed bank rows must not silently shorten a session - count
  // them so the UI can surface a fixed-form defect or a thin pool.
  const droppedCount = rows.length - mapped.length;
  let questions = fixedForm
    ? mapped.slice(0, target)
    : pickUnseenFirst(mapped, target, seen);
  // A shortfall after filtering means the fetch window under-sampled;
  // top up once with a larger draw before declaring the pool thin.
  if (!fixedForm && questions.length < target) {
    const extra = await fetchBankQuestions(programId, gradeId, Math.max(target, 300), mode, opts.focus);
    // r14: the server dedupes variant groups within ONE draw only - a
    // top-up can re-serve the same variant_group_id under a different
    // row id. Exclude extras whose variant key already appeared in the
    // first draw before mapping drops the key.
    const seenVariant = new Set(rows.map((r) => r.variant_group_id ?? r.id));
    const extraMapped = extra
      .filter((r) => !seenVariant.has(r.variant_group_id ?? r.id))
      .map(toExamQuestion)
      .filter((q): q is ExamQuestion => q !== null && !questions.some((x) => x.id === q.id));
    questions = pickUnseenFirst([...questions, ...extraMapped], target, seen);
  }
  if (questions.length === 0) return null;
  const poolShort = questions.length < target;
  if (!fixedForm) markSeen(seenKey, questions.map((q) => q.id));
  return {
    programId,
    gradeId,
    questions,
    answers: questions.map(() => null),
    currentIndex: 0,
    // r14: the clock starts when the exam is playable, not when the
    // caller asked for it - question loading must not consume exam time.
    startedAtMs: Date.now(),
    timeLimitSec: config.examTimeSec,
    // CR-52: practice sittings are stopwatched, not countdown-bounded.
    untimed: opts.mode !== 'mock',
    finishedAtMs: null,
    droppedCount,
    poolShort,
  };
}

/**
 * CR-98: build an exam from an assignment's fixed form. The FULL form
 * always loads (question_count comes from the take RPC) - unlike
 * createExamFromBank there is no count slicing, no seen-tracking and
 * no pool top-up: the đề is authoritative and identical for the class.
 */
export async function createExamFromAssignment(
  assignmentId: string,
  programId: ExamProgramId,
  gradeId: string,
): Promise<ExamState | null> {
  if (!isSupabaseConfigured()) return null;
  const config = examConfigForGrade(gradeId);
  const rows = await fetchAssignmentForm(assignmentId);
  const questions = rows.map(toExamQuestion).filter((q): q is ExamQuestion => q !== null);
  // CR-98 r-ext1: assignment_submit enforces exact question-set equality.
  // A form row that cannot render would shrink the sitting and doom the
  // submit to 'bad-answers' forever - fail the load instead so the
  // student sees a retryable error, not a broken exam.
  if (questions.length !== rows.length) return null;
  return {
    programId,
    gradeId,
    questions,
    answers: questions.map(() => null),
    currentIndex: 0,
    startedAtMs: Date.now(),
    timeLimitSec: config.examTimeSec,
    untimed: false,
    finishedAtMs: null,
    droppedCount: rows.length - questions.length,
    poolShort: false,
  };
}
