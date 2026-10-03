import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ParentReportScreen from './ParentReportScreen';
import { recordSkillAnswer, recordSkillAnswers, resetForTests, todayISO } from '../lib/engagement/store';

const GRADES = [
  { id: 'grade-3', name: 'Lớp 3' },
  { id: 'grade-4', name: 'Lớp 4' },
] as const;

beforeEach(() => resetForTests());

describe('ParentReportScreen', () => {
  it('AC-29.3: fresh device shows friendly empty states', () => {
    render(<ParentReportScreen grades={GRADES} onBack={vi.fn()} />);
    expect(screen.getByTestId('report-empty-week')).toBeInTheDocument();
    expect(screen.getByText(/Chưa có dữ liệu kỹ năng/)).toBeInTheDocument();
  });

  it('AC-29.1/29.2: renders day activity and weakest-first skills per grade', () => {
    recordSkillAnswers('grade-4', 'grammar', 4, 10);
    recordSkillAnswers('grade-4', 'spelling', 9, 10);
    recordSkillAnswer('grade-3', 'listening', true);
    render(<ParentReportScreen grades={GRADES} onBack={vi.fn()} />);
    // AC-29.1: today's local day row shows the real correct/total count
    const today = todayISO();
    const dayBar = screen.getByTestId(`report-day-${today}`);
    const dayRow = dayBar.closest('li')!;
    expect(dayRow).toHaveTextContent('14/21 đúng');
    expect(screen.getByTestId('report-grade-grade-4')).toBeInTheDocument();
    expect(screen.getByTestId('report-skill-grade-4-grammar')).toBeInTheDocument();
    expect(screen.getByTestId('report-skill-grade-4-spelling')).toBeInTheDocument();
    // weakest-first ordering
    const card = screen.getByTestId('report-grade-grade-4');
    const grammar = card.querySelector('[data-testid="report-skill-grade-4-grammar"]')!;
    const spelling = card.querySelector('[data-testid="report-skill-grade-4-spelling"]')!;
    expect(grammar.compareDocumentPosition(spelling) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
