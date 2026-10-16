import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

interface DemoHintProps {
  /** Row/grid wrapper the dot measures its targets inside. */
  containerRef: RefObject<HTMLElement>;
  /** 'tap' pulses on the first control; 'drag' travels first->opposite. */
  variant?: 'tap' | 'drag';
  /** Called on first real interaction or after the loop finishes. */
  onDone: () => void;
}

/**
 * CR-79 (DESIGN-SPEC-v3 s2.3): neutral first-encounter gesture demo -
 * an amber "finger dot" that pulses on the first tile (tap kinds) or
 * travels to a tile in the opposite column (drag kinds). It never marks
 * the correct answer: targets are positional only. Auto-dismisses when
 * its animation ends; any real pointer/key interaction dismisses it
 * immediately.
 */
export default function DemoHint({ containerRef, variant = 'tap', onDone }: DemoHintProps) {
  const [pos, setPos] = useState<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    /* Measure after paint - the parent row ref is not guaranteed to be
       attached yet in a layout effect when the batch swaps screens. */
    const raf = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) {
        onDone();
        return;
      }
      const tiles = Array.from(container.children) as HTMLElement[];
      const first = tiles[0];
      if (!first) {
        onDone();
        return;
      }
      const cx = first.offsetLeft + first.offsetWidth / 2;
      const cy = first.offsetTop + first.offsetHeight / 2;
      let tx = 0;
      let ty = 0;
      if (variant === 'drag') {
        /* Neutral target: the tile at the mirrored grid position
           (children.length - 1 keeps it positional, never correctness). */
        const dest = tiles[tiles.length - 1] ?? first;
        tx = dest.offsetLeft + dest.offsetWidth / 2 - cx;
        ty = dest.offsetTop + dest.offsetHeight / 2 - cy;
      }
      setPos({ x: cx, y: cy, tx, ty });
    });
    return () => cancelAnimationFrame(raf);
  }, [containerRef, variant, onDone]);

  useLayoutEffect(() => {
    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onDone();
    };
    window.addEventListener('pointerdown', finish, { capture: true });
    window.addEventListener('keydown', finish, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', finish, { capture: true });
      window.removeEventListener('keydown', finish, { capture: true });
    };
  }, [onDone]);

  if (!pos) return null;

  return (
    <span
      aria-hidden="true"
      data-testid="demo-hint"
      className="pointer-events-none absolute inset-0 z-20 overflow-visible"
    >
      <span
        onAnimationEnd={onDone}
        className={`absolute block h-7 w-7 rounded-full bg-amber-300 shadow-[0_0_0_6px_rgba(251,191,36,0.35),0_4px_10px_rgba(0,0,0,0.4)] motion-reduce:!animate-none ${
          variant === 'drag' ? 'demo-dot-travel' : 'demo-dot-pulse'
        }`}
        style={{ left: pos.x, top: pos.y, '--tx': `${pos.tx}px`, '--ty': `${pos.ty}px` } as React.CSSProperties}
      />
    </span>
  );
}
