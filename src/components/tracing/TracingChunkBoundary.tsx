import { Component, Suspense, type ComponentType, type ReactNode } from 'react';
import type { LetterTracingQuestion as LetterTracingQuestionType, TracingMeta } from '../../types';
import { createRetryableLazy } from '../../lib/retryableLazy';
import { material } from '../../lib/ui/tokens';
import type { LetterTracingQuestionProps } from './LetterTracingQuestion';

/**
 * CR-82 (ARCHITECTURE-v5 D-22): the tracing body is a lazy chunk loaded
 * through `createRetryableLazy` inside this boundary:
 *   - failure 1 -> inline paper panel "Chưa mở được bài tô chữ" + "Thử lại"
 *   - "Bỏ qua câu này" appears ONLY after a second fresh failed attempt
 *     (invocation count >= 2 with both rejected) and submits
 *     `onSubmitTracing(true, { assisted: true, attempts: [] })`
 *   - a render exception after a successful load shows the same panel but
 *     is never counted toward the skip threshold
 * The chunk NEVER offers "reload page" mid-batch (it would discard round
 * progress held in App state).
 */

const lazyChunk = createRetryableLazy<LetterTracingQuestionProps>(
  () => import('./LetterTracingQuestion') as Promise<{ default: ComponentType<LetterTracingQuestionProps> }>,
);

/** BatchScreen prefetches when the upcoming round contains a tracing item. */
export function prefetchTracingChunk(): void {
  void lazyChunk.load().catch(() => {
    /* The boundary reports load failures - prefetch stays silent. */
  });
}

export function tracingChunkInvocations(): number {
  return lazyChunk.invocations();
}

interface BoundaryProps {
  question: LetterTracingQuestionType;
  hasAnswered: boolean;
  onSubmit: (isCorrect: boolean, meta: TracingMeta) => void;
  speakerKey?: string;
  onAudioLoadingChange?: (loading: boolean) => void;
  onDrawingChange?: (drawing: boolean) => void;
}

interface BoundaryState {
  attempt: number;
  failed: boolean;
  /** invocations() recorded at the last caught error. */
  invocationsAtError: number;
}

export default class TracingChunkBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { attempt: 0, failed: false, invocationsAtError: 0 };

  static getDerivedStateFromError(): Partial<BoundaryState> {
    return { failed: true };
  }

  componentDidCatch(): void {
    /* A fresh failed ATTEMPT = invocations grew since the last error.
       A rethrow without a new load() call (cached type, render error)
       never counts toward the skip threshold. */
    this.setState((s) => ({
      invocationsAtError: Math.max(s.invocationsAtError, lazyChunk.invocations()),
    }));
  }

  private handleRetry = (): void => {
    this.setState((s) => ({ attempt: s.attempt + 1, failed: false }));
  };

  private handleSkip = (): void => {
    this.props.onSubmit(true, { assisted: true, attempts: [] });
  };

  render(): ReactNode {
    const { question, hasAnswered, onSubmit, speakerKey, onAudioLoadingChange, onDrawingChange } = this.props;

    if (this.state.failed) {
      const freshFailures = this.state.invocationsAtError;
      const canSkip = freshFailures >= 2;
      return (
        <div
          role="alert"
          data-testid="tracing-chunk-error"
          className={`${material.paperSlate} mx-auto w-full max-w-md p-5 text-center`}
        >
          <p className="font-bold text-slate-800">Chưa mở được bài tô chữ.</p>
          <p className="mt-1 text-sm text-slate-600">Nếu vẫn lỗi, báo bố mẹ giúp em.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              data-testid="tracing-chunk-retry"
              onClick={this.handleRetry}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-sky-100 px-4 py-2 font-bold text-sky-800 transition hover:bg-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
            >
              Thử lại
            </button>
            {canSkip && (
              <button
                type="button"
                data-testid="tracing-chunk-skip"
                onClick={this.handleSkip}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-white/70 px-4 py-2 font-bold text-slate-600 ring-1 ring-slate-300 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
              >
                Bỏ qua câu này
              </button>
            )}
          </div>
        </div>
      );
    }

    /* key={attempt} drops the rejected type from the tree entirely; the
       new attempt renders a brand-new lazy type (D-22). */
    const Lazy = lazyChunk.typeFor(this.state.attempt);
    return (
      <Suspense
        fallback={
          <div
            data-testid="tracing-slate-skeleton"
            className={`${material.paperSlate} mx-auto size-[min(82vw,46vh,380px)] animate-pulse`}
          />
        }
      >
        <Lazy
          key={this.state.attempt}
          question={question}
          hasAnswered={hasAnswered}
          onSubmit={onSubmit}
          speakerKey={speakerKey}
          onAudioLoadingChange={onAudioLoadingChange}
          onDrawingChange={onDrawingChange}
        />
      </Suspense>
    );
  }
}
