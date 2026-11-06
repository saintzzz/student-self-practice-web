/**
 * CR-129/CR-130 - "Thi Cup" competition mock blueprints (VieSchool
 * own-brand - no third-party competition names in product UI).
 *
 * Rounds reuse the same 4-section competition shape; counts/time/
 * difficulty escalate dong -> bac -> vang. Sections fetch separately
 * through the bank's p_skills filter so the composition is guaranteed.
 * Content difficulty itself comes from the per-grade bank pools, so
 * one blueprint serves every grade.
 *
 * Legal: papers are self-authored to a public structure description -
 * the result screen renders the "khong phai de thi chinh thuc"
 * disclaimer alongside the estimated award tier.
 */
export interface CupSection {
  label: string;
  skills: string[];
  count: number;
}

export interface CupAwardTier {
  /** minimum percent correct (0-100) to earn this tier. */
  min: number;
  label: string;
}

export interface CupRound {
  id: 'dong' | 'bac' | 'vang';
  label: string;
  timeSec: number;
  minDifficulty?: number;
  sections: readonly CupSection[];
}

const VOCAB_GRAMMAR = [
  'vocabulary-recognition',
  'vocabulary-in-context',
  'grammar-use-of-english',
  'functional-language',
];

export const CUP_ROUNDS: readonly CupRound[] = [
  {
    id: 'dong',
    label: 'Vòng Đồng',
    timeSec: 20 * 60,
    sections: [
      { label: 'Nghe hiểu', skills: ['listening'], count: 6 },
      { label: 'Từ vựng và ngữ pháp', skills: VOCAB_GRAMMAR, count: 14 },
      { label: 'Đọc hiểu', skills: ['reading'], count: 6 },
      { label: 'Điền từ và viết', skills: ['writing'], count: 4 },
    ],
  },
  {
    id: 'bac',
    label: 'Vòng Bạc',
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
    id: 'vang',
    label: 'Vòng Vàng',
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

export const CUP_AWARD_TIERS: readonly CupAwardTier[] = [
  { min: 90, label: 'Giải Nhất' },
  { min: 75, label: 'Giải Nhì' },
  { min: 60, label: 'Giải Ba' },
  { min: 45, label: 'Khuyến khích' },
];

export function cupRoundById(id: string | undefined): CupRound | undefined {
  return CUP_ROUNDS.find((r) => r.id === id);
}

export function cupAwardForPercent(percent: number): CupAwardTier | undefined {
  return CUP_AWARD_TIERS.find((t) => percent >= t.min);
}
