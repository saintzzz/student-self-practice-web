import { describe, expect, it } from 'vitest';
import { botGhost } from './arena';
import { createExam } from './exam/examSession';

// CR-34 acceptance criteria.

describe('arena - AC-34.4 same seed gives the identical question set', () => {
  it('two exams built from one seed have identical question ids', () => {
    const a = createExam('english', 'grade-4', 'arena-seed-42', 0, 10);
    const b = createExam('english', 'grade-4', 'arena-seed-42', 999, 10);
    expect(a.questions.map((q) => q.id)).toEqual(b.questions.map((q) => q.id));
    expect(a.questions).toHaveLength(10);
  });

  it('different seeds give different question sets', () => {
    const a = createExam('english', 'grade-4', 'arena-seed-1', 0, 10);
    const b = createExam('english', 'grade-4', 'arena-seed-2', 0, 10);
    expect(a.questions.map((q) => q.id)).not.toEqual(b.questions.map((q) => q.id));
  });
});

describe('botGhost - AC-34.5 deterministic guest ghost', () => {
  it('same seed yields the same bot', () => {
    expect(botGhost('s1', 100)).toEqual(botGhost('s1', 100));
    expect(botGhost('s1', 100)).not.toEqual(botGhost('s2', 100));
  });

  it('stays inside a plausible band', () => {
    for (let i = 0; i < 50; i++) {
      const g = botGhost(`seed-${i}`, 100);
      expect(g.score).toBeGreaterThanOrEqual(45);
      expect(g.score).toBeLessThanOrEqual(90);
      expect(g.timeMs).toBeGreaterThanOrEqual(90_000);
      expect(g.timeMs).toBeLessThan(240_000);
      expect(g.name.length).toBeGreaterThan(0);
    }
  });
});
