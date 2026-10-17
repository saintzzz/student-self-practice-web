import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ViewerProvider } from '../../lib/viewer/ViewerContext';

/**
 * CR-82 M9 (D-03/D-22): the exam route boundary - the exam subtree is a
 * lazy chunk; retry loads a genuinely fresh chunk type per attempt;
 * "Tải lại trang" is gated on TWO fresh failed invocations;
 * "Về trang chính" exits immediately.
 *
 * The real `createRetryableLazy` is replaced by the same controllable
 * twin as FlashcardErrorBoundary.test - one lazy type per attempt,
 * shared load counting.
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

type Boundary = typeof import('./ExamRouteBoundary')['default'];

const ROUTE_PROPS = {
  programId: 'english' as const,
  gradeId: 'grade-2',
  gradeLabel: 'Lớp 2',
  mode: 'exam' as const,
};

async function freshBoundary(stub: 'ok' | 'throw'): Promise<Boundary> {
  vi.resetModules();
  vi.doMock('../ExamScreen', () =>
    stub === 'ok'
      ? { default: () => <div data-testid="exam-body">body</div> }
      : {
          default: () => {
            throw new Error('render boom');
          },
        },
  );
  const mod = await import('./ExamRouteBoundary');
  return mod.default;
}

function renderBoundary(Boundary: Boundary, onExit = vi.fn()) {
  return render(
    <ViewerProvider gradeId="grade-2">
      <Boundary {...ROUTE_PROPS} onExit={onExit} />
    </ViewerProvider>,
  );
}

describe('ExamRouteBoundary (D-03/D-22)', () => {
  beforeEach(() => {
    control.fail = true;
    control.invocations = 0;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('loads the chunk and renders the exam screen', async () => {
    control.fail = false;
    renderBoundary(await freshBoundary('ok'));
    expect(await screen.findByTestId('exam-body')).toBeInTheDocument();
    expect(control.invocations).toBe(1);
  });

  it('first failure -> paper panel with retry+exit, no reload yet', async () => {
    renderBoundary(await freshBoundary('ok'));
    const panel = await screen.findByTestId('exam-chunk-error');
    expect(panel).toHaveTextContent('Chưa mở được bài thi');
    expect(screen.getByTestId('exam-chunk-retry')).toBeInTheDocument();
    expect(screen.getByTestId('exam-chunk-exit')).toBeInTheDocument();
    expect(screen.queryByTestId('exam-chunk-reload')).not.toBeInTheDocument();
  });

  it('retry calls load() again and a successful second attempt renders the screen', async () => {
    renderBoundary(await freshBoundary('ok'));
    await screen.findByTestId('exam-chunk-error');
    control.fail = false;
    fireEvent.click(screen.getByTestId('exam-chunk-retry'));
    expect(await screen.findByTestId('exam-body')).toBeInTheDocument();
    expect(control.invocations).toBe(2);
  });

  it('two fresh failed attempts -> "Tải lại trang" appears; exit calls onExit', async () => {
    const onExit = vi.fn();
    renderBoundary(await freshBoundary('ok'), onExit);
    await screen.findByTestId('exam-chunk-error');
    expect(control.invocations).toBe(1);

    fireEvent.click(screen.getByTestId('exam-chunk-retry'));
    await screen.findByTestId('exam-chunk-reload');
    expect(control.invocations).toBe(2);

    fireEvent.click(screen.getByTestId('exam-chunk-exit'));
    expect(onExit).toHaveBeenCalledOnce();
  });
});
