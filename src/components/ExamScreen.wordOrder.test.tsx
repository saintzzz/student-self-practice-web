/**
 * r15 - updater-side-effect regression: WordOrderView previously called
 * onAnswer() (telemetry) inside a setPicked() updater. StrictMode
 * replays updaters, so the final answer fired twice. These tests pin
 * exactly-once submission plus backtracking semantics.
 */
import { StrictMode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WordOrderView } from './ExamScreen';
import type { WordOrderQuestion } from '../types/exam';

vi.mock('../lib/practiceResults', () => ({ saveExamResult: vi.fn() }));

const Q: WordOrderQuestion = {
  id: 'w1',
  topicId: 't',
  kind: 'word-order',
  sentence: 'I like cats.',
  tiles: ['cats.', 'I', 'like'],
  explanation: 'x',
};

describe('WordOrderView (r15)', () => {
  it('submits the assembled order exactly once under StrictMode', () => {
    const onAnswer = vi.fn();
    render(
      <StrictMode>
        <WordOrderView question={Q} onAnswer={onAnswer} />
      </StrictMode>,
    );
    for (const i of [1, 2, 0]) fireEvent.click(screen.getByTestId(`exam-tile-${i}`));
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith({ type: 'order', indices: [1, 2, 0] });
  });

  it('moves a picked tile out of the pool', () => {
    const onAnswer = vi.fn();
    render(
      <StrictMode>
        <WordOrderView question={Q} onAnswer={onAnswer} />
      </StrictMode>,
    );
    fireEvent.click(screen.getByTestId('exam-tile-1'));
    expect(screen.queryByTestId('exam-tile-1')).toBeNull(); // left the pool
    expect(screen.queryByTestId('exam-slot-1')).toBeNull();
    expect(screen.getByTestId('exam-slot-0')).toBeTruthy();
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('backtracking removes a slot and re-picking rebuilds the answer', () => {
    const onAnswer = vi.fn();
    render(
      <StrictMode>
        <WordOrderView question={Q} onAnswer={onAnswer} />
      </StrictMode>,
    );
    fireEvent.click(screen.getByTestId('exam-tile-0'));
    fireEvent.click(screen.getByTestId('exam-slot-0')); // remove it
    fireEvent.click(screen.getByTestId('exam-tile-1'));
    fireEvent.click(screen.getByTestId('exam-tile-2'));
    fireEvent.click(screen.getByTestId('exam-tile-0'));
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith({ type: 'order', indices: [1, 2, 0] });
  });
});
