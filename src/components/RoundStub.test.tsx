import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoundStub from './RoundStub';

describe('RoundStub', () => {
  it('shows a Vietnamese coming-soon message and the round title without crashing', () => {
    render(<RoundStub titleVi="Vòng 3: Ghi âm phát âm" onNextRound={vi.fn()} />);

    expect(screen.getByText('Vòng 3: Ghi âm phát âm')).toBeVisible();
    expect(screen.getByText(/đang được phát triển/)).toBeVisible();
  });

  it('has no em-dash in its copy', () => {
    render(<RoundStub titleVi="Vòng 4: Chọn hình đúng" onNextRound={vi.fn()} />);

    expect(document.body.textContent).not.toContain('—');
  });

  it('calls onNextRound when next-round-button is clicked', async () => {
    const onNextRound = vi.fn();
    const user = userEvent.setup();
    render(<RoundStub titleVi="Vòng 3: Ghi âm phát âm" onNextRound={onNextRound} />);

    await user.click(screen.getByTestId('next-round-button'));

    expect(onNextRound).toHaveBeenCalledOnce();
  });
});
