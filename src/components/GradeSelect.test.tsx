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

  it('personalizes the journey title with the student name (CR-41)', () => {
    render(<GradeSelect grades={GRADES} onSelectGrade={vi.fn()} studentName="Sóc Xinh" />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hành trình của Bé Sóc Xinh');
  });

  it('keeps the Bé Heo fallback for guests', () => {
    render(<GradeSelect grades={GRADES} onSelectGrade={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hành trình của Bé Heo');
  });
});

const FIVE = [
  { id: 'grade-1', name: 'Lớp 1' },
  { id: 'grade-2', name: 'Lớp 2' },
  { id: 'grade-3', name: 'Lớp 3' },
  { id: 'grade-4', name: 'Lớp 4' },
  { id: 'grade-5', name: 'Lớp 5' },
];

describe('GradeSelect RBAC scope (CR-08)', () => {
  it('filters cards to allowedGrades for students', () => {
    render(
      <GradeSelect grades={FIVE} onSelectGrade={vi.fn()} allowedGrades={['grade-1', 'grade-3']} />,
    );

    expect(screen.getByTestId('grade-card-grade-1')).toBeVisible();
    expect(screen.getByTestId('grade-card-grade-3')).toBeVisible();
    expect(screen.queryByTestId('grade-card-grade-2')).toBeNull();
    expect(screen.getAllByTestId(/^grade-card-/)).toHaveLength(2);
  });

  it('shows the empty-scope message instead of a blank grid', () => {
    render(<GradeSelect grades={FIVE} onSelectGrade={vi.fn()} allowedGrades={[]} />);

    expect(screen.getByTestId('no-scope-message')).toBeVisible();
    expect(screen.queryByTestId(/^grade-card-/)).toBeNull();
  });

  it('renders sign-out chip for signed-in users and login chip for guests', () => {
    const onSignOut = vi.fn();
    const onLogin = vi.fn();
    render(
      <GradeSelect grades={FIVE} onSelectGrade={vi.fn()} onSignOut={onSignOut} onLogin={onLogin} />,
    );

    expect(screen.getByTestId('signout-button')).toBeVisible();
    expect(screen.getByTestId('login-link')).toBeVisible();
  });
});
