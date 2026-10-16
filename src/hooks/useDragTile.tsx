import { useCallback, useEffect, useRef, useState } from 'react';

const DRAG_THRESHOLD_PX = 8;

interface DragSession {
  pointerId: number;
  startX: number;
  startY: number;
  sourceIndex: number;
  active: boolean;
  ghostHtml: string;
}

interface Ghost {
  x: number;
  y: number;
  html: string;
  sourceIndex: number;
}

/**
 * CR-79 (DESIGN-SPEC-v3 s2.2): pointer-drag input for tile grids
 * (picture-pair-matching). Arms only when `enabled` (G1-2 band). Tap is
 * never replaced - a gesture under 8px stays a native click; a real
 * drag suppresses only the gesture-initiated trailing click
 * (`event.detail > 0`), keyboard clicks always pass.
 */
export function useDragTile(opts: {
  enabled: boolean;
  /** Attribute marking drop targets, e.g. 'data-pair-index'. */
  targetAttr: string;
  onDrop: (sourceIndex: number, targetIndex: number) => void;
}) {
  const sessionRef = useRef<DragSession | null>(null);
  const suppressClickRef = useRef(false);
  const rafRef = useRef(0);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const targetIndexAt = useCallback(
    (x: number, y: number): number | null => {
      const el = document.elementFromPoint(x, y)?.closest(`[${opts.targetAttr}]`);
      if (!el) return null;
      const idx = Number(el.getAttribute(opts.targetAttr));
      return Number.isNaN(idx) ? null : idx;
    },
    [opts.targetAttr],
  );

  const cleanup = useCallback(() => {
    sessionRef.current = null;
    cancelAnimationFrame(rafRef.current); // r30: a queued frame would
    // otherwise recreate ghost/hover after the drag already ended
    setGhost(null);
    setHoverIndex(null);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const onPointerDown = useCallback(
    (index: number) => (e: React.PointerEvent<HTMLElement>) => {
      suppressClickRef.current = false; // reset every gesture - a clickless
      // cancel can never swallow the next genuine tap/keyboard click
      if (!opts.enabled || e.button !== 0) return;
      sessionRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        sourceIndex: index,
        active: false,
        ghostHtml: e.currentTarget.innerHTML,
      };
    },
    [opts.enabled],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const s = sessionRef.current;
      if (!s || s.pointerId !== e.pointerId) return;
      if (!s.active) {
        if (Math.hypot(e.clientX - s.startX, e.clientY - s.startY) <= DRAG_THRESHOLD_PX) return;
        s.active = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }
      cancelAnimationFrame(rafRef.current);
      const { clientX, clientY } = e;
      rafRef.current = requestAnimationFrame(() => {
        const live = sessionRef.current;
        if (!live || !live.active) return; // ended before the frame ran
        setGhost({ x: clientX, y: clientY, html: live.ghostHtml, sourceIndex: live.sourceIndex });
        setHoverIndex(targetIndexAt(clientX, clientY));
      });
    },
    [targetIndexAt],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const s = sessionRef.current;
      if (!s || s.pointerId !== e.pointerId) return;
      if (!s.active) {
        sessionRef.current = null; // plain tap - native click proceeds
        return;
      }
      suppressClickRef.current = true; // crossed the drag threshold
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      const dest = targetIndexAt(e.clientX, e.clientY);
      const source = s.sourceIndex;
      cleanup();
      if (dest !== null && dest !== source) opts.onDrop(source, dest);
    },
    [cleanup, opts.onDrop, targetIndexAt],
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const s = sessionRef.current;
      if (!s || s.pointerId !== e.pointerId) return;
      if (s.active) suppressClickRef.current = true;
      cleanup();
    },
    [cleanup],
  );

  const onLostPointerCapture = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const s = sessionRef.current;
      if (!s || s.pointerId !== e.pointerId) return;
      cleanup();
    },
    [cleanup],
  );

  /** Call inside the tile's onClick. Returns true when this click is the
   *  synthetic trailing click of a completed/cancelled drag and must be
   *  ignored. Keyboard clicks (`detail === 0`) always pass. */
  const shouldSuppressClick = useCallback((detail: number): boolean => {
    if (detail === 0) return false;
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  const ghostNode = ghost ? (
    <span
      aria-hidden="true"
      className="pointer-events-none fixed z-50 flex h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border-4 border-amber-300 bg-[#1d3465] text-2xl font-bold text-white shadow-[0_12px_24px_-8px_rgba(0,0,0,0.6)]"
      style={{ left: ghost.x, top: ghost.y }}
      dangerouslySetInnerHTML={{ __html: ghost.html }}
    />
  ) : null;

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
    shouldSuppressClick,
    hoverIndex,
    dragging: ghost !== null,
    sourceIndex: ghost?.sourceIndex ?? null,
    ghostNode,
  };
}
