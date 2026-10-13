import { useCallback, useEffect, useRef, useState } from 'react';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { BTN_PAPER_SECONDARY, GATE_KEY, PAPER_PANEL } from '../lib/ui/tokens';
import { IconLock } from './icons';

/**
 * kids-UX step 5 (design-kids-ux s3.6, ADR KUX-3): the parent gate.
 * One arithmetic challenge written in Vietnamese number WORDS (a G1-2
 * pre-reader can neither decode the words nor the 6-9 tables), answered
 * on a numeric keypad. Passing sets an in-memory token for 5 minutes so
 * report -> pricing -> payment stays inside the <=2-step budget.
 *
 * The token is a UX friction control, not a security credential: memory
 * only, never persisted, cleared on reload / sign-out / leaving the
 * parent corner back to a kid screen.
 */

const GATE_TTL_MS = 5 * 60 * 1000;
let verifiedAtMs: number | null = null;

/** True while a gate pass is younger than 5 minutes. */
export function isParentVerified(now: number = Date.now()): boolean {
  return verifiedAtMs !== null && now - verifiedAtMs < GATE_TTL_MS;
}

/** Drops the pass token (leaving Góc ba mẹ, sign-out, tests). */
export function clearParentVerification(): void {
  verifiedAtMs = null;
}

/* ------------------------------------------------------------------ */

const NUMBER_WORDS: Record<number, string> = {
  2: 'hai',
  3: 'ba',
  4: 'bốn',
  5: 'năm',
  6: 'sáu',
  7: 'bảy',
  8: 'tám',
  9: 'chín',
};

interface Factors {
  a: number;
  b: number;
}

function randomFactors(): Factors {
  return {
    a: 2 + Math.floor(Math.random() * 8),
    b: 2 + Math.floor(Math.random() * 8),
  };
}

function questionText({ a, b }: Factors): string {
  const first = NUMBER_WORDS[a]!;
  return `${first.charAt(0).toUpperCase()}${first.slice(1)} nhân ${NUMBER_WORDS[b]} bằng bao nhiêu?`;
}

/** OK is the gate's single gold element (design s3.6.b). */
const GATE_OK =
  'min-h-[64px] min-w-[64px] rounded-2xl border-b-4 border-amber-600 bg-amber-400 text-xl font-extrabold text-amber-950 transition hover:bg-amber-300 active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-50 disabled:active:translate-y-0 motion-reduce:transition-none';

const MAX_ENTRY_DIGITS = 2; // largest product is 9 x 9 = 81
const COOLDOWN_SECONDS = 10;
const MAX_WRONG_BEFORE_COOLDOWN = 3;
const PASS_BEAT_MS = 300;

export interface ParentGateProps {
  onPass: () => void;
  onCancel: () => void;
  /** Heading inside the lock row, e.g. "Dành cho ba mẹ". */
  title?: string;
}

export function ParentGate({ onPass, onCancel, title = 'Dành cho ba mẹ' }: ParentGateProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLParagraphElement>(null);
  const passedRef = useRef(false);
  const passTimerRef = useRef<number | null>(null);

  const [factors, setFactors] = useState<Factors>(randomFactors);
  const [entry, setEntry] = useState('');
  const [wrong, setWrong] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [wrongStreak, setWrongStreak] = useState(0);
  /* Cool-down is deadline-based (not chained per-second setTimeouts): a
     single interval recomputes the remaining seconds from the wall clock,
     so a throttled/stalled effect can never freeze the countdown. */
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [passed, setPassed] = useState(false);

  useModalBehavior(dialogRef, onCancel);

  /* Design s3.6.b: initial focus lands on the question text itself. The
     hook first focuses the first focusable key; this effect runs right
     after and moves focus here (same component = ordered effects). */
  useEffect(() => {
    questionRef.current?.focus();
  }, []);

  /* Shake is transform-only; the class is cleared on a timer so the card
     can re-shake on the next wrong answer (and so reduced-motion simply
     never shows it via the paired motion-reduce:animate-none). */
  useEffect(() => {
    if (!shaking) return;
    const t = window.setTimeout(() => setShaking(false), 350);
    return () => window.clearTimeout(t);
  }, [shaking]);

  /* 10s cool-down after 3 consecutive wrong answers (design s3.6.b). */
  useEffect(() => {
    if (cooldownUntil === 0) return;
    const t = window.setInterval(() => {
      const left = Math.ceil((cooldownUntil - Date.now()) / 1000);
      if (left <= 0) {
        window.clearInterval(t);
        setCooldownUntil(0);
        setCooldownLeft(0);
        setWrongStreak(0);
      } else {
        setCooldownLeft(left);
      }
    }, 250);
    return () => window.clearInterval(t);
  }, [cooldownUntil]);

  /* A gate that closes WITHOUT passing must not leave a stale token
     behind; a passed gate keeps it alive for the 5-minute share window
     (Ruling R-13 / ADR KUX-3 option B). */
  useEffect(
    () => () => {
      if (!passedRef.current) clearParentVerification();
      if (passTimerRef.current !== null) window.clearTimeout(passTimerRef.current);
    },
    [],
  );

  const appendDigit = useCallback(
    (d: string) => {
      if (passedRef.current) return;
      setWrong(false);
      setEntry((v) => (v.length >= MAX_ENTRY_DIGITS ? v : v + d));
    },
    [],
  );

  const backspace = useCallback(() => {
    setWrong(false);
    setEntry((v) => v.slice(0, -1));
  }, []);

  const newQuestion = useCallback(() => {
    setFactors(randomFactors());
    setEntry('');
    setWrong(false);
  }, []);

  const submit = useCallback(() => {
    if (passedRef.current || cooldownLeft > 0 || entry.length === 0) return;
    if (Number.parseInt(entry, 10) === factors.a * factors.b) {
      passedRef.current = true;
      verifiedAtMs = Date.now();
      setPassed(true);
      // Brief "Đã mở" beat before the gated destination opens.
      passTimerRef.current = window.setTimeout(onPass, PASS_BEAT_MS);
      return;
    }
    const streak = wrongStreak + 1;
    setWrongStreak(streak);
    setWrong(true);
    setShaking(true);
    setEntry('');
    setFactors(randomFactors());
    if (streak >= MAX_WRONG_BEFORE_COOLDOWN) {
      setCooldownLeft(COOLDOWN_SECONDS);
      setCooldownUntil(Date.now() + COOLDOWN_SECONDS * 1000);
    }
  }, [entry, factors, cooldownLeft, wrongStreak, onPass]);

  /* Physical keyboard parity (design s3.6.b): digits type, Backspace
     deletes, Enter submits. Enter is skipped when the event target is a
     button - the native click already handles it. */
  const live = useRef({ submit, backspace, appendDigit });
  live.current = { submit, backspace, appendDigit };
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key >= '0' && e.key <= '9') {
        live.current.appendDigit(e.key);
      } else if (e.key === 'Backspace') {
        live.current.backspace();
      } else if (e.key === 'Enter') {
        if (e.target instanceof HTMLElement && e.target.closest('button')) return;
        live.current.submit();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const okDisabled = passed || cooldownLeft > 0 || entry.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1224]/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
      data-testid="parent-gate"
    >
      <div
        ref={dialogRef}
        className={`${PAPER_PANEL} w-full max-w-sm text-center ${shaking ? 'tile-shake motion-reduce:animate-none' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display flex items-center gap-2 text-xl font-bold text-slate-900"><IconLock size={20} className="text-indigo-500" aria-hidden="true" /> {title}</h2>
          <button
            type="button"
            data-testid="parent-gate-cancel"
            onClick={onCancel}
            className={BTN_PAPER_SECONDARY}
          >
            Hủy
          </button>
        </div>

        {passed ? (
          <p className="mt-6 text-xl font-bold text-emerald-700" role="status">
            ✓ Đã mở Góc ba mẹ
          </p>
        ) : (
          <>
            <p className="mt-4 text-left text-base text-slate-700">Để tiếp tục, ba mẹ giải phép tính:</p>
            <p
              ref={questionRef}
              tabIndex={-1}
              data-testid="parent-gate-question"
              className="mt-2 text-2xl font-bold text-slate-900 focus:outline-none"
            >
              {questionText(factors)}
            </p>

            <div className="mt-3 flex justify-center gap-2" aria-label="Đáp án">
              {[0, 1].map((i) => (
                <span
                  key={i}
                  className="flex h-14 w-12 items-center justify-center rounded-xl bg-sky-50 text-2xl font-bold text-slate-900 ring-1 ring-sky-200"
                >
                  {entry[i] ?? ''}
                </span>
              ))}
            </div>

            {wrong && cooldownLeft === 0 && (
              <p role="alert" className="mt-2 text-sm font-semibold text-slate-700">
                ⚠ Chưa đúng - ba mẹ thử câu khác nhé.
              </p>
            )}
            {cooldownLeft > 0 && (
              <p role="status" className="mt-2 text-sm font-semibold text-slate-700">
                Thử lại sau {cooldownLeft} giây
              </p>
            )}

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                <button
                  key={d}
                  type="button"
                  data-testid={`parent-gate-key-${d}`}
                  className={GATE_KEY}
                  onClick={() => appendDigit(String(d))}
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                data-testid="parent-gate-back"
                aria-label="Xóa"
                className={GATE_KEY}
                onClick={backspace}
              >
                ⌫
              </button>
              <button
                type="button"
                data-testid="parent-gate-key-0"
                className={GATE_KEY}
                onClick={() => appendDigit('0')}
              >
                0
              </button>
              <button
                type="button"
                data-testid="parent-gate-ok"
                aria-label="Xác nhận"
                className={GATE_OK}
                disabled={okDisabled}
                onClick={submit}
              >
                OK
              </button>
            </div>

            <button
              type="button"
              data-testid="parent-gate-new-question"
              className="mt-3 min-h-[44px] text-sm font-semibold text-sky-700 underline transition hover:text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              onClick={newQuestion}
            >
              Đổi câu khác
            </button>
          </>
        )}
      </div>
    </div>
  );
}
