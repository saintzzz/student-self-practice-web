import { createContext, useContext, type ReactNode } from 'react';
import { bandForGrade, getLand, type KidBand, type Land } from '../ui/theme';

/**
 * kids-UX (ADR KUX-5): one viewer descriptor for the whole tree - which
 * band the current profile is in and whether a real account is signed in.
 * Defaults deliberately match "existing behaviour" (G3-5, guest) so tests
 * and un-wrapped call sites keep working.
 *
 * CR-73 (design-spec-v2 s4.4): `density` carries the band-derived sizing
 * floors so components stop forking on `isG12` for heights/budgets.
 */
export interface ViewerDensity {
  /** tile.hub min-height floor (px): 96 G1-2, 76 G3-5. */
  tileMinH: number;
  /** standalone kid-control min-height floor (px): 76 G1-2, 64 G3-5. */
  primaryMinH: number;
  /** launchpad collapsed-decision budget: 4 G1-2, 6 G3-5. */
  maxDecisions: number;
}

export interface Viewer {
  band: KidBand;
  loggedIn: boolean;
  density: ViewerDensity;
  /** CR-81: the viewer's journey land - play surfaces read it for the
   *  board's rim accent and scene identity. Defaults to brand. */
  land: Land;
}

const DENSITY: Record<KidBand, ViewerDensity> = {
  G12: { tileMinH: 96, primaryMinH: 76, maxDecisions: 4 },
  G345: { tileMinH: 76, primaryMinH: 64, maxDecisions: 6 },
};

const DEFAULT_VIEWER: Viewer = { band: 'G345', loggedIn: false, density: DENSITY.G345, land: getLand(null) };

export const ViewerContext = createContext<Viewer>(DEFAULT_VIEWER);

export function ViewerProvider({
  gradeId,
  loggedIn,
  children,
}: {
  gradeId?: string | null;
  loggedIn?: boolean;
  children: ReactNode;
}) {
  const band = bandForGrade(gradeId);
  const value: Viewer = { band, loggedIn: !!loggedIn, density: DENSITY[band], land: getLand(gradeId) };
  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export function useViewer(): Viewer {
  return useContext(ViewerContext);
}
