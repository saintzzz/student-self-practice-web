import type { ExamQuestion } from '../../types/exam';

/**
 * CR-29: question kind / round type -> skill bucket for the parent
 * report. Labels are Vietnamese for direct rendering.
 */
export const SKILL_LABELS: Record<string, string> = {
  grammar: 'Ngữ pháp',
  wordorder: 'Sắp xếp câu',
  spelling: 'Chính tả',
  pronunciation: 'Phát âm',
  reading: 'Đọc hiểu',
  textanswer: 'Điền đáp số',
  vocabulary: 'Từ vựng',
  listening: 'Nghe',
  matching: 'Ghép cặp',
  describing: 'Mô tả hình',
  speaking: 'Nói',
  phonics: 'Phonics',
};

const KIND_TO_SKILL: Record<string, string> = {
  'grammar-mcq': 'grammar',
  'word-order': 'wordorder',
  'missing-letter': 'spelling',
  'extra-letter': 'spelling',
  'odd-pronunciation': 'pronunciation',
  'true-false-reading': 'reading',
  'text-answer': 'textanswer',
  'image-choice': 'vocabulary',
  'listening-fill-blank': 'listening',
  'listening-sentence-fill-blank': 'listening',
  'listening-image-choice': 'listening',
  'picture-pair-matching': 'matching',
  'describe-and-choose-image': 'describing',
  'pronunciation-recording': 'speaking',
  'counting-image': 'vocabulary',
  'phonics-sound-choice': 'phonics',
  'phonics-word-choice': 'phonics',
  'phonics-final-choice': 'phonics',
  'phonics-blend-choice': 'phonics',
  'phonics-rhyme-choice': 'phonics',
  'phonics-ending-choice': 'phonics',
};

export function skillKeyFor(question: ExamQuestion): string {
  return KIND_TO_SKILL[question.kind] ?? 'vocabulary';
}

/** Batch round types map onto the same skill buckets. */
export function skillKeyForRound(roundType: string): string {
  if (roundType.startsWith('listening')) return 'listening';
  if (roundType.startsWith('phonics')) return 'phonics';
  return KIND_TO_SKILL[roundType] ?? 'vocabulary';
}

/**
 * CR-58 - precise skill key for stats + coach drills. V6 bank rows carry
 * their own skill taxonomy (row.skill) which is far finer than the UI
 * buckets: every MCQ would otherwise collapse into 'grammar' - including
 * math and science items.
 */
export function bankSkillOf(question: ExamQuestion): string | undefined {
  return 'bankSkill' in question ? question.bankSkill : undefined;
}

/** qb skill -> exam program. Skills not listed default to 'english'. */
const QB_MATH_SKILLS = new Set([
  'mathematical-reasoning', 'number-operations', 'problem-solving',
  'measurement', 'number-sense', 'math-language', 'data', 'geometry',
  'fractions',
]);
const QB_SCIENCE_SKILLS = new Set([
  'science-application', 'science-reading', 'scientific-observation',
  'science-reasoning', 'science-concept', 'science-vocabulary',
  'scientific-enquiry',
]);

export function programForSkill(skillKey: string): 'english' | 'math' | 'science' {
  if (QB_MATH_SKILLS.has(skillKey)) return 'math';
  if (QB_SCIENCE_SKILLS.has(skillKey)) return 'science';
  return 'english';
}

/**
 * CR-58 - drill target for a recorded skill key. qb skills fetch 1:1 via
 * p_skills; legacy UI buckets fan out to their closest qb skills.
 * 'speaking' maps to functional-language because speaking-prompt items
 * are rubric-only (excluded from auto-score pools).
 */
export function drillSkillsFor(skillKey: string): string[] {
  const bucket: Record<string, string[]> = {
    grammar: ['grammar-use-of-english', 'functional-language'],
    wordorder: ['writing'],
    spelling: ['writing', 'vocabulary-recognition'],
    pronunciation: ['phonics-pronunciation'],
    phonics: ['phonics-pronunciation'],
    reading: ['reading'],
    listening: ['listening'],
    vocabulary: ['vocabulary-recognition', 'vocabulary-in-context', 'count-and-name'],
    matching: ['vocabulary-recognition', 'vocabulary-in-context'],
    describing: ['scientific-observation', 'science-concept'],
    speaking: ['functional-language'],
    textanswer: ['math-language', 'problem-solving'],
  };
  return bucket[skillKey] ?? [skillKey];
}

/** CR-58 - Vietnamese labels for the qb skill taxonomy. */
export const QB_SKILL_LABELS: Record<string, string> = {
  'vocabulary-recognition': 'Từ vựng',
  'vocabulary-in-context': 'Từ vựng trong câu',
  'grammar-use-of-english': 'Ngữ pháp',
  'functional-language': 'Giao tiếp',
  'phonics-pronunciation': 'Phát âm',
  'count-and-name': 'Đếm và gọi tên',
  'math-language': 'Từ vựng toán',
  'number-operations': 'Phép tính',
  'number-sense': 'Cảm nhận số',
  'mathematical-reasoning': 'Tư duy toán',
  'problem-solving': 'Giải toán có lời văn',
  'measurement': 'Đo lường',
  'geometry': 'Hình học',
  'fractions': 'Phân số',
  'data': 'Dữ liệu và biểu đồ',
  'science-vocabulary': 'Từ vựng khoa học',
  'science-concept': 'Khái niệm khoa học',
  'science-application': 'Vận dụng khoa học',
  'science-reasoning': 'Suy luận khoa học',
  'science-reading': 'Đọc hiểu khoa học',
  'scientific-observation': 'Quan sát khoa học',
  'scientific-enquiry': 'Khám phá khoa học',
};

export function skillLabel(skillKey: string): string {
  return SKILL_LABELS[skillKey] ?? QB_SKILL_LABELS[skillKey] ?? skillKey;
}
