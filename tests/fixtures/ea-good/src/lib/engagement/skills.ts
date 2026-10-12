export const QB_SKILL_LABELS: Record<string, string> = {
  'arithmetic': 'Phép tính',
  'word-problem': 'Giải toán có lời văn',
  'concept': 'Khái niệm khoa học',
  'classification': 'Phân loại khoa học',
  'application': 'Vận dụng khoa học',
  'writing': 'Viết',
};
export function skillLabel(k: string): string { return QB_SKILL_LABELS[k] ?? k; }
