/**
 * CR-131 - one-tap question report insert path. Guests never reach the
 * network (getSession null -> 'guest'); the button hides itself anyway.
 * Dedupe is client-side per question per day - the table itself accepts
 * repeats, QA volume is low enough that dupes are harmless.
 */
import { getSupabase, isSupabaseConfigured } from './supabase/client';
import { getSession } from './auth/practiceAuth';
import { todayISO } from './engagement/store';

export type ReportKind = 'wrong-answer' | 'typo' | 'confusing' | 'audio' | 'other';
export type ReportStatus = 'sent' | 'guest' | 'duplicate' | 'error';

const SEEN_KEY = 'ea-question-reports-v1';

function seenSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function alreadyReported(questionId: string): boolean {
  return seenSet().has(`${todayISO()}:${questionId}`);
}

function markReported(questionId: string): void {
  try {
    const seen = seenSet();
    seen.add(`${todayISO()}:${questionId}`);
    // Cap the ledger - only today's keys matter anyway.
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-500)));
  } catch { /* private mode - insert still succeeds */ }
}

export async function submitQuestionReport(input: {
  questionId: string;
  kind: ReportKind;
  note?: string;
  context?: string;
}): Promise<ReportStatus> {
  if (!isSupabaseConfigured()) return 'guest';
  const session = await getSession();
  if (!session) return 'guest';
  if (alreadyReported(input.questionId)) return 'duplicate';
  const client = await getSupabase();
  if (!client) return 'error';
  const { error } = await client.from('question_reports').insert({
    question_id: input.questionId,
    account_id: session.user.id,
    kind: input.kind,
    note: input.note?.slice(0, 200) || null,
    context: input.context ?? null,
  });
  if (error) return 'error';
  markReported(input.questionId);
  return 'sent';
}
