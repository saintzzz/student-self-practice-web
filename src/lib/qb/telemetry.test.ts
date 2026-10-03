/**
 * CR-49 / V7 slice 1 - deterministic tests for attempt telemetry and
 * the adaptive shadow policy. The adaptive rule is intentionally naive
 * and explainable: under 60% rolling accuracy -> easier, over 85% ->
 * harder, otherwise stay. These tests pin that contract down so a
 * future real model must deliberately replace it.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GrammarMcqQuestion } from '../../types/exam';

const rpc = vi.fn();
vi.mock('../supabase/client', () => ({
  getSupabase: async () => ({ rpc }),
  isSupabaseConfigured: () => true,
}));
vi.mock('../auth/practiceAuth', () => ({
  getSession: async () => ({ user: { id: 'u1' } }),
}));

import { createExamTelemetry } from './telemetry';

const Q: GrammarMcqQuestion = {
  id: 'q-test-1',
  topicId: 't',
  kind: 'grammar-mcq',
  prompt: 'Pick one.',
  options: ['a', 'b', 'c', 'd'],
  correctIndex: 1,
  explanation: 'x',
};
const RIGHT = { type: 'option', index: 1 } as const;
const WRONG = { type: 'option', index: 0 } as const;

beforeEach(() => rpc.mockReset().mockResolvedValue({ data: 1, error: null }));

describe('createExamTelemetry', () => {
  it('records attempt events with idempotent client_event_ids and flushes', async () => {
    const t = createExamTelemetry({ programId: 'english', grade: 4, mode: 'form', formId: 'f-01' });
    t.record(Q, RIGHT, 1200);
    t.record(Q, WRONG, 900);
    await t.flush();

    const call = rpc.mock.calls.find((c) => c[0] === 'record_attempt_events');
    expect(call).toBeTruthy();
    const events = call![1].p_events;
    expect(events).toHaveLength(2);
    for (const e of events) {
      expect(e.client_event_id).toBeTruthy();
      expect(e.form_id).toBe('f-01');
      expect(e.mode).toBe('form');
      expect(e.program_id).toBe('english');
      expect(e.session_id).toBe(events[0].session_id);
    }
    expect(events[0].is_correct).toBe(true);
    expect(events[1].is_correct).toBe(false);
    expect(events[0].latency_ms).toBe(1200);
  });

  it('re-queues buffered events when the RPC fails (idempotent retry)', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'down' } });
    const t = createExamTelemetry({ programId: 'english', grade: 4, mode: 'practice' });
    t.record(Q, RIGHT, 500);
    await t.flush(); // fails, re-queues
    await t.flush(); // succeeds
    const calls = rpc.mock.calls.filter((c) => c[0] === 'record_attempt_events');
    expect(calls).toHaveLength(2);
    // Same client_event_id across retries - server dedupes.
    expect(calls[0][1].p_events[0].client_event_id).toBe(calls[1][1].p_events[0].client_event_id);
  });

  it('adaptive shadow: low accuracy recommends easier, high recommends harder', async () => {
    const t = createExamTelemetry({ programId: 'english', grade: 3, mode: 'practice' });
    // 4 wrong out of 5 -> rolling 0.2 -> difficulty 1.
    for (let i = 0; i < 4; i++) { t.record(Q, WRONG, 100); t.logAdaptive(Q, false); }
    t.record(Q, RIGHT, 100);
    t.logAdaptive(Q, true);
    await t.flush();
    const calls = rpc.mock.calls.filter((c) => c[0] === 'log_adaptive_decision');
    const last = calls[calls.length - 1]![1];
    expect(last.p_rolling_accuracy).toBe(0.2);
    expect(last.p_recommended_difficulty).toBe(1);

    const t2 = createExamTelemetry({ programId: 'english', grade: 3, mode: 'practice' });
    for (let i = 0; i < 5; i++) { t2.record(Q, RIGHT, 100); t2.logAdaptive(Q, true); }
    await t2.flush();
    const last2 = rpc.mock.calls.filter((c) => c[0] === 'log_adaptive_decision')[rpc.mock.calls.filter((c) => c[0] === 'log_adaptive_decision').length - 1]![1];
    expect(last2.p_rolling_accuracy).toBe(1);
    expect(last2.p_recommended_difficulty).toBe(3);
  });
});
