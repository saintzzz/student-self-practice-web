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
