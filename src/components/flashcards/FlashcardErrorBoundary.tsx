import { Component, Suspense, type ComponentType, type ReactNode } from 'react';
import type { Grade } from '../../types';
import { createRetryableLazy } from '../../lib/retryableLazy';
import { reloadPage } from '../../lib/reload';
import { useViewer, type ViewerDensity } from '../../lib/viewer/ViewerContext';
import type { FlashcardScreenProps } from './FlashcardScreen';
import {
  BTN_SECONDARY_PAPER,
  FLASH_PANEL,
  TYPE_BODY_PAPER,
  TYPE_SECTION_PAPER,
} from '../../lib/ui/tokens';

/**
 * CR-82 (ARCHITECTURE-v5 D-11/D-22): the flashcard route is a lazy chunk
 * behind this boundary. Chunk-load failure renders the spec s14.5 load
 * error panel; "Thử lại" is a genuinely new import attempt (a fresh lazy
 * type per attempt - React.lazy caches its rejection, GT-20). After TWO
 * fresh failed attempts the panel also offers "Tải lại trang" - a
 * deliberate reload: nothing is lost because ratings save per decision
 * and the child lands back on GradeSelect.
 */

const lazyScreen = createRetryableLazy<FlashcardScreenProps>(
  () => import('./FlashcardScreen') as Promise<{ default: ComponentType<FlashcardScreenProps> }>,
);

export function flashcardChunkInvocations(): number {
  return lazyScreen.invocations();
}

interface BoundaryProps {
  grade: Grade;
  onExit: () => void;
  /** Sizing floor for the error panel buttons (viewer density). */
  density: ViewerDensity;
}

interface BoundaryState {
  attempt: number;
  failed: boolean;
  invocationsAtError: number;
}

class FlashcardErrorBoundaryInner extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { attempt: 0, failed: false, invocationsAtError: 0 };
  private headingRef: { current: HTMLHeadingElement | null } = { current: null };

  static getDerivedStateFromError(): Partial<BoundaryState> {
    return { failed: true };
  }

  componentDidCatch(): void {
    this.setState((s) => ({
      invocationsAtError: Math.max(s.invocationsAtError, lazyScreen.invocations()),
    }));
  }

  componentDidUpdate(_: BoundaryProps, prev: BoundaryState): void {
    if (this.state.failed && !prev.failed) this.headingRef.current?.focus();
  }

  private handleRetry = (): void => {
    this.setState((s) => ({ attempt: s.attempt + 1, failed: false }));
  };

  render(): ReactNode {
    const { grade, onExit, density } = this.props;
    const floorClass = density.primaryMinH >= 76 ? ' !min-h-[76px]' : ' !min-h-[64px]';

    if (this.state.failed) {
      const freshFailures = this.state.invocationsAtError;
      return (
        <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
          <div
            data-testid="flashcard-error"
            role="alert"
            className={`${FLASH_PANEL} flex flex-col items-center gap-3`}
          >
            <h2
              ref={(el) => {
                this.headingRef.current = el;
              }}
              tabIndex={-1}
              className={`${TYPE_SECTION_PAPER} focus:outline-none`}
            >
              Chưa mở được bộ thẻ
            </h2>
            <p className={TYPE_BODY_PAPER}>
              Có lỗi khi mở thẻ - em thử lại nhé. Nếu vẫn lỗi, báo bố mẹ giúp em.
            </p>
            <div className="flex w-full flex-col items-center gap-2">
              <button
                type="button"
                data-testid="flashcard-error-retry"
                className={`${BTN_SECONDARY_PAPER} w-full sm:w-auto${floorClass}`}
                onClick={this.handleRetry}
              >
                Thử lại
              </button>
              {freshFailures >= 2 && (
                <button
                  type="button"
                  data-testid="flashcard-error-reload"
                  className={`${BTN_SECONDARY_PAPER} w-full sm:w-auto${floorClass}`}
                  onClick={() => reloadPage()}
                >
                  Tải lại trang
                </button>
              )}
              <button
                type="button"
                data-testid="flashcard-error-exit"
                className={`${BTN_SECONDARY_PAPER} w-full sm:w-auto${floorClass}`}
                onClick={onExit}
              >
                Về trang chính
              </button>
            </div>
          </div>
        </div>
      );
    }

    const Lazy = lazyScreen.typeFor(this.state.attempt);
    return (
      <Suspense
        fallback={
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-6 sm:py-10">
            <div
              data-testid="flashcard-loading"
              aria-busy="true"
              className="aspect-[3/4] w-[min(84vw,360px)] animate-pulse rounded-[2rem] bg-amber-100 motion-reduce:animate-none"
            />
          </div>
        }
      >
        <Lazy key={this.state.attempt} grade={grade} onExit={onExit} />
      </Suspense>
    );
  }
}

/** Density comes from context - wrap the class boundary in a thin hook
 *  reader so the fallback buttons honor the band floor. */
export default function FlashcardErrorBoundary(props: { grade: Grade; onExit: () => void }) {
  const { density } = useViewer();
  return <FlashcardErrorBoundaryInner {...props} density={density} />;
}
