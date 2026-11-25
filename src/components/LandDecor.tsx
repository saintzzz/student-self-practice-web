import { useEffect, useState } from 'react';
import { ownedHomeItems, subscribe } from '../lib/engagement/store';
import { ArtImg } from './ArtImg';

/** 8 fixed decoration slots on the land vignette (percent coords, near
 *  the ground line so items read as "placed" on the land). */
const SLOTS = [
  { x: 10, y: 78 }, { x: 22, y: 86 }, { x: 34, y: 74 }, { x: 46, y: 84 },
  { x: 58, y: 76 }, { x: 70, y: 86 }, { x: 82, y: 74 }, { x: 92, y: 82 },
] as const;

function hashSeed(text: string): number {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h;
}

/** Rotates the owned pool daily so collections beyond 8 items still
 *  visit the land - slot pick stays deterministic via hashSeed (r229). */
function placedItems() {
  const items = ownedHomeItems();
  if (!items.length) return [];
  const dayIndex = Math.floor(Date.now() / 864e5);
  const rotated = items.map((_, i) => items[(i + dayIndex) % items.length]);
  const taken = new Set<number>();
  return rotated.slice(0, SLOTS.length).map((item) => {
    let slot = hashSeed(item.id) % SLOTS.length;
    while (taken.has(slot)) slot = (slot + 1) % SLOTS.length;
    taken.add(slot);
    return { item, slot: SLOTS[slot] };
  });
}

/**
 * CR-146 (P1-3): owned home items decorate the grade's land at
 * deterministic slots (hashSeed(itemId) -> slot, collision -> next
 * free). "Nha cua em" = the land itself - what the child earns shows
 * up where they play. Subscribes to engagement changes so a shop
 * purchase on the same screen appears without a reload (r229).
 */
export default function LandDecor() {
  const [placed, setPlaced] = useState(placedItems);
  useEffect(() => subscribe(() => setPlaced(placedItems())), []);

  if (!placed.length) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0" data-testid="land-decor">
      {placed.map(({ item, slot }) => (
        <span key={item.id} className="absolute" style={{ left: `${slot.x}%`, top: `${slot.y}%`, transform: 'translate(-50%,-50%)' }}>
          <ArtImg key={item.art} src={item.art} emoji={item.emoji} size={20} />
        </span>
      ))}
    </div>
  );
}
