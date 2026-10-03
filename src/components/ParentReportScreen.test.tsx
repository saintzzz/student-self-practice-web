import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ParentReportScreen from './ParentReportScreen';
import { recordSkillAnswer, recordSkillAnswers, resetForTests, todayISO } from '../lib/engagement/store';

const saveParentContactMock = vi.fn<(email: string, optedIn: boolean) => Promise<boolean>>();
const fetchParentContactMock = vi.fn<() => Promise<{ email: string; opted_in: boolean } | null>>();

vi.mock('../lib/parentContact', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/parentContact')>();
  return {
    ...original,
    fetchParentContact: () => fetchParentContactMock(),
    saveParentContact: (email: string, optedIn: boolean) => saveParentContactMock(email, optedIn),
  };
});

const GRADES = [
  { id: 'grade-3', name: 'Lớp 3' },
  { id: 'grade-4', name: 'Lớp 4' },
] as const;

beforeEach(() => {
  resetForTests();
  fetchParentContactMock.mockReset().mockResolvedValue(null);
  saveParentContactMock.mockReset().mockResolvedValue(true);
});

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

  it('AC-31.2: guest report shows no parent email section', () => {
    render(<ParentReportScreen grades={GRADES} onBack={vi.fn()} />);
    expect(screen.queryByTestId('parent-email-section')).toBeNull();
  });

  it('AC-31.1: logged-in report saves the parent email', async () => {
    fetchParentContactMock.mockResolvedValue(null);
    saveParentContactMock.mockResolvedValue(true);
    render(<ParentReportScreen grades={GRADES} onBack={vi.fn()} isLoggedIn />);
    const input = screen.getByTestId('parent-email-input');
    await userEvent.type(input, 'ba.me@example.com');
    await userEvent.click(screen.getByTestId('parent-email-save'));
    await waitFor(() => expect(screen.getByTestId('parent-email-saved')).toBeInTheDocument());
    expect(saveParentContactMock).toHaveBeenCalledWith('ba.me@example.com', true);
  });

  it('rejects a malformed email without calling save', async () => {
    fetchParentContactMock.mockResolvedValue(null);
    render(<ParentReportScreen grades={GRADES} onBack={vi.fn()} isLoggedIn />);
    await userEvent.type(screen.getByTestId('parent-email-input'), 'not-an-email');
    await userEvent.click(screen.getByTestId('parent-email-save'));
    expect(screen.getByTestId('parent-email-error')).toBeInTheDocument();
    expect(saveParentContactMock).not.toHaveBeenCalled();
  });

  it('prefills a previously saved contact and its opt-in state', async () => {
    fetchParentContactMock.mockResolvedValue({ email: 'me@example.com', opted_in: false });
    render(<ParentReportScreen grades={GRADES} onBack={vi.fn()} isLoggedIn />);
    await waitFor(() =>
      expect(screen.getByTestId<HTMLInputElement>('parent-email-input').value).toBe('me@example.com'),
    );
    expect(screen.getByTestId<HTMLInputElement>('parent-email-optin').checked).toBe(false);
  });
});
