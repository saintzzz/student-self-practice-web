import { useState } from 'react';
import { CARD_DARK } from '../lib/ui/tokens';
import { changePin } from '../lib/auth/practiceAuth';

const INPUT_DARK =
  'w-full rounded-2xl border-2 border-[#2a3a5e] bg-[#0b1224]/60 px-4 py-3 text-lg font-bold text-slate-100 shadow-inner transition placeholder:font-normal placeholder:text-slate-500 focus:border-amber-300 focus:outline-none focus:ring-4 focus:ring-amber-300/30';

interface ChangePinDialogProps {
  onClose: () => void;
}

/** CR-17: self-service PIN change for signed-in students/admins. */
export default function ChangePinDialog({ onClose }: ChangePinDialogProps) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (pin.length < 6) {
      setOk(false);
      setMessage('Mã PIN cần ít nhất 6 ký tự.');
      return;
    }
    if (pin !== confirm) {
      setOk(false);
      setMessage('Hai mã PIN chưa giống nhau.');
      return;
    }
    setBusy(true);
    const err = await changePin(pin);
    setBusy(false);
    if (err) {
      setOk(false);
      setMessage(err);
    } else {
      setOk(true);
      setMessage('Đổi mã PIN thành công!');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Đổi mã PIN"
      onClick={onClose}
    >
      <div className={`${CARD_DARK} w-full max-w-sm`} onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-center font-display text-2xl font-extrabold text-amber-300">
          Đổi mã PIN
        </h2>
        {ok ? (
          <>
            <p data-testid="change-pin-success" className="mb-5 text-center font-bold text-emerald-300">
              {message}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-3xl bg-gradient-to-b from-amber-300 to-amber-500 py-3 font-display text-xl font-extrabold text-[#0b1224]"
            >
              Đóng
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-slate-300">
              <span className="font-bold text-slate-200">Mã PIN mới</span>
              <input
                data-testid="new-pin"
                className={INPUT_DARK}
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <label className="flex flex-col gap-1 text-slate-300">
              <span className="font-bold text-slate-200">Nhập lại mã PIN mới</span>
              <input
                data-testid="confirm-pin"
                className={INPUT_DARK}
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            {message && (
              <p data-testid="change-pin-error" className="text-center font-bold text-rose-300">
                {message}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-3xl border-2 border-slate-500/50 py-3 font-display text-lg font-extrabold text-slate-300"
              >
                Hủy
              </button>
              <button
                data-testid="change-pin-submit"
                type="submit"
                disabled={busy}
                className="flex-1 rounded-3xl bg-gradient-to-b from-amber-300 to-amber-500 py-3 font-display text-lg font-extrabold text-[#0b1224] disabled:opacity-60"
              >
                {busy ? 'Đang đổi...' : 'Đổi PIN'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
