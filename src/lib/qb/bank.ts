/**
 * CR-48 - adapter giua canonical V6 question bank (Supabase
 * `practice.qb_*`) va engine ExamQuestion hien co. RPC
 * fetch_questions/fetch_form tra row qb_questions + asset_paths +
 * audio_transcripts; mapper o day doi thanh cac kind renderer da biet
 * nen scoring/review khong thay doi.
 */
import { getSupabase, isSupabaseConfigured } from '../supabase/client';
import { getSession } from '../auth/practiceAuth';
import { guestTicket } from './turnstile';
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
  /** CR-102: absent on the wire - the fetch RPCs strip it. Verdicts come
   *  back from `score_bank_attempts`; the field stays optional so tests
   *  and dev seeds can still construct hydrated rows. */
  answer?: { index?: number; boolean?: boolean; text?: string; accepted?: unknown[] };
  explanation_vi?: string | null;
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

/** CR-101: the bank RPC rate-limit (PT429/'rate_limited') must surface a
 *  kid-readable retry message, not a raw Postgres exception. */
function bankFetchError(error: { message: string; code?: string }): Error {
  if (error.code === 'PT429' || error.message.includes('rate_limited')) {
    return new Error('Máy chủ đang bận một chút - em thử lại sau ít phút nhé!');
  }
  // CR-108: guest challenge failed/expired or the gate is unavailable -
  // kid-readable, actionable ("thử lại") not a raw Postgres code.
  if (error.code === 'PT401' || error.message.includes('guest_challenge')) {
    return new Error('Chưa xác minh được em là người thật - em thử lại nhé!');
  }
  return new Error(error.message);
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
    // CR-108: guests also need a Turnstile ticket - a PT401 means the
    // cached ticket expired in flight, so re-mint once and retry.
    let ticket = await guestTicket();
    let pub = await supabase.rpc('fetch_questions_public', {
      ...params,
      p_guest_ticket: ticket,
    });
    if (pub.error?.code === 'PT401') {
      ticket = await guestTicket(true);
      pub = await supabase.rpc('fetch_questions_public', {
        ...params,
        p_guest_ticket: ticket,
      });
    }
    if (pub.error) throw bankFetchError(pub.error);
    return (pub.data ?? []) as QbRow[];
  }
  // CR-107: authenticated practice rounds go through the adaptive RPC
  // (ZPD difficulty bias from the caller's attempt history). A missing
  // RPC or any non-rate-limit error falls back to the plain fetch;
  // mock/exam keep the standard surface so formal pulls stay uniform.
  // Both RPCs charge the same fq_* budget, so a 429 is terminal either
  // way - surface it rather than retrying the twin surface.
  const primary = mode === 'practice' ? 'fetch_questions_adaptive' : 'fetch_questions';
  let { data, error } = await supabase.rpc(primary, params);
  if (
    error && primary === 'fetch_questions_adaptive'
    && error.code !== 'PT429' && !error.message.includes('rate_limited')
  ) {
    ({ data, error } = await supabase.rpc('fetch_questions', params));
  }
  if (!error) return (data ?? []) as QbRow[];
  // CR-101 r98: a per-uid rate limit must NOT fall back to the public
  // surface - that would silently swap the uid budget for the global guest
  // budget and the cap would never bind. Surface it instead.
  if (error.code === 'PT429' || error.message.includes('rate_limited')) {
    throw bankFetchError(error);
  }
  // Authenticated RPC failed - fall back to the public surface WITH the
  // same mode so a mock request can never be silently downgraded to
  // practice-eligible content.
  const pub = await supabase.rpc('fetch_questions_public', params);
  if (pub.error) throw bankFetchError(pub.error);
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

  // CR-102: `row.answer` is stripped on the wire - a keyless row maps to
  // a pending question (bankId + placeholder fields). `isExamAnswerCorrect`
  // branches on bankId so the placeholder can never score; hydration
  // happens after `score_bank_attempts` resolves the attempt. Rows WITH
  // an answer (tests, dev seeds, reorder - which keeps its sentence for
  // the grammar-aware tile check) map exactly as before.
  const hasKey = row.answer !== undefined && row.answer !== null;
  const pending = hasKey ? {} : { bankId: row.id };

  switch (row.question_type) {
    case 'mcq':
    case 'image-to-word-mcq':
    case 'word-to-image-mcq':
    case 'visual-mcq':
    case 'visual-count-mcq': {
      const rawOptions = toFour(row.choices?.map(optionLabel));
      const correctIndex = row.answer?.index;
      if (!rawOptions) return null;
      if (hasKey && (correctIndex === undefined || correctIndex < 0 || correctIndex > 3)) return null;
      const rawImages =
        row.question_type === 'word-to-image-mcq'
          ? resolveOptionImages(row.choices, row.asset_paths)
          : undefined;
      // CR-104: stored choice order skews the key toward index 0
      // (~30-39% position bias). Permute display order deterministically
      // per row id and keep the display->original map so the oracle still
      // grades the stored index.
      const order = seededShuffleIndices(4, `${row.id}-opts`);
      const options = order.map((i) => rawOptions[i]!) as unknown as typeof rawOptions;
      const optionImages = rawImages
        ? (order.map((i) => rawImages[i]!) as unknown as typeof rawImages)
        : undefined;
      const displayIndex =
        correctIndex === undefined ? 0 : (order.indexOf(correctIndex) as 0 | 1 | 2 | 3);
      return {
        id: row.id,
        topicId,
        kind: 'grammar-mcq',
        prompt: transcript ? 'Nghe và chọn đáp án đúng.' : str(row.prompt_text),
        options,
        correctIndex: displayIndex,
        bankOptionOrder: order,
        explanation,
        imageUrl: row.question_type === 'word-to-image-mcq' ? undefined : imageUrl,
        optionImages,
        transcript,
        passage: row.passage ?? undefined,
        bankSkill: row.skill ?? undefined,
        ...pending,
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
        row.answer?.boolean ??
        (row.answer?.text === 'True' || (tfChoices && row.answer?.index === 0)
          ? true
          : row.answer?.text === 'False' || (tfChoices && row.answer?.index === 1)
            ? false
            : undefined);
      if (hasKey && bool === undefined) return null;
      return {
        id: row.id,
        topicId,
        kind: 'true-false-reading',
        passage: str(row.passage ?? row.transcript),
        statement: str(row.statement ?? row.prompt_text),
        answer: bool ?? false,
        explanation,
        bankSkill: row.skill ?? undefined,
        ...pending,
      };
    }
    case 'text-answer': {
      const accept = [
        ...(row.answer?.text !== undefined ? [str(row.answer.text)] : []),
        ...(Array.isArray(row.answer?.accepted) ? row.answer.accepted.map(str).filter(Boolean) : []),
      ].filter(Boolean);
      if (hasKey && accept.length === 0) return null;
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
        ...pending,
      };
    }
    case 'reorder': {
      const sentence = str(row.answer?.text);
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
  if (rows.length === 0 || questions.length !== rows.length) return null;
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

// ---------------------------------------------------------------------------
// CR-102 - server-side scoring (the moat). Bank rows arrive keyless
// (bankId + placeholder answer fields); verdicts come back from
// practice.score_bank_attempts and hydrate the question objects in place.
// ---------------------------------------------------------------------------

/** One scored attempt as returned by the oracle. */
export interface BankScore {
  question_id: string;
  correct: boolean;
  correct_answer: { index?: number; boolean?: boolean; text?: string; accepted?: unknown[] } | null;
  correct_answer_text: string | null;
  explanation_vi: string | null;
  /** CR-106: the caller's account already taught this row - the attempt
   *  grades but the client marks it ungraded. */
  taught?: boolean;
}

/** CR-106 - teach_bank_question payload: a per-skill lesson, never key
 *  material (no `answer`/`choices` fields exist on the wire). */
export interface TeachResult {
  question_id: string;
  taught: boolean;
  skill?: string;
  title_vi?: string | null;
  body_vi?: string | null;
  explanation_vi?: string | null;
  error?: string;
}

/**
 * CR-106: disclose the per-skill lesson for a bank question and mark
 * (account_id, question_id) taught server-side. Authenticated only -
 * the button is hidden for guests so PT401 never reaches here in
 * normal flow.
 */
export async function teachBankQuestion(bankId: string): Promise<TeachResult> {
  const { data, error } = await (await getSupabase()).rpc('teach_bank_question', {
    p_question_id: bankId,
  });
  if (error) throw bankFetchError(error);
  return data as TeachResult;
}

/** Encode a UI-side ExamAnswer into the wire shape the oracle expects. */
export function examAnswerToWire(question: ExamQuestion, answer: import('../exam/examSession').ExamAnswer): unknown {
  switch (answer.type) {
    case 'option':
      // CR-104: `answer.index` is a DISPLAY position after the per-row
      // option shuffle; the oracle grades the stored index.
      return {
        index: ('bankOptionOrder' in question
          ? question.bankOptionOrder?.[answer.index]
          : undefined) ?? answer.index,
      };
    case 'bool': return { bool: answer.value };
    case 'text': return { text: answer.text };
    case 'order': {
      // Reorder keeps its key on the wire (isWordOrderCorrect stays
      // client-side) so it never reaches the oracle - the branch exists
      // only for completeness.
      const tiles = question.kind === 'word-order' ? question.tiles : [];
      return { picked: answer.indices.map((i) => tiles[i] ?? '') };
    }
    default: return {};
  }
}

/** Narrow to the bank-scored kinds (the only ones carrying `bankId`). */
export function isBankQuestion(
  question: ExamQuestion,
): question is ExamQuestion & { bankId: string; bankVerdict?: boolean; bankTaught?: boolean } {
  return 'bankId' in question && typeof question.bankId === 'string';
}

/**
 * Score attempts against the bank oracle. `answers[i]` pairs with
 * `questions[i]`; null answers send a guaranteed-wrong response so the
 * returned correct_answer_text still hydrates the review screen.
 * Throws the same kid-friendly error on rate-limit as the fetch path.
 */
export async function scoreBankAttempts(
  questions: readonly ExamQuestion[],
  answers: readonly (import('../exam/examSession').ExamAnswer | null)[],
): Promise<Map<string, BankScore>> {
  const attempts = questions
    .map((q, i) => ({ q, a: answers[i] }))
    // CR-106 r105: taught rows are attempted-not-scored - never sent to
    // the oracle, so an all-taught sitting finishes even offline.
    .filter(({ q }) => isBankQuestion(q) && !q.bankTaught && (!('bankVerdict' in q) || q.bankVerdict === undefined))
    .map(({ q, a }) => ({
      question_id: (q as ExamQuestion & { bankId: string }).bankId,
      response: a ? examAnswerToWire(q, a) : {},
    }));
  const map = new Map<string, BankScore>();
  if (attempts.length === 0 || !isSupabaseConfigured()) return map;
  const { data, error } = await (await getSupabase()).rpc('score_bank_attempts', {
    p_attempts: attempts,
  });
  if (error) throw bankFetchError(error);
  for (const row of (data ?? []) as BankScore[]) map.set(row.question_id, row);
  return map;
}

/**
 * Hydrate a pending bank question with the oracle's verdict: bankVerdict
 * marks the attempt, the kind's real answer fields and `explanation` get
 * written back so review rendering is identical to a hydrated row.
 */
export function hydrateBankQuestion(question: ExamQuestion, score: BankScore, honorTaught = false): ExamQuestion {
  const key = score.correct_answer;
  const shared = {
    bankVerdict: score.correct,
    bankCorrectText: score.correct_answer_text ?? '',
    explanation: score.explanation_vi ?? question.explanation,
    // CR-106: a server-flagged taught attempt is ungraded - carry the
    // marker so computeExamResult excludes it, but ONLY in ordinary
    // practice sittings (honorTaught): inside a review/form/mock/
    // assignment the teacher's đề must still grade, otherwise
    // pre-teaching form rows would let a learner shrink their score
    // denominator (r105/r108/r109).
    bankTaught: honorTaught && score.taught === true ? true : ('bankTaught' in question ? question.bankTaught : undefined),
  };
  switch (question.kind) {
    case 'grammar-mcq': {
      // CR-104: the disclosed key.index is in ORIGINAL bank order -
      // translate back to the displayed position via bankOptionOrder.
      const origIdx = typeof key?.index === 'number' ? key.index : null;
      const idx =
        origIdx === null
          ? question.correctIndex
          : question.bankOptionOrder?.indexOf(origIdx) ?? -1;
      return { ...question, ...shared, correctIndex: (idx >= 0 && idx <= 3 ? idx : 0) as 0 | 1 | 2 | 3 };
    }
    case 'true-false-reading': {
      // correct_answer_text ('True'/'False') is authoritative - it also
      // covers index-only keys ({index:0}) that the key branches below
      // would miss. Boolean/text/index key fields remain as fallbacks.
      const text = score.correct_answer_text;
      const bool =
        key?.boolean ??
        (text === 'True' || key?.text === 'True'
          ? true
          : text === 'False' || key?.text === 'False'
            ? false
            : key?.index === 0 ? true : key?.index === 1 ? false : question.answer);
      return { ...question, ...shared, answer: bool };
    }
    case 'text-answer': {
      const accept = [
        ...(key?.text !== undefined ? [str(key.text)] : []),
        ...(Array.isArray(key?.accepted) ? key.accepted.map(str).filter(Boolean) : []),
      ];
      return { ...question, ...shared, accept: accept.length > 0 ? accept : question.accept };
    }
    case 'word-order':
      return key?.text ? { ...question, ...shared, sentence: key.text } : { ...question, ...shared };
    default:
      return { ...question, ...shared };
  }
}

/**
 * Resolve every pending bank question in a sitting - unanswered items
 * are scored too so the review sheet can show the correct answer text.
 * Returns a new questions array; local (non-bank) questions pass through
 * untouched.
 */
export async function resolveBankVerdicts(
  questions: readonly ExamQuestion[],
  answers: readonly (import('../exam/examSession').ExamAnswer | null)[],
  honorTaught = false,
): Promise<ExamQuestion[]> {
  const scores = await scoreBankAttempts(questions, answers);
  if (scores.size === 0) return [...questions];
  return questions.map((q) => {
    const score = isBankQuestion(q) ? scores.get(q.bankId) : undefined;
    return score ? hydrateBankQuestion(q, score, honorTaught) : q;
  });
}
