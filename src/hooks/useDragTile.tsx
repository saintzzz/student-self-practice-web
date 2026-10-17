import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { DRAG_GHOST } from '../lib/ui/tokens';

const DRAG_THRESHOLD_PX = 8;

interface DragSession {
  pointerId: number;
  startX: number;
  startY: number;
  sourceIndex: number;
  active: boolean;
}

interface Ghost {
  x: number;
  y: number;
  sourceIndex: number;
}

/**
 * CR-79 (DESIGN-SPEC-v3 s2.2): pointer-drag input for tile grids
 * (picture-pair-matching). Arms only when `enabled` (G1-2 band). Tap is
 * never replaced - a gesture under 8px stays a native click; a real
 * drag suppresses only the gesture-initiated trailing click
 * (`event.detail > 0`), keyboard clicks always pass.
 *
 * CR-82 (ARCHITECTURE-v5 D-05): generalized in place for the new G1-2
 * drag surfaces (Spell-it letter tiles, Gap word chips) - the
 * pair-matching call site is unchanged:
 * - `crossNamespace` delivers a drop even when sourceIndex ===
 *   targetIndex (bank tiles and slots are different namespaces, so a
 *   same-numbered drop is meaningful);
 * - `onDropOutside` fires on pointerup over no target so the caller can
 *   spring the tile back;
 * - `renderGhost` supplies a React node instead of the old
 *   innerHTML clone (removes dangerouslySetInnerHTML);
 * - the ghost rides `transform: translate3d` on a fixed left-0/top-0
 *   node (compositor only, spec s17 budget) and defaults to the
 *   DRAG_GHOST token set.
 */
export function useDragTile(opts: {
  enabled: boolean;
  /** Attribute marking drop targets, e.g. 'data-pair-index'. */
  targetAttr: string;
  onDrop: (sourceIndex: number, targetIndex: number) => void;
  /** v5: source and target indexes live in different namespaces (bank
   *  vs slots) - the drop is delivered even when sourceIndex ===
   *  targetIndex. Default false keeps pair-matching semantics. */
  crossNamespace?: boolean;
  /** v5: pointerup over no target while dragging. */
  onDropOutside?: (sourceIndex: number) => void;
  /** v5: React ghost renderer for the dragged tile. */
  renderGhost?: (sourceIndex: number) => ReactNode;
  /** v5: ghost class set (DRAG_GHOST default). */
  ghostClassName?: string;
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
        setGhost({ x: clientX, y: clientY, sourceIndex: live.sourceIndex });
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
      if (dest !== null && (opts.crossNamespace || dest !== source)) {
        opts.onDrop(source, dest);
      } else if (dest === null) {
        /* D-05: dropped over no target - the caller springs the tile
           back or returns it to the bank. */
        opts.onDropOutside?.(source);
      }
    },
    [cleanup, opts.onDrop, opts.onDropOutside, opts.crossNamespace, targetIndexAt],
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

  /* D-05: transform-only ghost on a fixed left-0/top-0 node; the old
     left/top positioning animated layout properties (spec s17 budget
     is transform/opacity only). motion-reduce drops the DRAG_GHOST
     scale/rotate - the ghost still tracks the pointer (direct
     manipulation, not decoration, spec s13.6). */
  const ghostNode = ghost ? (
    <span
      aria-hidden="true"
      className={`pointer-events-none fixed left-0 top-0 z-50 motion-reduce:scale-100 motion-reduce:rotate-0 ${
        opts.ghostClassName ?? DRAG_GHOST
      }`}
      style={{ transform: `translate3d(${ghost.x}px, ${ghost.y}px, 0) translate(-50%, -50%)` }}
    >
      {opts.renderGhost ? opts.renderGhost(ghost.sourceIndex) : null}
    </span>
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
