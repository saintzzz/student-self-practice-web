import { useEffect, useMemo, useState } from 'react';
import { TRAIL_NODES, TRAIL_CHEST_NODES, getPet, subscribe, trailSnapshot, type TrailSnapshot } from '../lib/engagement/store';
import { IconChest } from './icons';

/** Deterministic node positions along a gentle arc (percent coords). */
function nodePos(i: number): { x: number; y: number } {
  const t = i / (TRAIL_NODES - 1);
  return { x: 7 + t * 86, y: 26 - Math.sin(t * Math.PI) * 12 };
}

function Lantern({ lit, gold, next }: { lit: boolean; gold: boolean; next: boolean }) {
  return (
    <span
      className={`flex h-4 w-3.5 items-center justify-center rounded-[4px] ring-1 transition ${
        lit
          ? gold
            ? 'bg-amber-300 ring-amber-100 shadow-[0_0_10px_3px_rgba(251,191,36,0.75)]'
            : 'bg-amber-400/95 ring-amber-200 shadow-[0_0_8px_2px_rgba(251,191,36,0.55)]'
          : next
            ? 'animate-pulse bg-amber-200/30 ring-amber-300 motion-reduce:animate-none'
            : 'bg-slate-600/40 ring-slate-500/50'
      }`}
      aria-hidden="true"
    >
      <span className={`h-1 w-1 rounded-full ${lit ? 'bg-amber-50' : next ? 'bg-amber-200/80' : 'bg-slate-400/40'}`} />
    </span>
  );
}

/**
 * CR-146 (GAMEFI-DESIGN-po §3.2): the lantern trail - 12 nodes across the
 * grade's land vignette; each completed batch lights one node (dark ->
 * pulsing next -> lit amber; 3-star batches earn a gold lantern). Nodes
 * 4/8/12 are chest stations; the pet perches at the next unlit node.
 * Rendered inside the launchpad strip so the journey is visible where
 * the child starts - "duong den long" per the gamefi spec.
 */
export default function TrailPath({ gradeId }: { gradeId: string }) {
  const [snap, setSnap] = useState<TrailSnapshot>(() => trailSnapshot(gradeId));
  const [pet] = useState(getPet);
  /* Re-read on engagement changes so a synced trail (or a lap completed
     in another tab) repaints without a remount. */
  useEffect(() => subscribe(() => setSnap(trailSnapshot(gradeId))), [gradeId]);
  const nodes = useMemo(() => Array.from({ length: TRAIL_NODES }, (_, i) => nodePos(i)), []);
  const nextNode = snap.next > 0 ? nodes[snap.next - 1] : null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0" data-testid={`trail-${gradeId}`}>
      {nodes.map((pos, i) => {
        const node = i + 1;
        const lit = node <= snap.lit;
        const gold = lit && (snap.stars[i] ?? 0) >= 3;
        const isChest = (TRAIL_CHEST_NODES as readonly number[]).includes(node);
        return (
          <span key={node} className="absolute" style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%,-50%)' }}>
            {isChest && !lit ? (
              <IconChest size={15} className={node === snap.next ? 'animate-pulse text-amber-200 motion-reduce:animate-none' : 'text-slate-400/70'} />
            ) : (
              <Lantern lit={lit} gold={gold} next={node === snap.next} />
            )}
          </span>
        );
      })}
      {/* Pet perches at the next unlit node - the journey companion. */}
      {nextNode && pet.art && (
        <img
          src={pet.art}
          alt=""
          className="absolute h-6 w-6 object-contain drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)]"
          style={{ left: `${nextNode.x}%`, top: `${nextNode.y - 9}%`, transform: 'translate(-50%,-50%)' }}
        />
      )}
    </div>
  );
}
