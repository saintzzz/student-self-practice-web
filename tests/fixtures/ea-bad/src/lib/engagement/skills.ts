export const SKILL_LABELS: Record<string, string> = { grammar: 'Ngữ pháp' };
export function skillLabel(k: string): string { return SKILL_LABELS[k] ?? k; }
