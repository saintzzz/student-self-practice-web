import { getState, todayISO } from './store';
import { drillSkillsFor, programForSkill, skillLabel } from './skills';
import type { ExamProgramId } from '../../types/exam';

/**
 * CR-58 - weakness analysis for the personalized "Gợi ý cho em" card.
 * Reasons over the trailing 7 days of per-skill counters (skillDays);
 * falls back to all-time counters while the window is still thin so new
 * accounts get a suggestion as soon as they have enough evidence.
 */

export const COACH_WINDOW_DAYS = 7;
/** A skill needs at least this many answers before we trust its accuracy. */
export const COACH_MIN_ANSWERS = 3;
/** Skills at or above this accuracy are not "weak" - hide them from the card. */
export const COACH_STRONG_ACCURACY = 0.8;
export const COACH_MAX_SUGGESTIONS = 3;

export interface WeakSkill {
  /** Recorded key - qb taxonomy for bank items, UI bucket otherwise. */
  skillKey: string;
  /** Vietnamese label ready for display. */
  label: string;
  correct: number;
  total: number;
  accuracy: number;
  /** Program the drill belongs to. */
  program: ExamProgramId;
  /** qb skills to fetch - the p_skills payload for the drill RPC. */
  drillSkills: string[];
}

interface Counters {
  correct: number;
  total: number;
}

function dayKeysInWindow(windowDays: number, now: Date): Set<string> {
  const keys = new Set<string>();
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    keys.add(todayISO(d));
  }
  return keys;
}

function mergeWindow(
  skillDays: Record<string, Record<string, Record<string, Counters>>> | undefined,
  gradeId: string,
  windowDays: number,
  now: Date,
): Record<string, Counters> {
  const out: Record<string, Counters> = {};
  if (!skillDays) return out;
  const wanted = dayKeysInWindow(windowDays, now);
  for (const [dateKey, day] of Object.entries(skillDays)) {
    if (!wanted.has(dateKey)) continue;
    const grade = day[gradeId];
    if (!grade) continue;
    for (const [skill, c] of Object.entries(grade)) {
      const acc = out[skill] ?? { correct: 0, total: 0 };
      acc.correct += c.correct;
      acc.total += c.total;
      out[skill] = acc;
    }
  }
  return out;
}

function toWeakSkills(merged: Record<string, Counters>): WeakSkill[] {
  return Object.entries(merged)
    .filter(([, c]) => c.total >= COACH_MIN_ANSWERS && c.correct / c.total < COACH_STRONG_ACCURACY)
    .map(([skillKey, c]) => {
      const drillSkills = drillSkillsFor(skillKey);
      return {
        skillKey,
        label: skillLabel(skillKey),
        correct: c.correct,
        total: c.total,
        accuracy: c.correct / c.total,
        program: programForSkill(drillSkills[0] ?? skillKey),
        drillSkills,
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)
    .slice(0, COACH_MAX_SUGGESTIONS);
}

/**
 * The grade's weakest skills right now. Weekly window first; when a new
 * student has not yet accumulated a week of evidence the all-time
 * counters stand in so the card is still personalized, not generic.
 */
export function weakSkillsFor(gradeId: string, now: Date = new Date()): WeakSkill[] {
  const stats = getState().stats;
  if (!stats) return [];
  const weekly = mergeWindow(stats.skillDays, gradeId, COACH_WINDOW_DAYS, now);
  const weak = toWeakSkills(weekly);
  if (weak.length > 0) return weak;
  return toWeakSkills(stats.skills?.[gradeId] ?? {});
}
