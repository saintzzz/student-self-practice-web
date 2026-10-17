import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GapBankDrag from './GapBankDrag';

/**
 * CR-82 (spec s13.3/s13.6/s13.7): chip placement, the sentence-gap
 * interactions (empty -> typing request, filled -> remove), submit
 * gating and aria labels.
 */

const OPTIONS: readonly [string, string, string] = ['dog', 'cat', 'bird'];
const STEM = 'I can see a ___.';

function renderGap(overrides: Partial<Parameters<typeof GapBankDrag>[0]> = {}) {
  const onSubmit = vi.fn();
  const onRequestTyping = vi.fn();
  render(
    <GapBankDrag
      displaySentence={STEM}
      options={OPTIONS}
      disabled={false}
      reducedMotion={false}
      onRequestTyping={onRequestTyping}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );
  return { onSubmit, onRequestTyping };
}

describe('GapBankDrag', () => {
  it('renders the stem split around the gap and three bank chips', () => {
    renderGap();
    expect(screen.getByTestId('sentence-gap')).toBeInTheDocument();
    for (let i = 0; i < 3; i += 1) {
      expect(screen.getByTestId(`gap-chip-${i}`)).toHaveTextContent(OPTIONS[i]!);
    }
    expect(screen.getByRole('group', { name: 'Các từ' })).toBeInTheDocument();
  });

  it('tapping a chip places it in the gap and enables submit', async () => {
    const { onSubmit } = renderGap();
    const user = userEvent.setup();
    const submit = screen.getByTestId('submit-answer-button');
    expect(submit).toBeDisabled();

    await user.click(screen.getByTestId('gap-chip-1')); // 'cat'
    expect(screen.getByTestId('sentence-gap')).toHaveAccessibleName('Chỗ trống: cat');
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledWith('cat');
  });

  it('tapping a filled gap returns the chip to the bank', async () => {
    renderGap();
    const user = userEvent.setup();
    await user.click(screen.getByTestId('gap-chip-0'));
    await user.click(screen.getByTestId('sentence-gap'));
    expect(screen.getByTestId('sentence-gap')).toHaveAccessibleName(/trống/);
    expect(screen.getByTestId('gap-chip-0')).toBeInTheDocument();
    expect(screen.getByTestId('submit-answer-button')).toBeDisabled();
  });

  it('tapping the EMPTY gap requests typing mode (s13.7)', async () => {
    const { onRequestTyping } = renderGap();
    const user = userEvent.setup();
    await user.click(screen.getByTestId('sentence-gap'));
    expect(onRequestTyping).toHaveBeenCalledTimes(1);
  });

  it('a placed gap does NOT request typing - tap removes the chip instead', async () => {
    const { onRequestTyping } = renderGap();
    const user = userEvent.setup();
    await user.click(screen.getByTestId('gap-chip-2'));
    await user.click(screen.getByTestId('sentence-gap'));
    expect(onRequestTyping).not.toHaveBeenCalled();
  });

  it('disables everything when disabled (judged state)', () => {
    renderGap({ disabled: true });
    expect(screen.getByTestId('sentence-gap')).toBeDisabled();
    for (let i = 0; i < 3; i += 1) {
      expect(screen.getByTestId(`gap-chip-${i}`)).toBeDisabled();
    }
    expect(screen.getByTestId('submit-answer-button')).toBeDisabled();
  });
});
