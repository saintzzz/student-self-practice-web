import { useCallback, useEffect, useRef, useState } from 'react';
import type { GlyphStrokes, TracingStrokePoint } from '../../data/tracing/strokes';
import { evaluateStroke, isWithinStartTolerance } from '../../lib/tracing/score';
import {
  TRACE_ARROW,
  TRACE_CENTERLINE,
  TRACE_DONE,
  TRACE_INK,
  TRACE_RULE,
  TRACE_RULE_BASE,
  TRACE_START,
  TRACE_TRACK,
} from '../../lib/ui/tokens';

export type StrokeState = 'pending' | 'active' | 'done' | 'auto';

export interface TracingCanvasProps {
  /** Stroke data from strokes.ts (0-100 box). */
  glyph: GlyphStrokes;
  /** 1 | 2 - drives the scoring tolerances (start 18%/12%, coverage 14%/10%). */
  grade: 1 | 2;
  /** Controlled by the parent state machine. */
  activeStroke: number;
  strokeStates: ReadonlyArray<StrokeState>;
  /** Tolerance x1.5 after 2 fails on the active stroke (spec s12.5 step 3). */
  assisted: boolean;
  /** After submit - pointer-events off. */
  disabled: boolean;
  reducedMotion: boolean;
  onStrokeResult: (r: {
    index: number;
    pass: boolean;
    coverage: number;
    precision: number;
  }) => void;
  /** pointerdown outside the start tolerance - a pulse cue, never an attempt. */
  onStartMiss: () => void;
  /** Suppresses the `thinking` pose while a finger is down (spec s12.7). */
  onDrawingChange: (drawing: boolean) => void;
}

type Pt = readonly [number, number];

function toPath(points: ReadonlyArray<TracingStrokePoint>): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`)
    .join(' ');
}

/** 2-3 direction chevrons sampled along the ACTIVE stroke (spec s12.3). */
function arrowsFor(stroke: ReadonlyArray<TracingStrokePoint>): React.ReactNode {
  if (stroke.length < 2) return null;
  const count = Math.min(3, Math.max(2, Math.floor(stroke.length / 2)));
  const nodes: React.ReactNode[] = [];
  for (let k = 1; k <= count; k += 1) {
    const idx = Math.min(stroke.length - 2, Math.floor((stroke.length - 1) * (k / (count + 1))));
    const a = stroke[idx]!;
    const b = stroke[idx + 1]!;
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    nodes.push(
      <polyline
        key={k}
        points="-2,-3 2,0 -2,3"
        fill="none"
        strokeWidth={1.6}
        strokeLinecap="round"
        className={TRACE_ARROW}
        transform={`translate(${mx} ${my}) rotate(${angle})`}
      />,
    );
  }
  return nodes;
}

/**
 * CR-82 (DESIGN-SPEC-v5 s12.3/s12.4): the tracing slate - an aria-hidden
 * SVG guide layer (ô li rules + per-stroke track/centerline/start dot/
 * arrows/done path) under a <canvas> ink layer. All coordinates are the
 * 0-100 stroke box; pointer px are converted on the way in and out.
 */
export default function TracingCanvas({
  glyph,
  grade,
  activeStroke,
  strokeStates,
  assisted,
  disabled,
  reducedMotion,
  onStrokeResult,
  onStartMiss,
  onDrawingChange,
}: TracingCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null | undefined>(undefined);
  const drawingRef = useRef<{ pointerId: number; points: Pt[] } | null>(null);
  const scaleRef = useRef(1); // box units -> css px
  const rafRef = useRef(0);
  const [canvasOk, setCanvasOk] = useState(true);

  /* Size the canvas to the CSS box x min(dpr, 2), keep a unit->px scale. */
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    /* jsdom and some webviews throw (not null) on getContext - the
       assisted-only fallback needs both paths (spec s12.7 error row). */
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      ctx = null;
    }
    ctxRef.current = ctx;
    setCanvasOk(ctx !== null);

    const size = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      scaleRef.current = rect.width / 100;
      if (ctx) ctx.setTransform(dpr * scaleRef.current, 0, 0, dpr * scaleRef.current, 0, 0);
    };
    size();
    /* jsdom/older webviews may lack ResizeObserver - the one-time size
       above still sizes the canvas for the current box. */
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(size);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  const clearInk = useCallback(() => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }, []);

  const drawInk = useCallback((points: readonly Pt[]) => {
    const ctx = ctxRef.current;
    if (!ctx || points.length < 2) return;
    ctx.strokeStyle = TRACE_INK;
    ctx.lineWidth = 10; /* 10% of the box, spec s12.3 */
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0]![0], points[0]![1]);
    /* Quadratic smoothing through midpoints (spec s12.4). */
    for (let i = 1; i < points.length - 1; i += 1) {
      const midX = (points[i]![0] + points[i + 1]![0]) / 2;
      const midY = (points[i]![1] + points[i + 1]![1]) / 2;
      ctx.quadraticCurveTo(points[i]![0], points[i]![1], midX, midY);
    }
    const last = points[points.length - 1]!;
    ctx.lineTo(last[0], last[1]);
    ctx.stroke();
  }, []);

  const redrawInk = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const d = drawingRef.current;
      if (!d) return;
      clearInk();
      drawInk(d.points);
    });
  }, [clearInk, drawInk]);

  /* A stroke result or question swap wipes whatever was on the ink layer. */
  useEffect(() => {
    clearInk();
  }, [activeStroke, strokeStates, disabled, clearInk]);

  const toBox = useCallback((ev: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const rect = ev.currentTarget.getBoundingClientRect();
    return [
      ((ev.clientX - rect.left) / rect.width) * 100,
      ((ev.clientY - rect.top) / rect.height) * 100,
    ];
  }, []);

  const guide = glyph.strokes[activeStroke] ?? glyph.strokes[0];

  const handlePointerDown = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || drawingRef.current) return;
    if (!ev.isPrimary) return;
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    const p = toBox(ev);
    if (!guide || !isWithinStartTolerance(p, guide, grade)) {
      onStartMiss();
      return;
    }
    ev.currentTarget.setPointerCapture(ev.pointerId);
    drawingRef.current = { pointerId: ev.pointerId, points: [p] };
    onDrawingChange(true);
  };

  const handlePointerMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drawingRef.current;
    if (!d || ev.pointerId !== d.pointerId) return;
    /* getCoalescedEvents keeps fast strokes smooth on iOS/Android. */
    const native = ev.nativeEvent as PointerEvent & { getCoalescedEvents?: () => PointerEvent[] };
    const events = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [native];
    const minGap = 2 / scaleRef.current; /* >=2 css px between points */
    for (const e of events) {
      const rect = ev.currentTarget.getBoundingClientRect();
      const p: Pt = [
        ((e.clientX - rect.left) / rect.width) * 100,
        ((e.clientY - rect.top) / rect.height) * 100,
      ];
      const last = d.points[d.points.length - 1]!;
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= minGap) {
        d.points.push(p);
      }
    }
    redrawInk();
  };

  const finishStroke = (ev: React.PointerEvent<HTMLCanvasElement>, cancelled: boolean) => {
    const d = drawingRef.current;
    if (!d || ev.pointerId !== d.pointerId) return;
    drawingRef.current = null;
    onDrawingChange(false);
    if (cancelled) {
      /* OS gesture / palm - discard silently, no attempt counted. */
      clearInk();
      return;
    }
    const r = guide ? evaluateStroke(guide, d.points, grade, { assisted }) : { pass: false, coverage: 0, precision: 0 };
    onStrokeResult({ index: activeStroke, pass: r.pass, coverage: r.coverage, precision: r.precision });
    /* spec s12.5: a pass crossfades into the clean done path (immediate
       clear - the emerald guide redraws), a fail fades the ink 300ms. */
    const canvas = canvasRef.current;
    if (r.pass || !canvas || reducedMotion) {
      clearInk();
    } else {
      canvas.style.transition = 'opacity 300ms';
      canvas.style.opacity = '0';
      window.setTimeout(() => {
        clearInk();
        canvas.style.opacity = '1';
        canvas.style.transition = '';
      }, 300);
    }
  };

  return (
    <div ref={wrapRef} className="relative aspect-square h-full w-full">
      {/* Guide layer: crisp SVG in the 0-100 box (aria-hidden - the slate
          group's label carries the accessible name). */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {/* ô li guide lines: ascender, x-height, baseline. */}
        <line x1={4} y1={10} x2={96} y2={10} strokeWidth={1.5} strokeDasharray="4 3" className={TRACE_RULE} />
        <line x1={4} y1={45} x2={96} y2={45} strokeWidth={1.5} strokeDasharray="4 3" className={TRACE_RULE} />
        <line x1={4} y1={80} x2={96} y2={80} strokeWidth={1.5} className={TRACE_RULE_BASE} />

        {glyph.strokes.map((stroke, i) => {
          const state = strokeStates[i] ?? (i === activeStroke ? 'active' : 'pending');
          const d = toPath(stroke);
          return (
            <g key={i} data-testid={`tracing-stroke-${i}`} data-state={state}>
              {/* Wide track band - 16% box width, pending at 40% opacity. */}
              <path
                d={d}
                fill="none"
                strokeWidth={16}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={state === 'done' || state === 'auto' ? 0 : state === 'pending' ? 0.4 : 0.9}
                className={TRACE_TRACK}
              />
              {/* Dashed centerline - hidden once the stroke is done. */}
              {state !== 'done' && state !== 'auto' && (
                <path
                  d={d}
                  fill="none"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  opacity={state === 'pending' ? 0.4 : 1}
                  className={TRACE_CENTERLINE}
                />
              )}
              {/* Done/auto: the clean path redrawn in emerald. */}
              {(state === 'done' || state === 'auto') && (
                <path
                  d={d}
                  fill="none"
                  strokeWidth={9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={TRACE_DONE}
                  opacity={state === 'auto' ? 0.7 : 1}
                />
              )}
              {/* Direction arrows on the active stroke only. */}
              {state === 'active' && arrowsFor(stroke)}
              {/* Start dot + numeral on the active stroke only. */}
              {state === 'active' && stroke.length > 0 && (
                <g>
                  <circle
                    cx={stroke[0]![0]}
                    cy={stroke[0]![1]}
                    r={6}
                    className={`${TRACE_START} ${reducedMotion ? '' : 'animate-pulse'}`}
                  />
                  <text
                    x={stroke[0]![0]}
                    y={stroke[0]![1] + 2.6}
                    textAnchor="middle"
                    fontSize={7}
                    fontWeight={800}
                    fill="#ffffff"
                  >
                    {i + 1}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      {/* Ink layer - hidden when the 2d context is unavailable (assisted
          mode only, spec s12.7 error row); the controls stay live. */}
      {canvasOk && (
        <canvas
          ref={canvasRef}
          data-testid="tracing-canvas"
          aria-hidden="true"
          className={`absolute inset-0 touch-none select-none ${disabled ? 'pointer-events-none' : ''}`}
          style={{ WebkitTouchCallout: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(ev) => finishStroke(ev, false)}
          onPointerCancel={(ev) => finishStroke(ev, true)}
          onLostPointerCapture={(ev) => finishStroke(ev, true)}
        />
      )}
    </div>
  );
}
