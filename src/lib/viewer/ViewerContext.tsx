import { createContext, useContext, type ReactNode } from 'react';
import { bandForGrade, type KidBand } from '../ui/theme';

/**
 * kids-UX (ADR KUX-5): one viewer descriptor for the whole tree - which
 * band the current profile is in and whether a real account is signed in.
 * Defaults deliberately match "existing behaviour" (G3-5, guest) so tests
 * and un-wrapped call sites keep working.
 */
export interface Viewer {
  band: KidBand;
  loggedIn: boolean;
}

const DEFAULT_VIEWER: Viewer = { band: 'G345', loggedIn: false };

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
  const value: Viewer = { band: bandForGrade(gradeId), loggedIn: !!loggedIn };
  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export function useViewer(): Viewer {
  return useContext(ViewerContext);
}
