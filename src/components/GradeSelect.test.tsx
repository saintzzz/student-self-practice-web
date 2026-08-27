import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GradeSelect from './GradeSelect';

const GRADES = [
  { id: 'grade-6', name: 'Grade 6' },
  { id: 'grade-7', name: 'Grade 7' },
];

describe('GradeSelect', () => {
  it('renders a card for every grade', () => {
    render(<GradeSelect grades={GRADES} onSelectGrade={vi.fn()} />);

    expect(screen.getByTestId('grade-card-grade-6')).toBeVisible();
    expect(screen.getByTestId('grade-card-grade-7')).toBeVisible();
    expect(screen.getByText('Grade 6')).toBeVisible();
    expect(screen.getByText('Grade 7')).toBeVisible();
  });

  it('calls onSelectGrade with the clicked grade id', async () => {
    const user = userEvent.setup();
    const onSelectGrade = vi.fn();
    render(<GradeSelect grades={GRADES} onSelectGrade={onSelectGrade} />);

    await user.click(screen.getByTestId('grade-card-grade-7'));

    expect(onSelectGrade).toHaveBeenCalledWith('grade-7');
  });
});
