import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LetterTracingQuestion } from '../../types';

/**
 * CR-82 (D-22): the boundary gates "Bỏ qua câu này" on genuinely fresh
 * failed attempts - a cached-type rethrow or a render error after a
 * successful load never counts.
 *
 * The real `createRetryableLazy` is replaced by a controllable twin that
 * keeps the same contract (one lazy type per attempt, shared load
 * counting) while letting the test flip load success/failure. Every test
 * re-imports the boundary because a RESOLVED lazy type stays resolved on
 * the module-level instance (the real D-22 behaviour).
 */
const control = vi.hoisted(() => ({ fail: true, invocations: 0 }));

vi.mock('../../lib/retryableLazy', async () => {
  const { lazy } = await import('react');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Loaded = { default: React.ComponentType<any> };
  return {
    createRetryableLazy: (load: () => Promise<Loaded>) => {
      const types = new Map<number, unknown>();
      const counted = (): Promise<Loaded> => {
        control.invocations += 1;
        return control.fail ? Promise.reject(new Error('chunk fail')) : load();
      };
      return {
        typeFor: (attempt: number) => {
          if (!types.has(attempt)) types.set(attempt, lazy(counted));
          return types.get(attempt);
        },
        invocations: () => control.invocations,
        load: counted,
      };
    },
  };
});

const QUESTION: LetterTracingQuestion = {
  id: 't1',
  topicId: 'topic-a',
  kind: 'letter-tracing',
  letter: 'a',
  exampleWordId: 'apple',
  grade: 1,
  explanation: '',
};

type Boundary = typeof import('./TracingChunkBoundary')['default'];

async function freshBoundary(stub: 'ok' | 'throw'): Promise<Boundary> {
  vi.resetModules();
  vi.doMock('./LetterTracingQuestion', () =>
    stub === 'ok'
      ? { default: () => <div data-testid="tracing-body">body</div> }
      : {
          default: () => {
            throw new Error('render boom');
          },
        },
  );
  const mod = await import('./TracingChunkBoundary');
  return mod.default;
}

function renderBoundary(Boundary: Boundary, onSubmit = vi.fn()) {
  return render(
    <Boundary question={QUESTION} hasAnswered={false} onSubmit={onSubmit} />,
  );
}

describe('TracingChunkBoundary (D-22)', () => {
  beforeEach(() => {
    control.fail = true;
    control.invocations = 0;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('loads the chunk and renders the tracing body', async () => {
    control.fail = false;
    renderBoundary(await freshBoundary('ok'));
    expect(await screen.findByTestId('tracing-body')).toBeInTheDocument();
    expect(control.invocations).toBe(1);
  });

  it('first failure -> paper panel with "Thử lại", no skip yet', async () => {
    renderBoundary(await freshBoundary('ok'));
    const panel = await screen.findByTestId('tracing-chunk-error');
    expect(panel).toHaveTextContent('Chưa mở được bài tô chữ');
    expect(panel).toHaveTextContent('Nếu vẫn lỗi, báo bố mẹ giúp em');
    expect(screen.getByTestId('tracing-chunk-retry')).toBeInTheDocument();
    expect(screen.queryByTestId('tracing-chunk-skip')).not.toBeInTheDocument();
  });

  it('retry calls load() again and a successful second attempt renders the body', async () => {
    renderBoundary(await freshBoundary('ok'));
    await screen.findByTestId('tracing-chunk-error');
    control.fail = false;
    fireEvent.click(screen.getByTestId('tracing-chunk-retry'));
    expect(await screen.findByTestId('tracing-body')).toBeInTheDocument();
    expect(control.invocations).toBe(2);
  });

  it('two fresh failed attempts -> "Bỏ qua câu này" appears and submits assisted', async () => {
    const onSubmit = vi.fn();
    renderBoundary(await freshBoundary('ok'), onSubmit);
    await screen.findByTestId('tracing-chunk-error');
    expect(control.invocations).toBe(1);

    fireEvent.click(screen.getByTestId('tracing-chunk-retry'));
    await screen.findByTestId('tracing-chunk-skip');
    expect(control.invocations).toBe(2);

    fireEvent.click(screen.getByTestId('tracing-chunk-skip'));
    expect(onSubmit).toHaveBeenCalledWith(true, { assisted: true, attempts: [] });
  });

  it('a render error after a successful load shows the panel but never the skip', async () => {
    control.fail = false;
    renderBoundary(await freshBoundary('throw'));
    const panel = await screen.findByTestId('tracing-chunk-error');
    expect(panel).toBeInTheDocument();
    /* One load() call succeeded - zero load failures, so the threshold
       is never met. */
    expect(control.invocations).toBe(1);
    expect(screen.queryByTestId('tracing-chunk-skip')).not.toBeInTheDocument();
  });
});
