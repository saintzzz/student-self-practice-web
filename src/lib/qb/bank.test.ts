import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createExamFromAssignment, createExamFromBank, examAnswerToWire, fetchBankQuestions, gradeNumber, hydrateBankQuestion, pickUnseenFirst, resolveBankVerdicts, teachBankQuestion, toExamQuestion, type QbRow } from './bank';
import { examCorrectAnswerText, isExamAnswerCorrect } from '../exam/examSession';

const { rpcMock, getSessionMock, guestTicketMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  getSessionMock: vi.fn(),
  guestTicketMock: vi.fn(async () => 'v1.test.ticket'),
}));
vi.mock('../supabase/client', () => ({
  getSupabase: async () => ({ rpc: rpcMock }),
  isSupabaseConfigured: () => true,
}));
vi.mock('../auth/practiceAuth', () => ({ getSession: getSessionMock }));
vi.mock('./turnstile', () => ({ guestTicket: guestTicketMock }));

function row(partial: Partial<QbRow>): QbRow {
  return {
    id: 'q1',
    grade: 3,
    subject: 'english',
    domain: 'vocabulary',
    skill: 'vocabulary-recognition',
    question_type: 'mcq',
    difficulty: 2,
    topic_key: 'school-objects',
    prompt_text: 'Choose the correct word.',
    transcript: null,
    passage: null,
    choices: null,
    answer: {},
    explanation_vi: 'Giai thich.',
    variant_group_id: null,
    asset_paths: [],
    audio_transcripts: [],
    ...partial,
  };
}

describe('gradeNumber', () => {
  it('parses grade-N ids', () => {
    expect(gradeNumber('grade-1')).toBe(1);
    expect(gradeNumber('grade-5')).toBe(5);
  });
  it('falls back to 5 on unknown ids', () => {
    expect(gradeNumber('unknown')).toBe(5);
  });
});

describe('toExamQuestion', () => {
  it('maps mcq to grammar-mcq with correctIndex', () => {
    const q = toExamQuestion(row({
      choices: ['a', 'b', 'c', 'd'],
      answer: { index: 2 },
    }));
    // CR-104: display order is a per-row permutation - assert the
    // invariants (same set, correctIndex lands on the right option),
    // never a hardcoded order.
    if (q?.kind !== 'grammar-mcq') throw new Error('expected grammar-mcq');
    expect([...q.options].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(q.options[q.correctIndex]).toBe('c');
    expect(q.bankOptionOrder).toHaveLength(4);
    expect([...(q.bankOptionOrder ?? [])].sort()).toEqual([0, 1, 2, 3]);
    expect(isExamAnswerCorrect(q, { type: 'option', index: q.correctIndex })).toBe(true);
    expect(isExamAnswerCorrect(q, { type: 'option', index: q.options.indexOf('a') })).toBe(false);
  });

  it('maps image-to-word-mcq with imageUrl', () => {
    const q = toExamQuestion(row({
      question_type: 'image-to-word-mcq',
      choices: ['scissors', 'ruler', 'bag', 'pencil'],
      answer: { index: 3 },
      asset_paths: ['images/concepts/concept-pencil.webp'],
    }));
    expect(q).toMatchObject({ kind: 'grammar-mcq', imageUrl: '/images/concepts/concept-pencil.webp' });
  });

  it('maps word-to-image-mcq with optionImages', () => {
    const q = toExamQuestion(row({
      question_type: 'word-to-image-mcq',
      choices: ['scissors', 'ruler', 'bag', 'pencil'],
      answer: { index: 0 },
      asset_paths: ['images/a.webp', 'images/b.webp', 'images/c.webp', 'images/d.webp'],
    }));
    if (q?.kind !== 'grammar-mcq') throw new Error('expected grammar-mcq');
    // optionImages permute in lockstep with options via bankOptionOrder.
    const order = q.bankOptionOrder!;
    expect(q.optionImages).toEqual(order.map((i) => `/images/${'abcd'[i]}.webp`));
  });

  it('maps reading mcq: passage flows through (CR-51)', () => {
    const q = toExamQuestion(row({
      prompt_text: 'Read the passage. Where does Lan go on Sunday?',
      passage: 'On Sunday, Lan goes to the sports centre with a friend.',
      choices: ['library', 'sports centre', 'school', 'park'],
      answer: { index: 1 },
    }));
    expect(q).toMatchObject({
      kind: 'grammar-mcq',
      passage: 'On Sunday, Lan goes to the sports centre with a friend.',
    });
    if (q?.kind !== 'grammar-mcq') throw new Error('expected grammar-mcq');
    expect(q.options[q.correctIndex]).toBe('sports centre');
  });

  it('maps true-false reading: passage preferred over transcript (CR-51)', () => {
    const q = toExamQuestion(row({
      question_type: 'true-false',
      prompt_text: 'Read the passage and decide: True or False?',
      passage: 'I say hello to my friend.',
      answer: { boolean: true },
    }));
    expect(q).toMatchObject({
      kind: 'true-false-reading',
      passage: 'I say hello to my friend.',
      answer: true,
    });
  });

  it('maps listening mcq: transcript attached, prompt replaced', () => {
    const q = toExamQuestion(row({
      question_type: 'mcq',
      skill: 'listening',
      choices: ['cat', 'dog', 'bird', 'fish'],
      answer: { index: 1 },
      audio_transcripts: ['It is a dog.'],
    }));
    expect(q).toMatchObject({ kind: 'grammar-mcq', transcript: 'It is a dog.', prompt: 'Nghe và chọn đáp án đúng.' });
  });

  it('maps true-false', () => {
    const q = toExamQuestion(row({ question_type: 'true-false', answer: { boolean: true } }));
    expect(q).toMatchObject({ kind: 'true-false-reading', answer: true });
    expect(isExamAnswerCorrect(q!, { type: 'bool', value: true })).toBe(true);
    expect(isExamAnswerCorrect(q!, { type: 'bool', value: false })).toBe(false);
  });

  it('maps text-answer', () => {
    const q = toExamQuestion(row({ question_type: 'text-answer', answer: { text: '11' } }));
    expect(q).toMatchObject({ kind: 'text-answer', accept: ['11'] });
    expect(isExamAnswerCorrect(q!, { type: 'text', text: ' 11 ' })).toBe(true);
  });

  it('maps reorder with scrambled tiles (never the sorted order)', () => {
    const q = toExamQuestion(row({ question_type: 'reorder', answer: { text: 'I like my ruler.' } }));
    expect(q).toMatchObject({ kind: 'word-order', sentence: 'I like my ruler.' });
    if (q?.kind !== 'word-order') throw new Error('expected word-order');
    expect(q.tiles.length).toBe(4);
    expect([...q.tiles].sort()).toEqual(['I', 'like', 'my', 'ruler.'].sort());
    expect(q.tiles.join(' ')).not.toBe('I like my ruler.');
    const correct = [q.tiles.indexOf('I'), q.tiles.indexOf('like'), q.tiles.indexOf('my'), q.tiles.indexOf('ruler.')];
    expect(isExamAnswerCorrect(q, { type: 'order', indices: correct })).toBe(true);
  });

  it('coerces numeric choices/answers to strings (math banks)', () => {
    const q = toExamQuestion(row({
      subject: 'math',
      choices: ['7', '8', '9', '10'],
      answer: { index: 1 },
    }));
    if (q?.kind !== 'grammar-mcq') throw new Error('expected grammar-mcq');
    expect([...q.options].sort()).toEqual(['10', '7', '8', '9']);
    const ta = toExamQuestion(row({ question_type: 'text-answer', answer: { text: 11 as unknown as string } }));
    expect(ta).toMatchObject({ kind: 'text-answer', accept: ['11'] });
  });

  it('labels {assetId} choices from the concept slug - no [object Object]', () => {
    // Real V6 shape for word-to-image-mcq (1,462 rows).
    const q = toExamQuestion(row({
      question_type: 'word-to-image-mcq',
      choices: [
        { assetId: 'concept-dentist-fed1df' },
        { assetId: 'concept-engineer-616954' },
        { assetId: 'concept-architect-cadcfc' },
        { assetId: 'concept-banker-9cc826' },
      ],
      answer: { index: 2 },
      asset_paths: [
        'images/concepts/concept-dentist-fed1df.webp',
        'images/concepts/concept-engineer-616954.webp',
        'images/concepts/concept-architect-cadcfc.webp',
        'images/concepts/concept-banker-9cc826.webp',
      ],
    }));
    if (q?.kind !== 'grammar-mcq') throw new Error('expected grammar-mcq');
    expect([...q.options].sort()).toEqual(['architect', 'banker', 'dentist', 'engineer']);
    expect(q.options[q.correctIndex]).toBe('architect');
    expect(q.optionImages).toHaveLength(4);
    expect(isExamAnswerCorrect(q, { type: 'option', index: q.correctIndex })).toBe(true);
  });

  it('word-to-image-mcq resolves images by assetId when join rows exceed 4 (real prod bug)', () => {
    // qb_question_assets links extra distractor assets with duplicated
    // sort_order, so asset_paths is not the ordered 4-option list.
    const q = toExamQuestion(row({
      question_type: 'word-to-image-mcq',
      choices: [
        { assetId: 'concept-think-b8049a' },
        { assetId: 'concept-wink-7c380e' },
        { assetId: 'concept-medal-74478a' },
        { assetId: 'concept-goal-6711f5' },
      ],
      answer: { index: 3 },
      asset_paths: [
        'images/concepts/concept-pushpin-f5a59d.webp',
        'images/concepts/concept-think-b8049a.webp',
        'images/concepts/concept-wink-7c380e.webp',
        'images/concepts/concept-medal-74478a.webp',
        'images/concepts/concept-salad-e7fc08.webp',
        'images/concepts/concept-goal-6711f5.webp',
        'images/concepts/concept-sunset-ebf3c4.webp',
      ],
    }));
    if (q?.kind !== 'grammar-mcq') throw new Error('expected grammar-mcq');
    expect([...q.optionImages!].sort()).toEqual([
      '/images/concepts/concept-goal-6711f5.webp',
      '/images/concepts/concept-medal-74478a.webp',
      '/images/concepts/concept-think-b8049a.webp',
      '/images/concepts/concept-wink-7c380e.webp',
    ].sort());
    // still paired 1:1 with the labels through the shared permutation
    const order = q.bankOptionOrder!;
    const orig = [
      '/images/concepts/concept-think-b8049a.webp',
      '/images/concepts/concept-wink-7c380e.webp',
      '/images/concepts/concept-medal-74478a.webp',
      '/images/concepts/concept-goal-6711f5.webp',
    ];
    expect(q.optionImages).toEqual(order.map((i) => orig[i]));
  });

  it('returns null when choices are not exactly 4', () => {
    expect(toExamQuestion(row({ choices: ['a', 'b', 'c'], answer: { index: 0 } }))).toBeNull();
  });

  it('returns null for unmappable types', () => {
    expect(toExamQuestion(row({ question_type: 'constructed-response' }))).toBeNull();
    expect(toExamQuestion(row({ question_type: 'speaking-prompt' }))).toBeNull();
  });
});

describe('pickUnseenFirst (CR-63)', () => {
  const mk = (id: string) => ({ id }) as never;

  it('prefers unseen questions and keeps order', () => {
    const pool = [mk('a'), mk('b'), mk('c'), mk('d')] as unknown as import('../../types/exam').ExamQuestion[];
    const picked = pickUnseenFirst(pool, 2, ['a', 'b']);
    expect(picked.map((q) => q.id)).toEqual(['c', 'd']);
  });

  it('falls back to seen questions when the fresh pool is too small', () => {
    const pool = [mk('a'), mk('b'), mk('c')] as unknown as import('../../types/exam').ExamQuestion[];
    const picked = pickUnseenFirst(pool, 3, ['a', 'b']);
    expect(picked.map((q) => q.id)).toEqual(['c', 'a', 'b']);
  });

  it('never returns duplicates or more than target', () => {
    const pool = [mk('a'), mk('b')] as unknown as import('../../types/exam').ExamQuestion[];
    const picked = pickUnseenFirst(pool, 5, ['a', 'b']);
    expect(picked).toHaveLength(2);
    expect(new Set(picked.map((q) => q.id)).size).toBe(2);
  });
});

describe('createExamFromBank - r14', () => {
  const mcq = (id: string, group: string | null) => row({
    id,
    variant_group_id: group,
    choices: ['a', 'b', 'c', 'd'],
    answer: { index: 0 },
  });

  beforeEach(() => {
    rpcMock.mockReset();
    getSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } });
    localStorage.clear();
  });

  it('top-up dedupes variant groups across separate draws', async () => {
    // First draw under-samples (1 of target 2); top-up serves another
    // row of the same variant group plus a fresh group.
    rpcMock
      .mockResolvedValueOnce({ data: [mcq('a', 'G')], error: null })
      .mockResolvedValueOnce({ data: [mcq('b', 'G'), mcq('c', 'H')], error: null });
    const st = await createExamFromBank('english', 'grade-3', { count: 2, mode: 'practice' });
    const ids = st!.questions.map((q) => String(q.id));
    expect(ids).toContain('a');
    expect(ids).toContain('c');
    expect(ids).not.toContain('b');
    expect(st!.questions).toHaveLength(2);
  });

  it('starts the clock after assembly, not before (r14)', async () => {
    vi.useFakeTimers();
    try {
      const t0 = Date.now();
      rpcMock.mockImplementationOnce(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
        return { data: [mcq('a', null)], error: null };
      });
      const st = await createExamFromBank('english', 'grade-3', { count: 1, mode: 'mock' });
      expect(st!.startedAtMs - t0).toBeGreaterThanOrEqual(30_000);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('CR-102 server-side scoring', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    getSessionMock.mockReset();
  });

  it('keyless mcq rows map to a pending question - no answer fields baked', () => {
    const q = toExamQuestion(row({
      question_type: 'mcq',
      choices: ['a', 'b', 'c', 'd'],
      answer: undefined,
      explanation_vi: undefined,
    }));
    expect(q).toMatchObject({ kind: 'grammar-mcq', bankId: 'q1' });
    if (q?.kind !== 'grammar-mcq') throw new Error('expected grammar-mcq');
    expect([...q.options].sort()).toEqual(['a', 'b', 'c', 'd']);
    // A pending question must never score - unresolved verdict reads false.
    expect(isExamAnswerCorrect(q, { type: 'option', index: 0 })).toBe(false);
  });

  it('hydrateBankQuestion writes the real key back for review display', () => {
    const q = toExamQuestion(row({
      question_type: 'mcq',
      choices: ['a', 'b', 'c', 'd'],
      answer: undefined,
      explanation_vi: undefined,
    }))!;
    const hydrated = hydrateBankQuestion(q, {
      question_id: 'q1',
      correct: true,
      correct_answer: { index: 2, text: 'c' },
      correct_answer_text: 'c',
      explanation_vi: 'Dung roi.',
    });
    // The disclosed index 2 is ORIGINAL bank order - the hydrated
    // correctIndex is its DISPLAY position via bankOptionOrder.
    if (hydrated.kind !== 'grammar-mcq') throw new Error('expected grammar-mcq');
    expect(hydrated).toMatchObject({ bankId: 'q1', bankVerdict: true, explanation: 'Dung roi.' });
    expect(hydrated.options[hydrated.correctIndex]).toBe('c');
    expect(isExamAnswerCorrect(hydrated, { type: 'option', index: hydrated.correctIndex })).toBe(true);
    expect(examCorrectAnswerText(hydrated)).toBe('c');
  });

  it('resolveBankVerdicts scores only unresolved bank questions', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'u1' } });
    const pending = toExamQuestion(row({ question_type: 'mcq', choices: ['a','b','c','d'], answer: undefined }))!;
    const resolved = {
      ...toExamQuestion(row({ id: 'q2', question_type: 'mcq', choices: ['a','b','c','d'], answer: undefined }))!,
      bankVerdict: true,
    };
    rpcMock.mockResolvedValue({ data: [{
      question_id: 'q1', correct: true,
      correct_answer: { index: 0 }, correct_answer_text: 'a', explanation_vi: null,
    }], error: null });
    const out = await resolveBankVerdicts([pending, resolved], [{ type: 'option', index: 0 }, { type: 'option', index: 0 }]);
    // Only the pending one hit the wire.
    expect(rpcMock).toHaveBeenCalledTimes(1);
    const attempts = (rpcMock.mock.calls[0]![1] as { p_attempts: unknown[] }).p_attempts;
    expect(attempts).toHaveLength(1);
    if (out[0]!.kind !== 'grammar-mcq') throw new Error('expected grammar-mcq');
    // Returned key index 0 (original) -> display position via the order map.
    expect(out[0]!.bankVerdict).toBe(true);
    expect(out[0]!.bankOptionOrder![out[0]!.correctIndex]).toBe(0);
    expect(out[1]).toBe(resolved);
  });

  it('reorder rows keep the answer key on the wire (client-side grammar check)', () => {
    const q = toExamQuestion(row({
      question_type: 'reorder',
      answer: { text: 'I like cats' },
      tokens: ['I', 'like', 'cats'],
    }));
    expect(q).toMatchObject({ kind: 'word-order', sentence: 'I like cats' });
    expect('bankId' in q! && q!.bankId).toBeFalsy();
  });

  it('r99: skipped attempts hydrate display text without the structured key', () => {
    const q = toExamQuestion(row({
      question_type: 'mcq',
      choices: ['a', 'b', 'c', 'd'],
      answer: undefined,
      explanation_vi: undefined,
    }))!;
    // An empty/skip attempt returns correct_answer:null (0048) - review
    // still needs the answer text, and it must come from bankCorrectText.
    const hydrated = hydrateBankQuestion(q, {
      question_id: 'q1',
      correct: false,
      correct_answer: null,
      correct_answer_text: 'b',
      explanation_vi: 'Dap an la b.',
    });
    expect(hydrated).toMatchObject({ bankVerdict: false, bankCorrectText: 'b' });
    expect(examCorrectAnswerText(hydrated)).toBe('b');
    expect(isExamAnswerCorrect(hydrated, { type: 'option', index: 1 })).toBe(false);
  });

  it('r99: true-false index-only keys hydrate via correct_answer_text', () => {
    const q = toExamQuestion(row({
      question_type: 'true-false',
      choices: ['True', 'False'],
      answer: undefined,
      explanation_vi: undefined,
    }))!;
    // Keys like {index:0} carry no boolean/text - the oracle's derived
    // text is the only reliable verdict the key resolves to.
    const hydrated = hydrateBankQuestion(q, {
      question_id: 'q1',
      correct: true,
      correct_answer: { index: 0 },
      correct_answer_text: 'True',
      explanation_vi: null,
    });
    expect(hydrated).toMatchObject({ bankVerdict: true, answer: true });
    expect(examCorrectAnswerText(hydrated)).toBe('True');
  });
});

describe('fetchBankQuestions - CR-101 rate limiting', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    getSessionMock.mockReset();
  });

  it('authenticated PT429 surfaces immediately - no public fallback (r98)', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'u1' } });
    rpcMock.mockResolvedValue({ data: null, error: { code: 'PT429', message: 'rate_limited' } });
    await expect(fetchBankQuestions('english', 'grade-3', 5, 'practice'))
      .rejects.toThrow('thử lại sau');
    // The per-uid budget must bind: never swapped for the guest bucket.
    // CR-107: practice goes through the adaptive RPC first - its rate
    // limit must not fall back to fetch_questions either (that would
    // double the learner's fetch budget across two RPC buckets).
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('fetch_questions_adaptive', expect.anything());
  });

  it('guest path uses the public RPC and maps PT429 to a friendly error', async () => {
    getSessionMock.mockResolvedValue(null);
    rpcMock.mockResolvedValue({ data: null, error: { code: 'PT429', message: 'rate_limited' } });
    await expect(fetchBankQuestions('english', 'grade-3', 5, 'practice'))
      .rejects.toThrow('thử lại sau');
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('fetch_questions_public', expect.anything());
  });
});

describe('fetchBankQuestions - CR-108 guest Turnstile ticket', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    getSessionMock.mockReset();
    guestTicketMock.mockReset();
    guestTicketMock.mockResolvedValue('v1.test.ticket');
  });

  it('guest fetch passes p_guest_ticket to the public RPC', async () => {
    getSessionMock.mockResolvedValue(null);
    rpcMock.mockResolvedValue({ data: [row({})], error: null });
    await fetchBankQuestions('english', 'grade-3', 5, 'practice');
    expect(guestTicketMock).toHaveBeenCalled();
    expect(rpcMock).toHaveBeenCalledWith(
      'fetch_questions_public',
      expect.objectContaining({ p_guest_ticket: 'v1.test.ticket' }),
    );
  });

  it('PT401 re-mints the ticket and retries once', async () => {
    getSessionMock.mockResolvedValue(null);
    guestTicketMock
      .mockResolvedValueOnce('v1.stale.ticket')
      .mockResolvedValueOnce('v1.fresh.ticket');
    rpcMock
      .mockResolvedValueOnce({ data: null, error: { code: 'PT401', message: 'guest_challenge_required' } })
      .mockResolvedValueOnce({ data: [row({})], error: null });
    const rows = await fetchBankQuestions('english', 'grade-3', 5, 'practice');
    expect(rows).toHaveLength(1);
    expect(guestTicketMock.mock.calls[0]).toHaveLength(0);
    expect(guestTicketMock).toHaveBeenNthCalledWith(2, true);
    expect(rpcMock).toHaveBeenCalledTimes(2);
  });

  it('persistent PT401 surfaces the friendly challenge error', async () => {
    getSessionMock.mockResolvedValue(null);
    rpcMock.mockResolvedValue({ data: null, error: { code: 'PT401', message: 'guest_challenge_required' } });
    await expect(fetchBankQuestions('english', 'grade-3', 5, 'practice'))
      .rejects.toThrow('thử lại');
    expect(rpcMock).toHaveBeenCalledTimes(2);
  });

  it('authed callers never mint a ticket', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'u1' } });
    rpcMock.mockResolvedValue({ data: [row({})], error: null });
    await fetchBankQuestions('english', 'grade-3', 5, 'practice');
    expect(guestTicketMock).not.toHaveBeenCalled();
  });
});

describe('fetchBankQuestions - CR-107 adaptive fetch seam', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    getSessionMock.mockReset();
  });

  it('AC-107.1/7: authenticated practice calls fetch_questions_adaptive with p_mode', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'u1' } });
    rpcMock.mockResolvedValue({ data: [], error: null });
    await fetchBankQuestions('english', 'grade-3', 5, 'practice');
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith(
      'fetch_questions_adaptive',
      expect.objectContaining({ p_mode: 'practice' }),
    );
  });

  it('AC-107.2: a missing/failed adaptive RPC falls back to fetch_questions', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'u1' } });
    rpcMock
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST202', message: 'not found' } })
      .mockResolvedValueOnce({ data: [row({ id: 'ok' })], error: null });
    const rows = await fetchBankQuestions('english', 'grade-3', 5, 'practice');
    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(rpcMock.mock.calls[0]![0]).toBe('fetch_questions_adaptive');
    expect(rpcMock.mock.calls[1]![0]).toBe('fetch_questions');
    expect(rows).toHaveLength(1);
  });

  it('AC-107.4: adaptive PT429 surfaces - no fallback to a second budget', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'u1' } });
    rpcMock.mockResolvedValue({ data: null, error: { code: 'PT429', message: 'rate_limited' } });
    await expect(fetchBankQuestions('english', 'grade-3', 5, 'practice'))
      .rejects.toThrow('thử lại sau');
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it('AC-107.5: mock mode keeps the uniform fetch - exams do not adapt', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'u1' } });
    rpcMock.mockResolvedValue({ data: [], error: null });
    await fetchBankQuestions('english', 'grade-3', 5, 'mock');
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith(
      'fetch_questions',
      expect.objectContaining({ p_mode: 'mock' }),
    );
  });

  it('AC-107.4: guests never reach the adaptive RPC', async () => {
    getSessionMock.mockResolvedValue(null);
    rpcMock.mockResolvedValue({ data: [], error: null });
    await fetchBankQuestions('english', 'grade-3', 5, 'practice');
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('fetch_questions_public', expect.anything());
  });
});

describe('createExamFromAssignment - CR-98 r-ext1', () => {
  const mcq = (id: string) => row({
    id,
    choices: ['a', 'b', 'c', 'd'],
    answer: { index: 0 },
  });

  beforeEach(() => {
    rpcMock.mockReset();
    getSessionMock.mockReset().mockResolvedValue({ user: { id: 'u1' } });
  });

  it('fails the load when any form row cannot render', async () => {
    // submit enforces exact question-set equality - silently dropping an
    // unrenderable row would doom the submit to 'bad-answers' forever.
    rpcMock.mockResolvedValueOnce({
      data: [mcq('a'), row({ id: 'bad', choices: ['a', 'b', 'c', 'd'], answer: { index: 7 } })],
      error: null,
    });
    const st = await createExamFromAssignment('asg-1', 'english', 'grade-3');
    expect(st).toBeNull();
  });

  it('rejects an empty form too', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    const st = await createExamFromAssignment('asg-1', 'english', 'grade-3');
    expect(st).toBeNull();
  });

  it('returns the full fixed form when every row renders', async () => {
    rpcMock.mockResolvedValueOnce({ data: [mcq('a'), mcq('b'), mcq('c')], error: null });
    const st = await createExamFromAssignment('asg-1', 'english', 'grade-3');
    expect(st).not.toBeNull();
    expect(st!.questions.map((q) => String(q.id))).toEqual(['a', 'b', 'c']);
    expect(st!.droppedCount).toBe(0);
  });
});

describe('CR-104 option permutation (position-leak fix)', () => {
  const mcq = (id: string, correct = 0) => toExamQuestion(row({
    id,
    question_type: 'mcq',
    choices: ['w', 'x', 'y', 'z'],
    answer: { index: correct },
  }));

  it('display order is deterministic per row id (stable across remounts)', () => {
    const a = mcq('q-det-1')!;
    const b = mcq('q-det-1')!;
    if (a.kind !== 'grammar-mcq' || b.kind !== 'grammar-mcq') throw new Error('mcq');
    expect(a.options).toEqual(b.options);
    expect(a.bankOptionOrder).toEqual(b.bankOptionOrder);
    expect(a.correctIndex).toBe(b.correctIndex);
  });

  it('different ids produce different permutations (not a fixed rotation)', () => {
    const orders = new Set(
      ['q-1', 'q-2', 'q-3', 'q-4', 'q-5', 'q-6'].map(
        (id) => (mcq(id) as { bankOptionOrder?: number[] }).bankOptionOrder!.join(','),
      ),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it('the stored key bias never reaches the display position', () => {
    // 400 rows per original index - the audit case plus r102's demand that
    // EVERY original index lands uniformly on every display position.
    // Old hash-per-position shuffle gave index0 -> [33%,17%,25%,25%] and
    // only 12/24 reachable permutations; mulberry32 stream is ~uniform.
    for (let orig = 0; orig < 4; orig += 1) {
      const counts = [0, 0, 0, 0];
      for (let i = 0; i < 400; i += 1) {
        const q = mcq(`q-bias-${orig}-${i}`, orig)!;
        if (q.kind !== 'grammar-mcq') throw new Error('mcq');
        counts[q.correctIndex]! += 1;
      }
      for (const c of counts) {
        // expectation 100; [75,125] is loose for determinism but fails
        // the old 133/67 correlation outright.
        expect(c).toBeGreaterThanOrEqual(75);
        expect(c).toBeLessThanOrEqual(125);
      }
    }
  });

  it('examAnswerToWire maps the picked display index back to the original index', () => {
    const q = mcq('q-wire', 3)!; // 'z' is the stored-correct option
    if (q.kind !== 'grammar-mcq') throw new Error('mcq');
    const picked = q.options.indexOf('z'); // display position of 'z'
    const wire = examAnswerToWire(q, { type: 'option', index: picked });
    expect(wire).toEqual({ index: 3 });
  });

  it('keyless rows still shuffle - the placeholder can never leak position 0', () => {
    const q = toExamQuestion(row({
      question_type: 'mcq',
      choices: ['a', 'b', 'c', 'd'],
      answer: undefined,
    }))!;
    if (q.kind !== 'grammar-mcq') throw new Error('mcq');
    expect(q.bankOptionOrder).toHaveLength(4);
    // The wire still sends the original index for the picked display slot.
    const wire = examAnswerToWire(q, { type: 'option', index: 0 });
    expect(wire).toEqual({ index: q.bankOptionOrder![0] });
  });
});

describe('CR-106 teach-me (AC-106.1/106.2)', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    getSessionMock.mockReset();
  });

  it('teachBankQuestion calls the teach RPC with the question id', async () => {
    rpcMock.mockResolvedValue({
      data: {
        question_id: 'q1',
        taught: true,
        skill: 'grammar-use-of-english',
        title_vi: 'Ngữ pháp trong câu',
        body_vi: 'Nhìn chủ ngữ.',
        explanation_vi: 'She di voi is.',
      },
      error: null,
    });
    const lesson = await teachBankQuestion('q1');
    expect(rpcMock).toHaveBeenCalledWith('teach_bank_question', { p_question_id: 'q1' });
    expect(lesson).toMatchObject({ taught: true, title_vi: 'Ngữ pháp trong câu' });
  });

  it('teachBankQuestion maps RPC errors to the kid-friendly message', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: 'PT429', message: 'rate_limited' } });
    await expect(teachBankQuestion('q1')).rejects.toThrow('thử lại sau');
  });

  it('AC-106.2: a server-flagged taught verdict hydrates bankTaught - attempted-not-scored', () => {
    const q = toExamQuestion(row({
      question_type: 'mcq',
      choices: ['a', 'b', 'c', 'd'],
      answer: undefined,
      explanation_vi: undefined,
    }))!;
    // Even a CORRECT oracle verdict on a taught row must mark the item
    // ungraded - the flag, not the correctness, drives the exclusion.
    const hydrated = hydrateBankQuestion(q, {
      question_id: 'q1',
      correct: true,
      correct_answer: { index: 0 },
      correct_answer_text: 'a',
      explanation_vi: 'Giai thich.',
      taught: true,
    }, true);
    expect(hydrated).toMatchObject({ bankTaught: true });
  });

  it('AC-106.2 r105: graded sittings ignore the taught flag - fixed forms still grade', () => {
    const q = toExamQuestion(row({
      question_type: 'mcq',
      choices: ['a', 'b', 'c', 'd'],
      answer: undefined,
      explanation_vi: undefined,
    }))!;
    // honorTaught=false models the exam/assignment path: a learner who
    // pre-taught a form row must not get it removed from grading.
    const hydrated = hydrateBankQuestion(q, {
      question_id: 'q1',
      correct: true,
      correct_answer: { index: 0 },
      correct_answer_text: 'a',
      explanation_vi: null,
      taught: true,
    }, false);
    expect('bankTaught' in hydrated ? hydrated.bankTaught : undefined).toBeUndefined();
    expect('bankVerdict' in hydrated ? hydrated.bankVerdict : undefined).toBe(true);
  });

  it('untaught rows keep bankTaught undefined after hydrate', () => {
    const q = toExamQuestion(row({
      question_type: 'mcq',
      choices: ['a', 'b', 'c', 'd'],
      answer: undefined,
      explanation_vi: undefined,
    }))!;
    const hydrated = hydrateBankQuestion(q, {
      question_id: 'q1',
      correct: false,
      correct_answer: null,
      correct_answer_text: 'a',
      explanation_vi: null,
    });
    expect('bankTaught' in hydrated ? hydrated.bankTaught : undefined).toBeUndefined();
  });
});
