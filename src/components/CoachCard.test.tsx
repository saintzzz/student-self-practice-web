import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CoachCard from './CoachCard';
import { recordSkillAnswers, resetForTests } from '../lib/engagement/store';

beforeEach(() => resetForTests());

describe('CoachCard (CR-58)', () => {
  it('renders nothing when there is no answer evidence', () => {
    render(<CoachCard gradeId="grade-4" onDrill={vi.fn()} />);
    expect(screen.queryByTestId('coach-card')).not.toBeInTheDocument();
  });

  it('shows weak skills only and starts a focused drill on tap', () => {
    recordSkillAnswers('grade-4', 'grammar-use-of-english', 2, 10); // 20%
    recordSkillAnswers('grade-4', 'reading', 9, 10); // 90% - not weak
    const onDrill = vi.fn();
    render(<CoachCard gradeId="grade-4" onDrill={onDrill} />);
    expect(screen.getByTestId('coach-card')).toBeInTheDocument();
    expect(screen.getByText('Ngữ pháp')).toBeInTheDocument();
    expect(screen.queryByText('Đọc hiểu')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('coach-drill-grammar-use-of-english'));
    expect(onDrill).toHaveBeenCalledWith('english', { skills: ['grammar-use-of-english'] });
  });

  it('routes a math skill drill to the math program', () => {
    recordSkillAnswers('grade-3', 'mathematical-reasoning', 1, 5); // 20%
    const onDrill = vi.fn();
    render(<CoachCard gradeId="grade-3" onDrill={onDrill} />);
    fireEvent.click(screen.getByTestId('coach-drill-mathematical-reasoning'));
    expect(onDrill).toHaveBeenCalledWith('math', { skills: ['mathematical-reasoning'] });
  });
});
