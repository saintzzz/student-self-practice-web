import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface DemoHintProps {
  /** Row/grid wrapper the dot measures its targets inside. */
  containerRef: RefObject<HTMLElement>;
  /**
   * 'tap' pulses on the first control; 'drag' travels first->opposite;
   * 'trace' (CR-82 s12.7) travels the letter's first stroke path
   * (`path` points in the 0-100 slate box).
   */
  variant?: 'tap' | 'drag' | 'trace';
  /** Stroke-1 polyline for variant='trace' (0-100 box units). */
  path?: ReadonlyArray<readonly [number, number]>;
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
 *
 * CR-82: 'trace' animates the dot along the guide's stroke-1 polyline so
 * a pre-writer sees the gesture before their first touch (spec s12.7).
 */
export default function DemoHint({ containerRef, variant = 'tap', path, onDone }: DemoHintProps) {
  const [pos, setPos] = useState<{
    x: number;
    y: number;
    tx: number;
    ty: number;
    tracePx?: { x: number; y: number }[];
  } | null>(null);
  const doneRef = useRef(false);
  const dotRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    /* Measure after paint - the parent row ref is not guaranteed to be
       attached yet in a layout effect when the batch swaps screens. */
    const raf = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) {
        onDone();
        return;
      }

      if (variant === 'trace' && path && path.length > 0) {
        /* Map the 0-100 stroke box onto the slate's rendered square. */
        const w = container.clientWidth;
        const h = container.clientHeight;
        const tracePx = path.map(([px, py]) => ({
          x: (px / 100) * w,
          y: (py / 100) * h,
        }));
        setPos({ x: tracePx[0]!.x, y: tracePx[0]!.y, tx: 0, ty: 0, tracePx });
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
  }, [containerRef, variant, path, onDone]);

  /* 'trace': once the dot is parked at the stroke start, run the Web
     Animations travel along the sampled path (transform-only). Reduced
     motion parks the dot statically - the timer below still dismisses. */
  useLayoutEffect(() => {
    const dot = dotRef.current;
    const pts = pos?.tracePx;
    /* jsdom and old webviews lack WAAPI - the parked dot + dismiss timer
       is the honest fallback (same as reduced motion). */
    if (!dot || typeof dot.animate !== 'function' || !pts || pts.length < 2 || reducedMotion) return;
    const animation = dot.animate(
      pts.map((p) => ({ transform: `translate(${p.x - pts[0]!.x}px, ${p.y - pts[0]!.y}px)` })),
      { duration: 1600, easing: 'ease-in-out', fill: 'forwards' },
    );
    return () => animation.cancel();
  }, [pos, reducedMotion]);

  useLayoutEffect(() => {
    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onDone();
    };
    window.addEventListener('pointerdown', finish, { capture: true });
    window.addEventListener('keydown', finish, { capture: true });
    /* r30: under reduced-motion the CSS animation never runs, so
       animationend can never fire - a plain timeout is the universal
       completion path (it also covers browsers that drop the event). */
    const timer = setTimeout(finish, variant === 'drag' ? 3200 : variant === 'trace' ? 3400 : 2400);
    return () => {
      window.removeEventListener('pointerdown', finish, { capture: true });
      window.removeEventListener('keydown', finish, { capture: true });
      clearTimeout(timer);
    };
  }, [onDone, variant]);

  if (!pos) return null;

  return (
    <span
      aria-hidden="true"
      data-testid="demo-hint"
      className="pointer-events-none absolute inset-0 z-20 overflow-visible"
    >
      <span
        ref={dotRef}
        onAnimationEnd={onDone}
        className={`absolute block h-7 w-7 rounded-full bg-amber-300 shadow-[0_0_0_6px_rgba(251,191,36,0.35),0_4px_10px_rgba(0,0,0,0.4)] motion-reduce:!animate-none ${
          variant === 'trace' ? '' : variant === 'drag' ? 'demo-dot-travel' : 'demo-dot-pulse'
        }`}
        style={{ left: pos.x, top: pos.y, '--tx': `${pos.tx}px`, '--ty': `${pos.ty}px` } as React.CSSProperties}
      />
    </span>
  );
}
