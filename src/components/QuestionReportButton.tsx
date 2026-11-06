/**
 * CR-131 - "Báo lỗi câu này". Compact text button under the explanation
 * that expands into a kind picker + optional note. Hidden for guests
 * (RLS needs an account) and after a same-day report.
 */
import { useEffect, useState } from 'react';
import { getSession } from '../lib/auth/practiceAuth';
import { isSupabaseConfigured } from '../lib/supabase/client';
import { alreadyReported, submitQuestionReport, type ReportKind } from '../lib/questionReport';

const KINDS: { kind: ReportKind; label: string }[] = [
  { kind: 'wrong-answer', label: 'Sai đáp án' },
  { kind: 'typo', label: 'Lỗi chính tả' },
  { kind: 'confusing', label: 'Khó hiểu' },
  { kind: 'audio', label: 'Âm thanh' },
  { kind: 'other', label: 'Khác' },
];

export default function QuestionReportButton(props: { questionId: string; context: string }) {
  const [eligible, setEligible] = useState(false);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ReportKind | null>(null);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');

  useEffect(() => {
    let live = true;
    if (isSupabaseConfigured()) {
      void getSession().then((s) => { if (live && s && !alreadyReported(props.questionId)) setEligible(true); });
    }
    return () => { live = false; };
  }, [props.questionId]);

  if (!eligible || state === 'sent') return state === 'sent' ? (
    <div className="mt-2 text-xs font-bold text-slate-500">Đã gửi báo lỗi - cảm ơn em!</div>
  ) : null;

  const send = async () => {
    if (!kind || state === 'sending') return;
    setState('sending');
    const res = await submitQuestionReport({ questionId: props.questionId, kind, note: note || undefined, context: props.context });
    if (res === 'sent' || res === 'duplicate') setState('sent');
    else setState('idle');
  };

  return (
    <div className="mt-2">
      {!open ? (
        <button type="button" data-testid="report-question" onClick={() => setOpen(true)}
          className="text-xs font-bold text-slate-400 underline decoration-dotted underline-offset-2 hover:text-slate-600">
          Báo lỗi câu này
        </button>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <button key={k.kind} type="button" onClick={() => setKind(k.kind)}
                className={`rounded-full border px-2.5 py-1 text-xs font-bold ${kind === k.kind ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 bg-white text-slate-600'}`}>
                {k.label}
              </button>
            ))}
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} placeholder="Ghi chú thêm (không bắt buộc)"
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs" />
          <div className="mt-2 flex gap-2">
            <button type="button" data-testid="report-question-send" onClick={() => void send()} disabled={!kind || state === 'sending'}
              className="rounded-full bg-slate-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40">
              {state === 'sending' ? 'Đang gửi...' : 'Gửi báo lỗi'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="px-2 py-1.5 text-xs font-bold text-slate-500">Hủy</button>
          </div>
        </div>
      )}
    </div>
  );
}
