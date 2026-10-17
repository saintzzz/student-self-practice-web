import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { useExamShortcuts, type ExamShortcutHandlers } from './useExamShortcuts';

/** CR-82 M5 (D-18): keyboard shortcuts for the timed exam sitting. */

function Harness({
  enabled = true,
  dialogOpen = false,
  optionCount = 4,
  handlers,
}: {
  enabled?: boolean;
  dialogOpen?: boolean;
  optionCount?: number;
  handlers: ExamShortcutHandlers;
}) {
  useExamShortcuts(enabled, dialogOpen, optionCount, handlers);
  return <input data-testid="free-text" />;
}

function makeHandlers() {
  return {
    onPickOption: vi.fn(),
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onToggleFlag: vi.fn(),
    onOpenNavigator: vi.fn(),
  };
}

describe('useExamShortcuts (CR-82 D-18)', () => {
  it('1-4 and A-D pick options within optionCount', () => {
    const handlers = makeHandlers();
    render(<Harness handlers={handlers} />);
    fireEvent.keyDown(document, { key: '2' });
    expect(handlers.onPickOption).toHaveBeenCalledWith(1);
    fireEvent.keyDown(document, { key: 'c' });
    expect(handlers.onPickOption).toHaveBeenCalledWith(2);
    // Out of range - ignored.
    handlers.onPickOption.mockClear();
    fireEvent.keyDown(document, { key: '9' });
    expect(handlers.onPickOption).not.toHaveBeenCalled();
  });

  it('arrows move questions, F flags, N opens the navigator', () => {
    const handlers = makeHandlers();
    render(<Harness handlers={handlers} />);
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(handlers.onNext).toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(handlers.onPrev).toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'f' });
    expect(handlers.onToggleFlag).toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'N' });
    expect(handlers.onOpenNavigator).toHaveBeenCalled();
  });

  it('is silent while a dialog is open', () => {
    const handlers = makeHandlers();
    render(<Harness dialogOpen handlers={handlers} />);
    fireEvent.keyDown(document, { key: 'f' });
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(handlers.onToggleFlag).not.toHaveBeenCalled();
    expect(handlers.onNext).not.toHaveBeenCalled();
  });

  it('is silent when disabled (practice / result / intro)', () => {
    const handlers = makeHandlers();
    render(<Harness enabled={false} handlers={handlers} />);
    fireEvent.keyDown(document, { key: '1' });
    expect(handlers.onPickOption).not.toHaveBeenCalled();
  });

  it('never intercepts keys typed into inputs', () => {
    const handlers = makeHandlers();
    const { getByTestId } = render(<Harness handlers={handlers} />);
    const input = getByTestId('free-text');
    fireEvent.keyDown(input, { key: 'a' });
    fireEvent.keyDown(input, { key: 'f' });
    fireEvent.keyDown(input, { key: '1' });
    expect(handlers.onPickOption).not.toHaveBeenCalled();
    expect(handlers.onToggleFlag).not.toHaveBeenCalled();
  });

  it('ignores chorded keys (ctrl/meta/alt)', () => {
    const handlers = makeHandlers();
    render(<Harness handlers={handlers} />);
    fireEvent.keyDown(document, { key: 'f', ctrlKey: true });
    fireEvent.keyDown(document, { key: 'n', metaKey: true });
    expect(handlers.onToggleFlag).not.toHaveBeenCalled();
    expect(handlers.onOpenNavigator).not.toHaveBeenCalled();
  });
});
