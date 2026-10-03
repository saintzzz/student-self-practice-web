import type { ExamQuestion } from '../../types/exam';

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
  /** CR-37: album grouping. */
  category: 'luyen' | 'skill' | 'streak' | 'arena' | 'quest' | 'pet';
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
  /** CR-28: spaced-repetition wrong-answer queue per grade. */
  review?: Record<string, ReviewItem[]>;
  /** CR-29: per-day + per-skill answer stats for the parent report. */
  stats?: StatsSlice;
  /** CR-36: companion pet - XP grows with every correct answer. */
  pet?: PetState;
}

/** CR-29: answer counters backing the parent report screen. */
export interface StatsSlice {
  /** dateISO -> answers recorded that day (capped to 30 newest days). */
  days: Record<string, { correct: number; total: number }>;
  /** gradeId -> skillKey -> counters. */
  skills: Record<string, Record<string, { correct: number; total: number }>>;
}

/** CR-28: one wrong question waiting to be re-asked. */
export interface ReviewItem {
  /** The question's own id - dedupe key. */
  id: string;
  question: ExamQuestion;
  /** Leitner stage: 0 -> +1d, 1 -> +3d, 2 -> +7d, 3 -> mastered. */
  stage: 0 | 1 | 2 | 3;
  addedAtISO: string;
  dueISO: string;
}

const STORAGE_KEY = 'beheo-engagement-v1';
const STARS_PER_ROUND_CAP = 4 * 3; // 4 rounds x 3 stars
const BATCH_CHEST_STARS = 2;

export const STICKERS: readonly Sticker[] = [
  // Luyện tập - milestones from batches, rounds and raw effort.
  { id: 'first-batch', nameVi: 'Bài luyện đầu tiên', emoji: '🏅', category: 'luyen' },
  { id: 'perfect-round', nameVi: 'Vòng 3 sao', emoji: '🌟', category: 'luyen' },
  { id: 'explorer', nameVi: 'Khám phá 5 vùng đất', emoji: '🗺️', category: 'luyen' },
  { id: 'star-hoard', nameVi: 'Kho báu 50 sao', emoji: '💎', category: 'luyen' },
  { id: 'correct-100', nameVi: '100 câu đúng', emoji: '💯', category: 'luyen' },
  { id: 'correct-500', nameVi: '500 câu đúng', emoji: '🚀', category: 'luyen' },
  { id: 'review-10', nameVi: 'Chữa xong 10 câu sai', emoji: '📚', category: 'luyen' },
  // Kỹ năng - >= 20 câu và đúng >= 80% trong một nhóm kỹ năng.
  { id: 'skill-grammar', nameVi: 'Vua ngữ pháp', emoji: '🧠', category: 'skill' },
  { id: 'skill-listening', nameVi: 'Tai vàng', emoji: '🎧', category: 'skill' },
  { id: 'skill-spelling', nameVi: 'Ong chính tả', emoji: '🐝', category: 'skill' },
  { id: 'skill-reading', nameVi: 'Cú đọc hiểu', emoji: '📖', category: 'skill' },
  // Streak.
  { id: 'streak-3', nameVi: '3 ngày liên tiếp', emoji: '🔥', category: 'streak' },
  { id: 'streak-7', nameVi: '7 ngày liên tiếp', emoji: '☄️', category: 'streak' },
  // Đấu trường.
  { id: 'arena-first', nameVi: 'Trận đấu đầu tiên', emoji: '⚔️', category: 'arena' },
  { id: 'arena-win', nameVi: 'Chiến thắng Arena', emoji: '🏆', category: 'arena' },
  { id: 'arena-5', nameVi: '5 trận đấu trường', emoji: '�️', category: 'arena' },
  // Nhiệm vụ ngày.
  { id: 'quest-perfect', nameVi: 'Hết nhiệm vụ ngày', emoji: '✨', category: 'quest' },
  { id: 'quest-3', nameVi: '3 ngày hoàn thành nhiệm vụ', emoji: '🌈', category: 'quest' },
  // Pet.
  { id: 'pet-baby', nameVi: 'Pet nở ra', emoji: '🐣', category: 'pet' },
  { id: 'pet-adult', nameVi: 'Pet trưởng thành', emoji: '�', category: 'pet' },
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
  // CR-36: every correct answer feeds the companion pet - uncapped,
  // unlike the daily quest target which maxes at DAILY_QUEST_TARGET.
  bumpPetXp(state, count);
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

// ---- CR-28: spaced repetition (on lai cau sai) --------------------------

const REVIEW_CAP = 60;
/** Days to wait before re-asking at each stage (index = stage). */
const REVIEW_INTERVAL_DAYS = [1, 3, 7] as const;

function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

function reviewListFor(state: EngagementState, gradeId: string): ReviewItem[] {
  if (!state.review) state.review = {};
  if (!state.review[gradeId]) state.review[gradeId] = [];
  return state.review[gradeId];
}

/**
 * Records a wrong answer from Luyen de / Thi thu. Re-wronging the same
 * question refreshes it (back to stage 0, due tomorrow, newer add date)
 * instead of duplicating.
 */
export function recordWrongExamQuestion(
  gradeId: string,
  question: ExamQuestion,
  now: Date = new Date(),
): void {
  const state = load();
  const list = reviewListFor(state, gradeId);
  const today = todayISO(now);
  const existing = list.findIndex((item) => item.id === question.id);
  const item: ReviewItem = {
    id: question.id,
    question,
    stage: 0,
    addedAtISO: today,
    dueISO: addDaysISO(today, REVIEW_INTERVAL_DAYS[0]),
  };
  // Re-recording refreshes the item AND moves it to the end, so
  // insertion order always equals least-recently-wrong order - the
  // cap eviction below then drops the truly oldest entries.
  if (existing !== -1) list.splice(existing, 1);
  list.push(item);
  if (list.length > REVIEW_CAP) {
    list.splice(0, list.length - REVIEW_CAP);
  }
  persist(state);
}

/** Due items for a grade, oldest-due first. */
export function getDueReviewItems(gradeId: string, now: Date = new Date()): ReviewItem[] {
  const state = load();
  const today = todayISO(now);
  return (state.review?.[gradeId] ?? [])
    .filter((item) => item.dueISO <= today)
    .sort((a, b) => (a.dueISO < b.dueISO ? -1 : a.dueISO > b.dueISO ? 1 : 0));
}

/**
 * Records the outcome of a review-session answer: correct advances the
 * stage (mastered items leave the queue), wrong resets to stage 0.
 */
export function recordReviewOutcome(
  gradeId: string,
  questionId: string,
  correct: boolean,
  now: Date = new Date(),
): void {
  const state = load();
  const list = state.review?.[gradeId];
  if (!list) return;
  const index = list.findIndex((item) => item.id === questionId);
  if (index === -1) return;
  const today = todayISO(now);
  if (!correct) {
    list[index] = { ...list[index], stage: 0, dueISO: addDaysISO(today, REVIEW_INTERVAL_DAYS[0]) };
  } else if (list[index].stage >= 2) {
    list.splice(index, 1); // mastered after stage 2 (+7d) success
  } else {
    const nextStage = (list[index].stage + 1) as 1 | 2;
    list[index] = { ...list[index], stage: nextStage, dueISO: addDaysISO(today, REVIEW_INTERVAL_DAYS[nextStage]) };
  }
  persist(state);
}

// ---- CR-29: parent-report stats ----------------------------------------

const DAY_STATS_CAP = 30;

function statsSliceFor(state: EngagementState): StatsSlice {
  if (!state.stats) state.stats = { days: {}, skills: {} };
  return state.stats;
}

function bumpDay(stats: StatsSlice, today: string, correct: number, total: number): void {
  const day = stats.days[today] ?? { correct: 0, total: 0 };
  day.correct += correct;
  day.total += total;
  stats.days[today] = day;
  // Bound storage: keep only the 30 newest calendar days.
  const keys = Object.keys(stats.days).sort();
  if (keys.length > DAY_STATS_CAP) {
    for (const key of keys.slice(0, keys.length - DAY_STATS_CAP)) {
      delete stats.days[key];
    }
  }
}

function bumpSkill(stats: StatsSlice, gradeId: string, skillKey: string, correct: number, total: number): void {
  const grade = stats.skills[gradeId] ?? {};
  const skill = grade[skillKey] ?? { correct: 0, total: 0 };
  skill.correct += correct;
  skill.total += total;
  grade[skillKey] = skill;
  stats.skills[gradeId] = grade;
}

/** Records one answered question toward today's and the skill's stats. */
export function recordSkillAnswer(
  gradeId: string,
  skillKey: string,
  correct: boolean,
  now: Date = new Date(),
): void {
  const state = load();
  const stats = statsSliceFor(state);
  bumpDay(stats, todayISO(now), correct ? 1 : 0, 1);
  bumpSkill(stats, gradeId, skillKey, correct ? 1 : 0, 1);
  persist(state);
}

/** Aggregated variant for round-level outcomes (batch practice). */
export function recordSkillAnswers(
  gradeId: string,
  skillKey: string,
  correct: number,
  total: number,
  now: Date = new Date(),
): void {
  if (total <= 0) return;
  const state = load();
  const stats = statsSliceFor(state);
  bumpDay(stats, todayISO(now), correct, total);
  bumpSkill(stats, gradeId, skillKey, correct, total);
  persist(state);
}

export interface ReportDay {
  dateISO: string;
  correct: number;
  total: number;
}

export interface ReportSkill {
  key: string;
  correct: number;
  total: number;
  /** 0..1 */
  accuracy: number;
}

export interface ReportSnapshot {
  /** Rolling last 7 calendar days ending today (empty days included). */
  days: ReportDay[];
  /** gradeId -> skills sorted weakest-first. */
  skills: Record<string, ReportSkill[]>;
}

/** Read-only snapshot for the parent report screen. */
export function getReportSnapshot(now: Date = new Date()): ReportSnapshot {
  const state = load();
  const days: ReportDay[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const iso = todayISO(d);
    const stat = state.stats?.days[iso];
    days.push({ dateISO: iso, correct: stat?.correct ?? 0, total: stat?.total ?? 0 });
  }
  const skills: Record<string, ReportSkill[]> = {};
  for (const [gradeId, gradeSkills] of Object.entries(state.stats?.skills ?? {})) {
    skills[gradeId] = Object.entries(gradeSkills)
      .map(([key, s]) => ({ key, correct: s.correct, total: s.total, accuracy: s.total > 0 ? s.correct / s.total : 0 }))
      .sort((a, b) => a.accuracy - b.accuracy || a.key.localeCompare(b.key));
  }
  return { days, skills };
}

// ---- CR-36: companion pet ----------------------------------------------

export type PetSpecies = 'cat' | 'dragon' | 'bunny';

export interface PetState {
  /** null until the learner picks a companion - XP still accumulates. */
  species: PetSpecies | null;
  xp: number;
  /** Highest stage already celebrated on screen (one-time congrats). */
  seenStage: number;
}

/** 10 XP per correct answer - same as exam points so the pet literally
 *  grows on the same effort the scoreboard shows. */
export const PET_XP_PER_CORRECT = 10;
/** XP thresholds per stage: egg -> baby -> kid -> adult. */
export const PET_STAGE_XP = [0, 50, 250, 600] as const;
const PET_STAGE_NAMES = ['Trứng', 'Bé', 'Nhỏ', 'Trưởng thành'] as const;

export const PET_SPECIES: Record<PetSpecies, { nameVi: string; emojis: readonly [string, string, string, string] }> = {
  cat: { nameVi: 'Mèo Mun', emojis: ['🥚', '🐱', '🐈', '🐯'] },
  dragon: { nameVi: 'Rồng Con', emojis: ['🥚', '🦎', '🐲', '🐉'] },
  bunny: { nameVi: 'Thỏ Trắng', emojis: ['🥚', '🐰', '🐇', '🦄'] },
};

export function petStageForXp(xp: number): number {
  let stage = 0;
  for (let i = PET_STAGE_XP.length - 1; i >= 0; i--) {
    if (xp >= PET_STAGE_XP[i]!) return i;
  }
  return stage;
}

function petSliceFor(state: EngagementState): PetState {
  if (!state.pet) state.pet = { species: null, xp: 0, seenStage: 0 };
  return state.pet;
}

function bumpPetXp(state: EngagementState, correctCount: number): void {
  if (correctCount <= 0) return;
  petSliceFor(state).xp += correctCount * PET_XP_PER_CORRECT;
}

export interface PetSnapshot {
  species: PetSpecies | null;
  nameVi: string | null;
  emoji: string;
  xp: number;
  stage: number;
  stageName: string;
  /** XP still needed to reach the next stage; null at the last stage. */
  xpToNext: number | null;
  /** True once when the pet has grown past `seenStage` - celebrate then mark. */
  justEvolved: boolean;
}

export function getPet(): PetSnapshot {
  const pet = petSliceFor(load());
  const stage = petStageForXp(pet.xp);
  const species = pet.species;
  const next = PET_STAGE_XP[stage + 1];
  return {
    species,
    nameVi: species ? PET_SPECIES[species].nameVi : null,
    emoji: species ? PET_SPECIES[species].emojis[stage]! : '🥚',
    xp: pet.xp,
    stage,
    stageName: PET_STAGE_NAMES[stage]!,
    xpToNext: next === undefined ? null : next - pet.xp,
    justEvolved: stage > pet.seenStage,
  };
}

export function choosePet(species: PetSpecies): void {
  const state = load();
  petSliceFor(state).species = species;
  persist(state);
}

/** Call after showing the evolution congrats so it only fires once. */
export function markPetStageSeen(): void {
  const state = load();
  petSliceFor(state).seenStage = petStageForXp(state.pet?.xp ?? 0);
  persist(state);
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
