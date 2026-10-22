import { getPlayerLevel } from '../lib/engagement/store';

/**
 * CR-100 (A2'): player level ladder segment for the EngagementBar HUD -
 * a small progress ring (fill = XP into the current level) plus the level
 * name. Amber carries the progress/reward register like the star chip.
 */
export default function LevelRing() {
  const snap = getPlayerLevel();
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <span
      data-testid="level-chip"
      className="inline-flex min-h-[44px] items-center gap-1.5 px-4 py-1.5 text-sm font-extrabold text-slate-100"
      title={`Cấp ${snap.nameVi} - ${snap.xp} XP`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6 shrink-0 -rotate-90"
        role="img"
        aria-label={`Cấp độ ${snap.nameVi}`}
      >
        <circle cx="12" cy="12" r={r} fill="none" strokeWidth="3" className="stroke-white/15" />
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - snap.progress)}
          className="stroke-amber-400 transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none"
        />
      </svg>
      {snap.nameVi}
    </span>
  );
}
