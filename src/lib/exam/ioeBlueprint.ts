/**
 * CR-129 - IOE-style competition mock blueprints.
 *
 * Rounds reuse the same 4-section IOE shape; counts/time/difficulty
 * escalate truong -> huyen -> tinh. Sections fetch separately through
 * the bank's p_skills filter so the composition is guaranteed.
 * Content difficulty itself comes from the per-grade bank pools, so
 * one blueprint serves every grade.
 *
 * Legal: papers are self-authored to a public structure description -
 * the result screen renders the "khong phai de thi chinh thuc"
 * disclaimer alongside the estimated award tier.
 */
export interface IoeSection {
  label: string;
  skills: string[];
  count: number;
}

export interface IoeAwardTier {
  /** minimum percent correct (0-100) to earn this tier. */
  min: number;
  label: string;
}

export interface IoeRound {
  id: 'truong' | 'huyen' | 'tinh';
  label: string;
  timeSec: number;
  minDifficulty?: number;
  sections: readonly IoeSection[];
}

const VOCAB_GRAMMAR = [
  'vocabulary-recognition',
  'vocabulary-in-context',
  'grammar-use-of-english',
  'functional-language',
];

export const IOE_ROUNDS: readonly IoeRound[] = [
  {
    id: 'truong',
    label: 'Cấp trường',
    timeSec: 20 * 60,
    sections: [
      { label: 'Nghe hiểu', skills: ['listening'], count: 6 },
      { label: 'Từ vựng và ngữ pháp', skills: VOCAB_GRAMMAR, count: 14 },
      { label: 'Đọc hiểu', skills: ['reading'], count: 6 },
      { label: 'Điền từ và viết', skills: ['writing'], count: 4 },
    ],
  },
  {
    id: 'huyen',
    label: 'Cấp huyện',
    timeSec: 25 * 60,
    minDifficulty: 2,
    sections: [
      { label: 'Nghe hiểu', skills: ['listening'], count: 8 },
      { label: 'Từ vựng và ngữ pháp', skills: VOCAB_GRAMMAR, count: 18 },
      { label: 'Đọc hiểu', skills: ['reading'], count: 8 },
      { label: 'Điền từ và viết', skills: ['writing'], count: 6 },
    ],
  },
  {
    id: 'tinh',
    label: 'Cấp tỉnh',
    timeSec: 30 * 60,
    minDifficulty: 3,
    sections: [
      { label: 'Nghe hiểu', skills: ['listening'], count: 9 },
      { label: 'Từ vựng và ngữ pháp', skills: VOCAB_GRAMMAR, count: 20 },
      { label: 'Đọc hiểu', skills: ['reading'], count: 10 },
      { label: 'Điền từ và viết', skills: ['writing'], count: 6 },
    ],
  },
];

export const IOE_AWARD_TIERS: readonly IoeAwardTier[] = [
  { min: 90, label: 'Giải Nhất' },
  { min: 75, label: 'Giải Nhì' },
  { min: 60, label: 'Giải Ba' },
  { min: 45, label: 'Khuyến khích' },
];

export function ioeRoundById(id: string | undefined): IoeRound | undefined {
  return IOE_ROUNDS.find((r) => r.id === id);
}

export function ioeAwardForPercent(percent: number): IoeAwardTier | undefined {
  return IOE_AWARD_TIERS.find((t) => percent >= t.min);
}
