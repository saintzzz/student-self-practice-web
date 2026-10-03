/**
 * CR-49 / V7 slice 1 - attempt telemetry + adaptive shadow logging.
 * Moi cau tra loi (V6 bank path) ghi vao qb_attempt_events qua
 * record_attempt_events - append-only, idempotent qua client_event_id
 * nen retry/flush lai khong bao gio duplicate. Fire-and-forget: loi
 * ghi khong bao gio lam gian doan flow lam bai.
 *
 * Adaptive shadow: sau moi cau, tinh rolling accuracy va log quyet
 * dinh "adaptive se chon do kho nao" vao qb_adaptive_decisions -
 * shadow=true, KHONG anh huong question selection toi khi co pilot
 * data (V7 ruling: no false precision).
 */
import { getSupabase, isSupabaseConfigured } from '../supabase/client';
import type { ExamProgramId, ExamQuestion } from '../../types/exam';
import type { ExamAnswer } from '../exam/examSession';
import { isExamAnswerCorrect } from '../exam/examSession';
import { getSession } from '../auth/practiceAuth';

interface AttemptEvent {
  client_event_id: string;
  question_id: string;
  program_id: string;
  grade: number;
  mode: 'practice' | 'mock' | 'form' | 'arena' | 'review' | 'batch';
  form_id: string | null;
  is_correct: boolean;
  latency_ms: number;
  session_id: string;
  answered_at: string;
}

export type ExamTelemetryMode = 'practice' | 'mock' | 'form' | 'arena' | 'review';

export interface ExamTelemetry {
  record(question: ExamQuestion, answer: ExamAnswer, latencyMs: number): void;
  /** Flush remaining buffered events; call on exam finish/unmount. */
  flush(): Promise<void>;
  /** Shadow-log the adaptive difficulty recommendation (V7 slice 1). */
  logAdaptive(question: ExamQuestion, isCorrect: boolean): void;
}

function uuid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createExamTelemetry(opts: {
  programId: ExamProgramId;
  grade: number;
  mode: ExamTelemetryMode;
  formId?: string;
}): ExamTelemetry {
  const sessionId = uuid();
  const buffer: AttemptEvent[] = [];
  let answered = 0;
  let correct = 0;
  // Guests have no auth session - buffer still fills so record()
  // stays cheap; flush() drops it when getSession() returns null.
  const enabled = isSupabaseConfigured();

  async function flush(): Promise<void> {
    if (!enabled || buffer.length === 0) return;
    const session = await getSession();
    if (!session) { buffer.length = 0; return; }
    const events = buffer.splice(0, buffer.length);
    try {
      const { error } = await (await getSupabase()).rpc('record_attempt_events', {
        p_events: events as unknown as Record<string, unknown>[],
      });
      if (error) buffer.unshift(...events); // retry later - idempotent
    } catch {
      buffer.unshift(...events);
    }
  }

  return {
    record(question, answer, latencyMs) {
      const isCorrect = isExamAnswerCorrect(question, answer);
      answered += 1;
      if (isCorrect) correct += 1;
      if (!enabled) return;
      buffer.push({
        client_event_id: uuid(),
        question_id: String(question.id),
        program_id: opts.programId,
        grade: opts.grade,
        mode: opts.mode,
        form_id: opts.formId ?? null,
        is_correct: isCorrect,
        latency_ms: Math.max(0, Math.round(latencyMs)),
        session_id: sessionId,
        answered_at: new Date().toISOString(),
      });
      if (buffer.length >= 5) void flush();
    },
    async flush() { await flush(); },
    logAdaptive(question, isCorrect) {
      if (!enabled || answered === 0) return;
      const rolling = correct / answered;
      // Naive explainable policy (shadow only): duoi 60% -> de hon,
      // tren 85% -> kho hon, con lai giu do kho hien tai.
      const recommended = rolling < 0.6 ? 1 : rolling > 0.85 ? 3 : 2;
      const rationale =
        `rolling=${rolling.toFixed(2)} over ${answered} answers; ` +
        `last ${isCorrect ? 'correct' : 'wrong'}; shadow pick difficulty=${recommended}`;
      void (async () => {
        try {
          if (!(await getSession())) return;
          await (await getSupabase()).rpc('log_adaptive_decision', {
            p_session_id: sessionId,
            p_program_id: opts.programId,
            p_grade: opts.grade,
            p_rolling_accuracy: Number(rolling.toFixed(3)),
            p_recommended_difficulty: recommended,
            p_rationale: rationale,
          });
        } catch { /* telemetry never breaks the exam */ }
      })();
      void question; // question reserved for future difficulty-aware logs
    },
  };
}
