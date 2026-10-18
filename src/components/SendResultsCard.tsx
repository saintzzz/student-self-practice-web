import { useEffect, useRef, useState } from 'react';
import { useViewer } from '../lib/viewer/ViewerContext';
import { getSession } from '../lib/auth/practiceAuth';
import {
  fetchParentContact,
  isValidParentEmail,
  requestParentVerify,
  saveParentContact,
  type ParentContact,
} from '../lib/parentContact';
import { isParentVerified, ParentGate } from './ParentGate';
import { BTN_PAPER_SECONDARY, CARD_TINT, CARD_TINT_PAPER, NAV_PILL, PAPER_PANEL } from '../lib/ui/tokens';
import { trackFunnel } from '../lib/funnel';
import { IconLock, IconMail } from './icons';

/**
 * kids-UX step 11 (design-kids-ux s3.8.c, AC-6.1 + AC-5.1): "Gửi kết quả
 * cho ba mẹ" shown on summary surfaces for logged-in students only
 * (AC-6.2 defers the guest capture). The email area sits behind the
 * ParentGate - a kid sees the card, a parent taps "Nhờ ba mẹ mở" and
 * passes the arithmetic gate to reach it.
 *
 * Reuses the existing CR-31 authenticated flow (`save_parent_contact` +
 * `request_parent_verify` RPCs via parentContact.ts) - the address is
 * verified by link before any report is sent.
 */

/**
 * Whether a real account is signed in. Primary source is the viewer
 * context (ViewerProvider); when the provider is not wired above this
 * surface we probe the live Supabase session once so the card still works.
 */
export function useLoggedIn(): boolean {
  const viewer = useViewer();
  const [sessionOk, setSessionOk] = useState(viewer.loggedIn);
  useEffect(() => {
    if (viewer.loggedIn) {
      setSessionOk(true);
      return;
    }
    let cancelled = false;
    void getSession()
      .then((session) => {
        if (!cancelled && session) setSessionOk(true);
      })
      .catch(() => {
        // guest mode / Supabase unconfigured - stays logged out.
      });
    return () => {
      cancelled = true;
    };
  }, [viewer.loggedIn]);
  return viewer.loggedIn || sessionOk;
}

type SaveState =
  | 'idle'
  | 'invalid'
  | 'saving'
  | 'sent'
  | 'already'
  | 'throttled'
  | 'failed';

export function SendResultsCard({ surface = 'navy' }: { surface?: 'navy' | 'paper' }): JSX.Element | null {
  const loggedIn = useLoggedIn();
  const [contact, setContact] = useState<ParentContact | null>(null);
  const [contactLoaded, setContactLoaded] = useState(false);
  const [email, setEmail] = useState('');
  const [optIn, setOptIn] = useState(true);
  const [state, setState] = useState<SaveState>('idle');
  const [verified, setVerified] = useState(false);
  // ParentGate (AC-5.1): the email area opens only after a gate pass; the
  // shared 5-minute token means an already-gated parent skips the dialog.
  // `unlocked` is a render hint only - protected actions re-check the live
  // token so an expired pass re-locks the card (dev-review #2).
  const [unlocked, setUnlocked] = useState(() => isParentVerified());
  const [gateOpen, setGateOpen] = useState(false);
  /* Dev-review #9: save/resend are multi-await flows - no post-await
     setState may land after unmount (the summaries unmount this card on
     navigation). */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!loggedIn || !unlocked) return;
    let cancelled = false;
    void fetchParentContact().then((found) => {
      if (cancelled) return;
      setContactLoaded(true);
      if (!found) return;
      setContact(found);
      setEmail(found.email);
      setOptIn(found.opted_in);
      setVerified(found.verified);
    });
    return () => {
      cancelled = true;
    };
  }, [loggedIn, unlocked]);

  if (!loggedIn) return null;

  /* Live-token re-check before any protected write: a latched `unlocked`
     or an expired 5-minute pass sends the parent back to the gate. */
  function requireLivePass(): boolean {
    if (isParentVerified()) return true;
    setUnlocked(false);
    return false;
  }

  async function handleSave(): Promise<void> {
    if (!requireLivePass()) return;
    if (!isValidParentEmail(email)) {
      setState('invalid');
      return;
    }
    setState('saving');
    const saved = await saveParentContact(email, optIn);
    if (!mountedRef.current) return;
    if (!saved) {
      setState('failed');
      return;
    }
    const verify = await requestParentVerify();
    if (!mountedRef.current) return;
    if (verify === 'already') setVerified(true);
    if (verify === 'sent' || verify === 'already') trackFunnel('send_results_sent', 'send-results-card');
    setState(verify === 'sent' || verify === 'already' || verify === 'throttled' ? verify : 'failed');
  }

  async function handleResend(): Promise<void> {
    if (!requireLivePass()) return;
    setState('saving');
    const verify = await requestParentVerify();
    if (!mountedRef.current) return;
    if (verify === 'already') setVerified(true);
    if (verify === 'sent' || verify === 'already') trackFunnel('send_results_sent', 'send-results-card');
    setState(verify === 'sent' || verify === 'already' || verify === 'throttled' ? verify : 'failed');
  }

  const busy = state === 'saving';

  const onPaper = surface === 'paper';

  return (
    <section data-testid="send-results-card" className={`${onPaper ? CARD_TINT_PAPER.sky : CARD_TINT.sky} mt-4 text-left`} aria-label="Gửi kết quả cho ba mẹ">
      <h3 className={`font-display text-lg font-extrabold ${onPaper ? 'text-sky-900' : 'text-white'}`}><IconMail size={18} className="mr-1.5 inline-block" /> Gửi kết quả cho ba mẹ</h3>
      <p className={`mt-1 text-sm font-semibold ${onPaper ? 'text-slate-600' : 'text-slate-300'}`}>
        Nhờ ba mẹ nhập email để nhận kết quả mỗi Chủ nhật nhé!
      </p>

      {!unlocked ? (
        <button
          type="button"
          data-testid="send-results-unlock"
          onClick={() => setGateOpen(true)}
          className={`${onPaper ? `${BTN_PAPER_SECONDARY} px-5` : NAV_PILL} mt-3`}
        >
          <span className="inline-flex items-center gap-2"><IconLock size={16} /> Nhờ ba mẹ mở</span>
        </button>
      ) : (
        <div className={`${PAPER_PANEL} mt-3`}>
          {!contactLoaded ? (
            <p className="text-sm font-semibold text-slate-600">Đang kiểm tra email ba mẹ...</p>
          ) : verified ? (
            <p data-testid="parent-email-verified" className="text-sm font-bold text-emerald-700">
              Email đã xác nhận{contact?.email ? `: ${contact.email}` : ''} - ba mẹ sẽ nhận kết quả mỗi Chủ nhật.
            </p>
          ) : contact ? (
            <div data-testid="parent-email-pending" className="text-sm font-semibold text-slate-700">
              <p>
                Chưa xác nhận - <span className="font-bold text-slate-900">{contact.email}</span>. Ba mẹ bấm link trong email để bắt đầu nhận kết quả.
              </p>
              <button
                type="button"
                data-testid="parent-email-resend"
                disabled={busy}
                onClick={() => void handleResend()}
                className={`${BTN_PAPER_SECONDARY} mt-2 disabled:opacity-60`}
              >
                {busy ? 'Đang gửi...' : 'Gửi lại email xác nhận'}
              </button>
            </div>
          ) : (
            <div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  data-testid="parent-email-input"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setState('idle');
                  }}
                  placeholder="email-cua-ba-me@example.com"
                  className="min-h-[44px] min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button
                  type="button"
                  data-testid="parent-email-save"
                  disabled={busy}
                  onClick={() => void handleSave()}
                  className={`${BTN_PAPER_SECONDARY} shrink-0 disabled:opacity-60`}
                >
                  {busy ? 'Đang gửi...' : 'Gửi'}
                </button>
              </div>
              <label className="mt-2 flex min-h-[44px] items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  data-testid="parent-email-optin"
                  checked={optIn}
                  onChange={(e) => setOptIn(e.target.checked)}
                  className="h-4 w-4 accent-sky-600"
                />
                Nhận báo cáo mỗi tuần
              </label>
            </div>
          )}

          <div aria-live="polite">
            {state === 'invalid' && (
              <p data-testid="parent-email-error" className="mt-2 text-sm font-bold text-rose-700">
                Email chưa đúng định dạng - ba mẹ kiểm tra lại nhé.
              </p>
            )}
            {state === 'sent' && (
              <p data-testid="parent-verify-sent" className="mt-2 text-sm font-bold text-emerald-700">
                Đã gửi email xác nhận - ba mẹ bấm link trong hộp thư.
              </p>
            )}
            {state === 'already' && (
              <p className="mt-2 text-sm font-bold text-emerald-700">Email đã xác nhận.</p>
            )}
            {state === 'throttled' && (
              <p data-testid="parent-verify-throttled" className="mt-2 text-sm font-bold text-slate-700">
                Email xác nhận đã được gửi gần đây - ba mẹ kiểm tra hộp thư (hoặc thử lại sau ít phút).
              </p>
            )}
            {state === 'failed' && (
              <p data-testid="parent-verify-failed" className="mt-2 text-sm font-bold text-rose-700">
                Không gửi được email - ba mẹ thử lại nhé.
                <button
                  type="button"
                  data-testid="parent-email-retry"
                  onClick={() => void (contact ? handleResend() : handleSave())}
                  className="ml-2 underline"
                >
                  Thử lại
                </button>
              </p>
            )}
          </div>
        </div>
      )}

      {gateOpen && (
        <ParentGate
          onPass={() => {
            setGateOpen(false);
            setUnlocked(true);
          }}
          onCancel={() => setGateOpen(false)}
        />
      )}
    </section>
  );
}
