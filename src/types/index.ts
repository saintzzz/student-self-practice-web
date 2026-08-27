export interface Grade {
  id: string;
  name: string;
}

export interface Topic {
  id: string;
  gradeId: string;
  name: string;
}

export type QuestionKind = 'image-choice' | 'listening-fill-blank';

export interface ImageChoiceQuestion {
  id: string;
  topicId: string;
  kind: 'image-choice';
  emoji: string;
  options: readonly [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface ListeningFillBlankQuestion {
  id: string;
  topicId: string;
  kind: 'listening-fill-blank';
  word: string;
  explanation: string;
}

export type Question = ImageChoiceQuestion | ListeningFillBlankQuestion;

export interface AnswerRecord {
  question: Question;
  isCorrect: boolean;
}

export interface SessionResult {
  correctCount: number;
  totalCount: number;
  answers: AnswerRecord[];
}
