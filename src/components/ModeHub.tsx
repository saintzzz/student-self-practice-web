import { useState, type ComponentType, type ReactNode } from 'react';
import { InstructionSpeaker } from './InstructionSpeaker';
import { IconChevronDown, IconChevronUp, type IconProps } from './icons';
import { useViewer } from '../lib/viewer/ViewerContext';
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

export interface HubSectionDef {
  /** Suffix for the persistent `hub-{panel|section}-{id}` wrapper. */
  id: string;
  content: ReactNode;
}

export interface HubTileDef {
  /** `learn` -> testid `hub-tile-learn`, region `hub-panel-learn`.
   *  For subtiles the same id maps to `hub-subtile-X`/`hub-section-X`. */
  id: string;
  icon: ComponentType<IconProps>;
  label: string;
  sub?: string;
  /** Optional one-shot voice hint spoken when this tile expands. */
  voiceHint?: string;
  /** Single-section form: content renders inside the auto region
   *  (`hub-{panel|section}-{tile.id}`). */
  content?: ReactNode;
  /** Multi-section form (spec §5.1): each section gets its own
   *  persistent empty wrapper so every `aria-controls` target stays
   *  mounted while collapsed. Conditional sections are simply omitted
   *  from the list. Overrides `content`. */
  sections?: HubSectionDef[];
}

export function HubGroup({
  tiles,
  subtile = false,
  voiceKeyPrefix,
}: {
  tiles: HubTileDef[];
  /** G1-2 `more` internals render `hub-subtile-*`/`hub-section-*` ids. */
  subtile?: boolean;
  voiceKeyPrefix: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { density } = useViewer();
  const tileClass = density.tileMinH >= 96 ? TRAIL_TILE : TRAIL_TILE_SM;
  const testPrefix = subtile ? 'hub-subtile' : 'hub-tile';
  const regionPrefix = subtile ? 'hub-section' : 'hub-panel';

  return (
    <div className="space-y-3">
      {tiles.map((tile) => {
        const open = openId === tile.id;
        const regionIds = tile.sections
          ? tile.sections.map((s) => `${regionPrefix}-${s.id}`)
          : [`${regionPrefix}-${tile.id}`];
        return (
          <div key={tile.id}>
            <button
              type="button"
              data-testid={`${testPrefix}-${tile.id}`}
              aria-expanded={open}
              aria-controls={regionIds.join(' ')}
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
            {/* Every aria-controls target stays mounted while collapsed -
                only children unmount (spec m5 container rule). */}
            {(tile.sections ?? [{ id: tile.id, content: tile.content }]).map((s) => {
              const id = `${regionPrefix}-${s.id}`;
              return (
                <div key={id} id={id} data-testid={id}>
                  {open ? <div className="mt-2 space-y-3 pb-1">{s.content}</div> : null}
                </div>
              );
            })}
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
  voiceKeyPrefix,
}: {
  tiles: HubTileDef[];
  voiceKeyPrefix: string;
}) {
  return (
    <div className={HUB_PANEL} data-testid="mode-hub">
      <HubGroup tiles={tiles} voiceKeyPrefix={voiceKeyPrefix} />
    </div>
  );
}
