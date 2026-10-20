import { Component, Suspense, type ComponentType, type ReactNode } from 'react';
import { createRetryableLazy } from '../../lib/retryableLazy';
import { reloadPage } from '../../lib/reload';
import { useViewer, type ViewerDensity } from '../../lib/viewer/ViewerContext';
import type { ArenaRun } from '../ExamScreen';
import type { ExamProgramId } from '../../types/exam';
import {
  BTN_SECONDARY_PAPER,
  FLASH_PANEL,
  TYPE_BODY_PAPER,
  TYPE_SECTION_PAPER,
} from '../../lib/ui/tokens';

/**
 * CR-82 M9 (bundle D-03): the exam route is a lazy chunk behind this
 * boundary - the same retryable-lazy family pattern as
 * FlashcardErrorBoundary / TracingChunkBoundary (fresh lazy type per
 * attempt, reload affordance after 2 fresh failures). This moved the
 * whole exam subtree (ExamScreen + ExamResult + exam/* chrome) out of
 * the entry chunk, which the M9 micro-interaction additions had pushed
 * ~0.5 kB over the +20 kB CR-82 delta cap.
 *
 * ExamScreenProps is private in ExamScreen.tsx, so the boundary
 * re-declares the identical route props here (type-only import for
 * ArenaRun - erased at build, keeps ExamScreen out of the entry).
 */

interface ExamRouteProps {
  programId: ExamProgramId;
  gradeId: string;
  gradeLabel: string;
  studentName?: string;
  mode: 'exam' | 'practice' | 'review' | 'arena' | 'assignment';
  arena?: ArenaRun;
  assignment?: { id: string; title: string };
  formId?: string;
  focus?: { skills?: string[]; minDifficulty?: number; label?: string };
  onExit: () => void;
}

const lazyScreen = createRetryableLazy<ExamRouteProps>(
  () => import('../ExamScreen') as Promise<{ default: ComponentType<ExamRouteProps> }>,
);

export function examChunkInvocations(): number {
  return lazyScreen.invocations();
}

interface BoundaryProps extends ExamRouteProps {
  /** Sizing floor for the error panel buttons (viewer density). */
  density: ViewerDensity;
}

interface BoundaryState {
  attempt: number;
  failed: boolean;
  invocationsAtError: number;
}

class ExamRouteBoundaryInner extends Component<BoundaryProps, BoundaryState> {
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
    const { density } = this.props;
    const floorClass = density.primaryMinH >= 76 ? ' !min-h-[76px]' : ' !min-h-[64px]';

    if (this.state.failed) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
          <div
            data-testid="exam-chunk-error"
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
              Chưa mở được bài thi
            </h2>
            <p className={TYPE_BODY_PAPER}>
              Có lỗi khi mở bài - em thử lại nhé. Nếu vẫn lỗi, báo bố mẹ giúp em.
            </p>
            <div className="flex w-full flex-col items-center gap-2">
              <button
                type="button"
                data-testid="exam-chunk-retry"
                className={`${BTN_SECONDARY_PAPER} w-full sm:w-auto${floorClass}`}
                onClick={this.handleRetry}
              >
                Thử lại
              </button>
              {this.state.invocationsAtError >= 2 && (
                <button
                  type="button"
                  data-testid="exam-chunk-reload"
                  className={`${BTN_SECONDARY_PAPER} w-full sm:w-auto${floorClass}`}
                  onClick={() => reloadPage()}
                >
                  Tải lại trang
                </button>
              )}
              <button
                type="button"
                data-testid="exam-chunk-exit"
                className={`${BTN_SECONDARY_PAPER} w-full sm:w-auto${floorClass}`}
                onClick={this.props.onExit}
              >
                Về trang chính
              </button>
            </div>
          </div>
        </div>
      );
    }

    const Lazy = lazyScreen.typeFor(this.state.attempt);
    const {
      programId,
      gradeId,
      gradeLabel,
      studentName,
      mode,
      arena,
      assignment,
      formId,
      focus,
      onExit,
    } = this.props;
    return (
      <Suspense
        fallback={
          <div
            data-testid="exam-chunk-loading"
            aria-busy="true"
            className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4"
          >
            <div className="aspect-[4/3] w-[min(84vw,420px)] animate-pulse rounded-[2rem] bg-slate-800/60 motion-reduce:animate-none" />
          </div>
        }
      >
        <Lazy
          key={this.state.attempt}
          programId={programId}
          gradeId={gradeId}
          gradeLabel={gradeLabel}
          studentName={studentName}
          mode={mode}
          arena={arena}
          assignment={assignment}
          formId={formId}
          focus={focus}
          onExit={onExit}
        />
      </Suspense>
    );
  }
}

/** Density comes from context - wrap the class boundary in a thin hook
 *  reader so the fallback buttons honor the band floor. */
export default function ExamRouteBoundary(props: ExamRouteProps) {
  const { density } = useViewer();
  return <ExamRouteBoundaryInner {...props} density={density} />;
}
