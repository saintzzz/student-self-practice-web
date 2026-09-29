import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Called once when the lazy chunk or any descendant throws (ADR-6). */
  onError: () => void;
}

/**
 * Error boundary around the lazily-loaded Lottie player. A chunk-import
 * rejection must never bubble up as an unhandled error - it becomes a
 * quiet fallback to the static SVG via onError (AC-2.8).
 */
export class EmojiVisualErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(): void {
    this.props.onError();
  }

  render(): ReactNode {
    if (this.state.failed) {
      return null;
    }
    return this.props.children;
  }
}
