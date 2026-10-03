/**
 * CR-10 engagement layer (PRD s19 R-T3/R-T4). LocalStorage-backed
 * per-device state: star bank, day streak, sticker album, per-grade
 * stats. Server sync is a separate CR - this store is deliberately
 * self-contained and safe under vitest / private browsing (falls back
 * to memory when localStorage is unavailable or throws).
 */

export interface GradeProgress {
  /** Best-star count accumulated across rounds (capped per grade). */
  stars: number;
  roundsCompleted: number;
  batchesCompleted: number;
}

export interface Sticker {
  id: string;
  nameVi: string;
  emoji: string;
}

/** CR-27: daily quest slice - keyed by local date, resets each new day. */
export interface DailyQuestState {
  dateISO: string;
  drillDone: boolean;
  correctToday: number;
  bigDone: boolean;
  bonusClaimed: boolean;
}

export interface EngagementState {
  totalStars: number;
  grades: Record<string, GradeProgress>;
  streak: { lastDayISO: string | null; count: number };
  stickerIds: string[];
  batchesCompleted: number;
  /** Grade ids the learner has opened a batch in (for the map sticker). */
  gradesPlayed: string[];
  /** CR-27: optional for backward compat with older stored payloads. */
  dailyQuest?: DailyQuestState;
}

const STORAGE_KEY = 'beheo-engagement-v1';
const STARS_PER_ROUND_CAP = 4 * 3; // 4 rounds x 3 stars
const BATCH_CHEST_STARS = 2;

export const STICKERS: readonly Sticker[] = [
  { id: 'first-batch', nameVi: 'Bài luyện đầu tiên', emoji: '🏅' },
  { id: 'perfect-round', nameVi: 'Vòng 3 sao', emoji: '🌟' },
  { id: 'streak-3', nameVi: '3 ngày liên tiếp', emoji: '🔥' },
  { id: 'explorer', nameVi: 'Khám phá 5 vùng đất', emoji: '🗺️' },
  { id: 'star-hoard', nameVi: 'Kho báu 50 sao', emoji: '💎' },
] as const;

const EMPTY_STATE: EngagementState = {
  totalStars: 0,
  grades: {},
  streak: { lastDayISO: null, count: 0 },
  stickerIds: [],
  batchesCompleted: 0,
  gradesPlayed: [],
};

let memory: EngagementState | null = null;

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    // Probe: Safari private mode exposes the object but throws on write.
    localStorage.setItem('__beheo_probe', '1');
    localStorage.removeItem('__beheo_probe');
    return localStorage;
  } catch {
    return null;
  }
}

function load(): EngagementState {
  if (memory) return memory;
  const s = storage();
  if (s) {
    try {
      const raw = s.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as EngagementState;
        memory = { ...EMPTY_STATE, ...parsed };
        return memory;
      }
    } catch {
      // corrupt state -> start fresh
    }
  }
  memory = { ...EMPTY_STATE };
  return memory;
}

function persist(state: EngagementState): void {
  memory = state;
  const s = storage();
  if (s) {
    try {
      s.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore write failures - memory copy is authoritative
    }
  }
}

export function getState(): EngagementState {
  const s = load();
  return { ...s, grades: { ...s.grades }, stickerIds: [...s.stickerIds], gradesPlayed: [...s.gradesPlayed] };
}

/** Local day in ISO (YYYY-MM-DD) - streak compares calendar days, not 24h spans. */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, '0');
  const d = `${now.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dayDiff(aISO: string, bISO: string): number {
  const a = new Date(`${aISO}T00:00:00`).getTime();
  const b = new Date(`${bISO}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function touchStreak(now: Date = new Date()): number {
  const state = load();
  const today = todayISO(now);
  if (state.streak.lastDayISO === today) return state.streak.count;
  if (state.streak.lastDayISO && dayDiff(state.streak.lastDayISO, today) === 1) {
    state.streak = { lastDayISO: today, count: state.streak.count + 1 };
  } else {
    state.streak = { lastDayISO: today, count: 1 };
  }
  persist(state);
  return state.streak.count;
}

/** 0-3 stars by score ratio: >=50%:1, >=75%:2, 100%:3. */
export function starsForScore(points: number, maxPoints: number): number {
  if (maxPoints <= 0 || points <= 0) return 0;
  const ratio = points / maxPoints;
  if (ratio >= 1) return 3;
  if (ratio >= 0.75) return 2;
  if (ratio >= 0.5) return 1;
  return 0;
}

function awardSticker(state: EngagementState, id: string, newly: Set<string>): void {
  if (!state.stickerIds.includes(id)) {
    state.stickerIds.push(id);
    newly.add(id);
  }
}

export interface RoundAwardResult {
  stars: number;
  newStickers: Sticker[];
}

/** Records a finished round; replays only add the star DELTA if improved. */
export function recordRoundResult(
  gradeId: string,
  _roundIndex: number,
  points: number,
  maxPoints: number,
): RoundAwardResult {
  const state = load();
  const stars = starsForScore(points, maxPoints);
  const gp = state.grades[gradeId] ?? { stars: 0, roundsCompleted: 0, batchesCompleted: 0 };
  gp.stars = Math.min(gp.stars + stars, STARS_PER_ROUND_CAP * 40);
  gp.roundsCompleted += 1;
  state.grades[gradeId] = gp;
  state.totalStars += stars;

  const newly = new Set<string>();
  if (stars === 3) awardSticker(state, 'perfect-round', newly);
  if (state.totalStars >= 50) awardSticker(state, 'star-hoard', newly);
  persist(state);
  return { stars, newStickers: [...newly].map((id) => STICKERS.find((s) => s.id === id)!) };
}

export interface BatchAwardResult {
  chestStars: number;
  newStickers: Sticker[];
}

/** Records a finished batch: chest bonus + first-batch/explorer stickers. */
export function recordBatchResult(gradeId: string): BatchAwardResult {
  const state = load();
  const gp = state.grades[gradeId] ?? { stars: 0, roundsCompleted: 0, batchesCompleted: 0 };
  gp.batchesCompleted += 1;
  state.grades[gradeId] = gp;
  state.batchesCompleted += 1;
  state.totalStars += BATCH_CHEST_STARS;
  if (!state.gradesPlayed.includes(gradeId)) state.gradesPlayed.push(gradeId);

  const newly = new Set<string>();
  awardSticker(state, 'first-batch', newly);
  if (state.gradesPlayed.length >= 5) awardSticker(state, 'explorer', newly);
  if (state.totalStars >= 50) awardSticker(state, 'star-hoard', newly);
  persist(state);
  return { chestStars: BATCH_CHEST_STARS, newStickers: [...newly].map((id) => STICKERS.find((s) => s.id === id)!) };
}

/** Streak sticker check - call after touchStreak. */
export function checkStreakStickers(): Sticker[] {
  const state = load();
  const newly = new Set<string>();
  if (state.streak.count >= 3) awardSticker(state, 'streak-3', newly);
  persist(state);
  return [...newly].map((id) => STICKERS.find((s) => s.id === id)!);
}

// ---- CR-27: Daily Quest ------------------------------------------------

export const DAILY_QUEST_TARGET = 10;
export const DAILY_QUEST_BONUS = 3;

export type DailyQuestId = 'drill' | 'correct' | 'big';

export interface DailyQuestItem {
  id: DailyQuestId;
  done: boolean;
  progress: number;
  target: number;
}

export interface DailyQuestSnapshot {
  dateISO: string;
  quests: DailyQuestItem[];
  allDone: boolean;
  bonusClaimed: boolean;
}

function freshDailyQuest(dateISO: string): DailyQuestState {
  return { dateISO, drillDone: false, correctToday: 0, bigDone: false, bonusClaimed: false };
}

/** Returns today's quest slice, resetting it when the stored date is stale. */
function questFor(state: EngagementState, now: Date): DailyQuestState {
  const today = todayISO(now);
  if (!state.dailyQuest || state.dailyQuest.dateISO !== today) {
    state.dailyQuest = freshDailyQuest(today);
    persist(state);
  }
  return state.dailyQuest;
}

export function getDailyQuests(now: Date = new Date()): DailyQuestSnapshot {
  const state = load();
  const q = questFor(state, now);
  const quests: DailyQuestItem[] = [
    { id: 'drill', done: q.drillDone, progress: q.drillDone ? 1 : 0, target: 1 },
    {
      id: 'correct',
      done: q.correctToday >= DAILY_QUEST_TARGET,
      progress: Math.min(q.correctToday, DAILY_QUEST_TARGET),
      target: DAILY_QUEST_TARGET,
    },
    { id: 'big', done: q.bigDone, progress: q.bigDone ? 1 : 0, target: 1 },
  ];
  return {
    dateISO: q.dateISO,
    quests,
    allDone: quests.every((item) => item.done),
    bonusClaimed: q.bonusClaimed,
  };
}

/** Marks the "Luyen de" (20-question drill) quest done for today. */
export function recordDrillComplete(now: Date = new Date()): void {
  const state = load();
  const q = questFor(state, now);
  q.drillDone = true;
  persist(state);
}

/** Marks the big-mode quest (Thi thu exam or 4-round practice batch). */
export function recordBigModeComplete(now: Date = new Date()): void {
  const state = load();
  const q = questFor(state, now);
  q.bigDone = true;
  persist(state);
}

/** Accumulates correct answers toward the daily target (any mode). */
export function recordCorrectAnswers(count: number, now: Date = new Date()): void {
  if (count <= 0) return;
  const state = load();
  const q = questFor(state, now);
  q.correctToday = Math.min(q.correctToday + count, DAILY_QUEST_TARGET);
  persist(state);
}

/** Grants the daily bonus once all quests are done; idempotent per day. */
export function claimDailyBonus(now: Date = new Date()): { granted: boolean; stars: number } {
  const state = load();
  const q = questFor(state, now);
  const allDone = q.drillDone && q.correctToday >= DAILY_QUEST_TARGET && q.bigDone;
  if (!allDone || q.bonusClaimed) return { granted: false, stars: 0 };
  q.bonusClaimed = true;
  state.totalStars += DAILY_QUEST_BONUS;
  persist(state);
  touchStreak(now);
  return { granted: true, stars: DAILY_QUEST_BONUS };
}

/** Test helper - clears persisted + in-memory state. */
export function resetForTests(): void {
  memory = { ...EMPTY_STATE };
  const s = storage();
  if (s) {
    try {
      s.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
