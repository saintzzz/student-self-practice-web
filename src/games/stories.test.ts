import { describe, expect, it } from 'vitest';
import { STORIES, storiesForGrade } from './stories';

const GRADES = ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5'];

describe('CR-126 story bank integrity', () => {
  it('moi grade co dung 3 truyen', () => {
    for (const g of GRADES) {
      expect(storiesForGrade(g)).toHaveLength(3);
    }
    expect(STORIES).toHaveLength(15);
  });

  it('id truyen la duy nhat', () => {
    expect(new Set(STORIES.map((s) => s.id)).size).toBe(STORIES.length);
  });

  it('readAloudIdx luon tro vao cau hop le', () => {
    for (const s of STORIES) {
      expect(s.readAloudIdx).toBeGreaterThanOrEqual(0);
      expect(s.readAloudIdx).toBeLessThan(s.sentences.length);
    }
  });

  it('moi truyen co dung 3 cau quiz, 3 options, dap an trong range', () => {
    for (const s of STORIES) {
      expect(s.quiz).toHaveLength(3);
      for (const q of s.quiz) {
        expect(q.options).toHaveLength(3);
        expect(q.correct).toBeGreaterThanOrEqual(0);
        expect(q.correct).toBeLessThanOrEqual(2);
        expect(q.question.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('cau truyen tieng Anh ket thuc bang dau cau', () => {
    for (const s of STORIES) {
      expect(s.sentences.length).toBeGreaterThanOrEqual(4);
      for (const sent of s.sentences) {
        expect(/[.!?]"?$/.test(sent.trim())).toBe(true);
      }
    }
  });

  it('copy tieng Viet khong chua em-dash/en-dash (global rule)', () => {
    for (const s of STORIES) {
      expect(s.titleVi).not.toMatch(/[\u2013\u2014]/);
    }
  });
});
