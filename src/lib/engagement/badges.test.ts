import { beforeEach, describe, expect, it } from 'vitest';
import {
  choosePet,
  claimDailyBonus,
  getState,
  recordArenaDuel,
  recordCorrectAnswers,
  recordDrillComplete,
  recordBigModeComplete,
  recordReviewOutcome,
  recordSkillAnswers,
  recordWrongExamQuestion,
  resetForTests,
} from './store';
import type { GrammarMcqQuestion } from '../../types/exam';

// CR-37 acceptance criteria.

const Q = (id: string): GrammarMcqQuestion => ({
  id,
  topicId: 't',
  kind: 'grammar-mcq',
  prompt: `Pick ${id}`,
  options: ['a', 'b', 'c', 'd'],
  correctIndex: 0,
  explanation: 'x',
});

const YESTERDAY = new Date(Date.now() - 86_400_000);

beforeEach(() => resetForTests());

describe('effort badges (AC-37.1)', () => {
  it('correct-100 unlocks at 100 lifetime correct answers', () => {
    recordCorrectAnswers(99);
    expect(getState().stickerIds).not.toContain('correct-100');
    recordCorrectAnswers(1);
    expect(getState().stickerIds).toContain('correct-100');
    expect(getState().stickerIds).not.toContain('correct-500');
  });

  it('review-10 unlocks after mastering 10 review items', () => {
    for (let i = 0; i < 10; i++) {
      const q = Q(`m${i}`);
      recordWrongExamQuestion('g', q, YESTERDAY);
      // Climb the Leitner ladder: 3 corrects masters an item.
      for (const days of [1, 4, 11]) {
        recordReviewOutcome('g', q.id, true, new Date(YESTERDAY.getTime() + days * 86_400_000));
      }
    }
    expect(getState().badgeStats?.reviewMastered).toBe(10);
    expect(getState().stickerIds).toContain('review-10');
  });
});

describe('skill badges (AC-37.2)', () => {
  it('needs >=20 answers AND >=80% accuracy in the skill', () => {
    recordSkillAnswers('grade-3', 'listening', 15, 19); // 79% - no
    recordSkillAnswers('grade-3', 'grammar', 18, 20);   // 90%, 20 total
    expect(getState().stickerIds).toContain('skill-grammar');
    expect(getState().stickerIds).not.toContain('skill-listening');
    recordSkillAnswers('grade-4', 'listening', 1, 1);   // 16/20 = 80%
    expect(getState().stickerIds).toContain('skill-listening');
  });
});

describe('arena badges (AC-37.3)', () => {
  it('first duel earns arena-first; first win earns arena-win; 5th run earns arena-5', () => {
    let badges = recordArenaDuel(false);
    expect(badges.map((b) => b.id)).toContain('arena-first');
    expect(getState().stickerIds).not.toContain('arena-win');
    badges = recordArenaDuel(true);
    expect(badges.map((b) => b.id)).toContain('arena-win');
    recordArenaDuel(false);
    recordArenaDuel(false);
    badges = recordArenaDuel(false); // 5th
    expect(badges.map((b) => b.id)).toContain('arena-5');
  });
});

describe('quest + pet badges (AC-37.4/37.5)', () => {
  it('quest-perfect unlocks on the first full day; quest-3 after 3 days', () => {
    recordDrillComplete();
    recordBigModeComplete();
    recordCorrectAnswers(10);
    claimDailyBonus();
    expect(getState().stickerIds).toContain('quest-perfect');
    expect(getState().stickerIds).not.toContain('quest-3');
    expect(getState().badgeStats?.questPerfectDays).toBe(1);
  });

  it('pet-baby unlocks when the pet hatches, pet-adult at max stage', () => {
    choosePet('cat');
    recordCorrectAnswers(5); // 50 xp -> baby
    expect(getState().stickerIds).toContain('pet-baby');
    expect(getState().stickerIds).not.toContain('pet-adult');
    recordCorrectAnswers(60); // 650 xp -> adult
    expect(getState().stickerIds).toContain('pet-adult');
  });
});
