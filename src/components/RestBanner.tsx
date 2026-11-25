import { useRestReminder, REST_MINUTES } from '../lib/engagement/restReminder';
import { EmojiVisual } from './EmojiVisual';
import { playSfx } from '../lib/sfx';

/* CR-148 (P2-6): "Gio nghi" - a soft, non-blocking nudge after
 * REST_MINUTES of continuous play. Toast-style (same perch as the
 * streak milestone toast), kid-dismissable, and off entirely when the
 * parent disables the reminder in Goc ba me. */
export default function RestBanner() {
  const { show, dismiss } = useRestReminder();
  if (!show) return null;
  return (
    <div
      data-testid="rest-banner"
      role="status"
      className="animate-mascot-pop fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit max-w-[92vw] items-center gap-3 rounded-2xl bg-emerald-600/95 px-4 py-3 text-white shadow-lg ring-1 ring-emerald-300/60 motion-reduce:animate-none"
    >
      <span aria-hidden className="shrink-0">
        <EmojiVisual emoji="🌿" variant="inline" className="text-2xl" />
      </span>
      <span className="text-sm font-bold leading-snug">
        Giờ nghỉ! Bé đã chơi {REST_MINUTES} phút liền rồi -
        cho mắt nghỉ một chút nhé.
      </span>
      <button
        type="button"
        data-testid="rest-banner-dismiss"
        onClick={() => {
          playSfx('pop');
          dismiss();
        }}
        className="shrink-0 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-extrabold transition hover:bg-white/30"
      >
        Em biết rồi
      </button>
    </div>
  );
}
