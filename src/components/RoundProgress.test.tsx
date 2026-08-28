import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import RoundProgress from './RoundProgress';

describe('RoundProgress', () => {
  it('shows the round-progress testid with an "X/Y" fraction and the round title', () => {
    render(<RoundProgress roundNumber={2} totalRounds={4} titleVi="Vòng 2: Nghe và điền từ" />);

    const progress = screen.getByTestId('round-progress');
    expect(progress).toHaveTextContent('2/4');
    expect(progress).toHaveTextContent('Vòng 2: Nghe và điền từ');
  });
});
