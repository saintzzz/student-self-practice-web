import type { ReactNode } from 'react';
import { getLand, LANDS, type LandKey } from '../lib/ui/theme';
import LandScene from './scene/LandScene';

interface LandShellProps {
  /** Grade id - resolves to its land; omit/null for the sky land. */
  gradeId?: string | null;
  /** Direct override when a screen knows its land but not a grade. */
  land?: LandKey;
  /** CR-81: kid play surfaces ride the deep-navy page while the land
   *  art renders as a moonlit scene beneath the board. */
  night?: boolean;
  children: ReactNode;
}

/**
 * CR-10 DS-T1: page-level themed shell - land gradient + pinned scene
 * art behind the content. Replaces the flat body gradient; each screen
 * renders inside so per-screen testids/layout are untouched.
 */
export default function LandShell({ gradeId, land, night = false, children }: LandShellProps) {
  const resolved = land ? LANDS[land] : getLand(gradeId);
  return (
    <div className={`relative min-h-screen ${night ? LANDS.brand.pageGradient : resolved.pageGradient}`}>
      <LandScene land={resolved.key} night={night} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
