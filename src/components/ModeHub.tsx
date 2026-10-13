import { useState, type ComponentType, type ReactNode } from 'react';
import { InstructionSpeaker } from './InstructionSpeaker';
import { IconChevronDown, IconChevronUp, type IconProps } from './icons';
import { TRAIL_TILE, TRAIL_TILE_SM, TRAIL_TILE_EXPANDED, HUB_PANEL } from '../lib/ui/tokens';

/**
 * CR-73 s5.1 Mode Hub - the Kham pha sheet's replacement: labeled,
 * INLINE expandable sections living in a light paper panel inside the
 * navy launchpad card. No overlay, no backdrop, no focus trap - tiles
 * are plain disclosure buttons.
 *
 * Contracts (spec s6 tile.hub):
 *  - `aria-expanded` bound, `aria-controls` -> the panel/section id.
 *  - The region container stays mounted carrying its id even while
 *    collapsed (only children unmount) so aria-controls always resolves.
 *  - Expanded state = chevron swap + TRAIL_TILE_EXPANDED wash.
 *  - One open section per group (accordion).
 *  - Optional voice hint speaks once per tile open (InstructionSpeaker
 *    with a per-section autoplayKey - same once-per-key guard).
 */

export interface HubTileDef {
  /** `learn` -> testid `hub-tile-learn`, region `hub-panel-learn`.
   *  For subtiles the same id maps to `hub-subtile-X`/`hub-section-X`. */
  id: string;
  icon: ComponentType<IconProps>;
  label: string;
  sub?: string;
  /** Optional one-shot voice hint spoken when this tile expands. */
  voiceHint?: string;
  /** Content rendered inside the expanded region. */
  content: ReactNode;
}

export function HubGroup({
  tiles,
  isG12,
  subtile = false,
  voiceKeyPrefix,
}: {
  tiles: HubTileDef[];
  isG12: boolean;
  /** G1-2 `more` internals render `hub-subtile-*`/`hub-section-*` ids. */
  subtile?: boolean;
  voiceKeyPrefix: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const tileClass = isG12 ? TRAIL_TILE : TRAIL_TILE_SM;
  const testPrefix = subtile ? 'hub-subtile' : 'hub-tile';
  const regionPrefix = subtile ? 'hub-section' : 'hub-panel';

  return (
    <div className="space-y-3">
      {tiles.map((tile) => {
        const open = openId === tile.id;
        const regionId = `${regionPrefix}-${tile.id}`;
        return (
          <div key={tile.id}>
            <button
              type="button"
              data-testid={`${testPrefix}-${tile.id}`}
              aria-expanded={open}
              aria-controls={regionId}
              onClick={() => setOpenId(open ? null : tile.id)}
              className={`${tileClass}${open ? ` ${TRAIL_TILE_EXPANDED}` : ''}`}
            >
              <tile.icon size={24} aria-hidden="true" className="mt-0.5 shrink-0 text-sky-600" />
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold text-slate-800">{tile.label}</span>
                {tile.sub && (
                  <span className="block text-xs font-semibold text-slate-500">{tile.sub}</span>
                )}
              </span>
              <span aria-hidden="true" className="shrink-0 text-sky-600">
                {open ? <IconChevronUp size={22} /> : <IconChevronDown size={22} />}
              </span>
            </button>
            {/* The region div keeps the id mounted while collapsed so
                aria-controls never points at nothing (spec m5 fix). */}
            <div id={regionId} data-testid={regionId}>
              {open ? <div className="mt-2 space-y-3 pb-1">{tile.content}</div> : null}
            </div>
            {open && tile.voiceHint && (
              <InstructionSpeaker
                text={tile.voiceHint}
                lang="vi-VN"
                autoplayKey={`${voiceKeyPrefix}-${tile.id}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ModeHub({
  tiles,
  isG12,
  voiceKeyPrefix,
}: {
  tiles: HubTileDef[];
  isG12: boolean;
  voiceKeyPrefix: string;
}) {
  return (
    <div className={HUB_PANEL} data-testid="mode-hub">
      <HubGroup tiles={tiles} isG12={isG12} voiceKeyPrefix={voiceKeyPrefix} />
    </div>
  );
}
