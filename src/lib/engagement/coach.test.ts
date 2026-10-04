import { beforeEach, describe, expect, it } from 'vitest';
import { recordSkillAnswers, resetForTests, getState } from './store';
import { weakSkillsFor, COACH_MIN_ANSWERS } from './coach';
import { bankSkillOf, drillSkillsFor, programForSkill, skillLabel } from './skills';
import type { ExamQuestion } from '../../types/exam';

const NOW = new Date('2026-10-10T09:00:00');
const DAY1 = new Date('2026-10-08T09:00:00'); // in window
const DAY2 = new Date('2026-10-09T09:00:00'); // in window
const OLD = new Date('2026-09-20T09:00:00'); // outside the 7-day window

beforeEach(() => resetForTests());

describe('CR-58: skillDays window', () => {
  it('records per-day skill counters alongside the cumulative ones', () => {
    recordSkillAnswers('grade-4', 'grammar-use-of-english', 4, 10, DAY1);
    const stats = getState().stats!;
    expect(stats.skills['grade-4']['grammar-use-of-english']).toEqual({ correct: 4, total: 10 });
    expect(stats.skillDays!['2026-10-08']['grade-4']['grammar-use-of-english']).toEqual({ correct: 4, total: 10 });
  });
});

describe('CR-58: weakSkillsFor', () => {
  it('returns weakest-first skills from the last 7 days only', () => {
    recordSkillAnswers('grade-4', 'grammar-use-of-english', 4, 10, DAY1); // 40%
    recordSkillAnswers('grade-4', 'reading', 9, 10, DAY2); // 90%
    // An ancient disaster score must NOT dominate the weekly view.
    recordSkillAnswers('grade-4', 'listening', 0, 10, OLD);
    const weak = weakSkillsFor('grade-4', NOW);
    expect(weak[0].skillKey).toBe('grammar-use-of-english');
    expect(weak[0].accuracy).toBeCloseTo(0.4);
    expect(weak.map((w) => w.skillKey)).not.toContain('listening');
  });

  it('ignores skills with too little evidence', () => {
    recordSkillAnswers('grade-4', 'reading', 0, COACH_MIN_ANSWERS - 1, DAY1);
    expect(weakSkillsFor('grade-4', NOW)).toHaveLength(0);
  });

  it('does not recommend skills the student already masters', () => {
    recordSkillAnswers('grade-4', 'reading', 9, 10, DAY1); // 90% - strong
    recordSkillAnswers('grade-4', 'grammar-use-of-english', 4, 10, DAY1); // 40%
    const weak = weakSkillsFor('grade-4', NOW);
    expect(weak.map((w) => w.skillKey)).toEqual(['grammar-use-of-english']);
  });

  it('falls back to all-time counters when the week is thin', () => {
    recordSkillAnswers('grade-4', 'listening', 2, 10, OLD); // 20%, outside window
    const weak = weakSkillsFor('grade-4', NOW);
    expect(weak).toHaveLength(1);
    expect(weak[0].skillKey).toBe('listening');
  });

  it('resolves the drill target for both qb skills and UI buckets', () => {
    recordSkillAnswers('grade-3', 'mathematical-reasoning', 3, 10, DAY1);
    const weak = weakSkillsFor('grade-3', NOW);
    expect(weak[0].program).toBe('math');
    expect(weak[0].drillSkills).toEqual(['mathematical-reasoning']);
    expect(weak[0].label).toBe('Tư duy toán');
  });
});

describe('CR-58: skill mapping', () => {
  it('drillSkillsFor expands UI buckets to qb skills', () => {
    expect(drillSkillsFor('grammar')).toContain('grammar-use-of-english');
    expect(drillSkillsFor('vocabulary')).toContain('vocabulary-recognition');
    expect(drillSkillsFor('mathematical-reasoning')).toEqual(['mathematical-reasoning']);
  });

  it('programForSkill routes qb skills to the right program', () => {
    expect(programForSkill('mathematical-reasoning')).toBe('math');
    expect(programForSkill('science-reading')).toBe('science');
    expect(programForSkill('grammar-use-of-english')).toBe('english');
  });

  it('bankSkillOf reads the V6 taxonomy tag when present', () => {
    const q = {
      id: 'x', topicId: 't', kind: 'grammar-mcq', prompt: 'p',
      options: ['a', 'b', 'c', 'd'], correctIndex: 0, explanation: 'e',
      bankSkill: 'grammar-use-of-english',
    } as ExamQuestion;
    expect(bankSkillOf(q)).toBe('grammar-use-of-english');
    const legacy = { id: 'y', topicId: 't', kind: 'word-order', sentence: 's', tiles: ['a'], explanation: 'e' } as ExamQuestion;
    expect(bankSkillOf(legacy)).toBeUndefined();
  });

  it('skillLabel covers qb taxonomy', () => {
    expect(skillLabel('science-reasoning')).toBe('Suy luận khoa học');
    expect(skillLabel('grammar')).toBe('Ngữ pháp'); // UI bucket still works
  });
});
