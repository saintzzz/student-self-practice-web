import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LetterTracingQuestion } from '../../types';
import { GLYPH_STROKES } from '../../data/tracing/strokes';
import LetterTracingQuestionComponent from './LetterTracingQuestion';

vi.mock('../../lib/speech', () => ({
  speakWord: vi.fn(),
  speakInstruction: vi.fn(),
  preloadAudio: vi.fn(),
}));

const QUESTION: LetterTracingQuestion = {
  id: 't-a',
  topicId: 'topic-a',
  kind: 'letter-tracing',
  letter: 'a',
  exampleWordId: 'apple',
  grade: 1,
  explanation: 'Chữ "a" như trong từ "apple".',
};

const STROKES = GLYPH_STROKES['a']!.strokes.length;

function renderQuestion(onSubmit = vi.fn()) {
  return render(
    <LetterTracingQuestionComponent
      question={QUESTION}
      hasAnswered={false}
      onSubmit={onSubmit}
    />,
  );
}

describe('LetterTracingQuestion (spec s12)', () => {
  it('renders the banner, exhibit, slate group and the three controls', () => {
    renderQuestion();
    expect(screen.getByText('Tô theo nét chữ nhé. Bắt đầu từ chấm xanh.')).toBeInTheDocument();
    expect(screen.getByTestId('tracing-slate')).toHaveAttribute('role', 'group');
    expect(screen.getByTestId('tracing-slate')).toHaveAttribute('aria-label', 'Khung tô chữ a');
    expect(screen.getByTestId('tracing-auto-step')).toBeInTheDocument();
    expect(screen.getByTestId('tracing-demo')).toBeInTheDocument();
    expect(screen.getByTestId('tracing-reset')).toBeInTheDocument();
    expect(screen.getByTestId('play-audio-button')).toBeInTheDocument();
    /* Every stroke row exists with its state machine attribute. */
    for (let i = 0; i < STROKES; i += 1) {
      expect(screen.getByTestId(`tracing-stroke-${i}`)).toHaveAttribute(
        'data-state',
        i === 0 ? 'active' : 'pending',
      );
    }
  });

  it('"Tô tự động từng nét" auto-draws each stroke, then submits isCorrect=true assisted (R-v5-07)', async () => {
    const onSubmit = vi.fn();
    renderQuestion(onSubmit);
    const auto = screen.getByTestId('tracing-auto-step');
    for (let i = 0; i < STROKES; i += 1) {
      fireEvent.click(auto);
    }
    for (let i = 0; i < STROKES; i += 1) {
      expect(screen.getByTestId(`tracing-stroke-${i}`)).toHaveAttribute('data-state', 'auto');
    }
    await waitFor(() => expect(onSubmit).toHaveBeenCalled(), { timeout: 2000 });
    expect(onSubmit).toHaveBeenCalledWith(true, {
      assisted: true,
      attempts: Array.from({ length: STROKES }, () => 0),
    });
  });

  it('"Tô lại" restarts from stroke 1 with zeroed attempts', () => {
    renderQuestion();
    fireEvent.click(screen.getByTestId('tracing-auto-step'));
    expect(screen.getByTestId('tracing-stroke-0')).toHaveAttribute('data-state', 'auto');
    fireEvent.click(screen.getByTestId('tracing-reset'));
    expect(screen.getByTestId('tracing-stroke-0')).toHaveAttribute('data-state', 'active');
    for (let i = 1; i < STROKES; i += 1) {
      expect(screen.getByTestId(`tracing-stroke-${i}`)).toHaveAttribute('data-state', 'pending');
    }
  });

  it('single-stroke letter auto-stepped once still submits assisted=true (r34-A3)', async () => {
    /* 'o' has exactly one stroke: the FIRST auto-step is also the
       finishing one - `assisted` must be passed synchronously or the
       stale `false` closure marks assisted work as clean. */
    const oneStroke: LetterTracingQuestion = { ...QUESTION, id: 't-o', letter: 'o' };
    const onSubmit = vi.fn();
    render(
      <LetterTracingQuestionComponent
        question={oneStroke}
        hasAnswered={false}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByTestId('tracing-auto-step'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled(), { timeout: 2000 });
    expect(onSubmit).toHaveBeenCalledWith(true, { assisted: true, attempts: [0] });
  });

  it('"Tô lại" during the completion glow cancels the pending submit (r34-A4)', async () => {
    const oneStroke: LetterTracingQuestion = { ...QUESTION, id: 't-o2', letter: 'o' };
    const onSubmit = vi.fn();
    render(
      <LetterTracingQuestionComponent
        question={oneStroke}
        hasAnswered={false}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByTestId('tracing-auto-step'));
    /* The glow holds 400ms before onSubmit fires - reset inside that
       window must cancel the stale answer entirely. */
    fireEvent.click(screen.getByTestId('tracing-reset'));
    expect(screen.getByTestId('tracing-stroke-0')).toHaveAttribute('data-state', 'active');
    await new Promise((r) => setTimeout(r, 600));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('hasAnswered disables the controls', () => {
    render(
      <LetterTracingQuestionComponent
        question={QUESTION}
        hasAnswered={true}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByTestId('tracing-auto-step')).toBeDisabled();
    expect(screen.getByTestId('tracing-demo')).toBeDisabled();
    expect(screen.getByTestId('tracing-reset')).toBeDisabled();
  });
});
