import { setAmbientMotionEnabled, useAmbientMotionEnabled } from '../lib/engagement/ambientMotion';
import { IconPause, IconPlay } from './icons';
import { playSfx } from '../lib/sfx';

interface MotionToggleProps {
  className?: string;
}

/* CR-150 (r256): the ungated ambient-motion control WCAG 2.2.2 asks for
 * on affected screens - the parent-corner toggle stays, but a kid who
 * finds the motion distracting must be able to stop it without passing
 * the ParentGate math challenge. Small frosted pill that can sit over
 * hero art; writes the same ea-ambient-motion flag the parent toggle
 * uses so both stay in sync. */
export default function MotionToggle({ className = '' }: MotionToggleProps) {
  const on = useAmbientMotionEnabled();
  return (
    <button
      type="button"
      data-testid="ambient-motion-chip"
      aria-pressed={!on}
      aria-label={on ? 'Tắt video chuyển động' : 'Bật video chuyển động'}
      onClick={() => {
        playSfx('pop');
        setAmbientMotionEnabled(!on);
      }}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/75 text-sky-800 shadow-md ring-1 ring-sky-300/80 backdrop-blur-sm transition hover:bg-white active:scale-95 ${className}`}
    >
      {on ? <IconPause size={16} /> : <IconPlay size={16} />}
    </button>
  );
}
