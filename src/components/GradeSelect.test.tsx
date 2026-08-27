import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GradeSelect from './GradeSelect';

const GRADES = [{ id: 'grade-2', name: 'Lớp 2' }];

describe('GradeSelect', () => {
  it('renders exactly one grade card (AC1)', () => {
    render(<GradeSelect grades={GRADES} onSelectGrade={vi.fn()} />);

    expect(screen.getByTestId('grade-card-grade-2')).toBeVisible();
    expect(screen.getAllByTestId(/^grade-card-/)).toHaveLength(1);
    expect(screen.getByText('Lớp 2')).toBeVisible();
  });

  it('calls onSelectGrade with the clicked grade id', async () => {
    const user = userEvent.setup();
    const onSelectGrade = vi.fn();
    render(<GradeSelect grades={GRADES} onSelectGrade={onSelectGrade} />);

    await user.click(screen.getByTestId('grade-card-grade-2'));

    expect(onSelectGrade).toHaveBeenCalledWith('grade-2');
  });
});
