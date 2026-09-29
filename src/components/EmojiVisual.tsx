/**
 * EmojiVisual - the single render path for every emoji picture in the app
 * (ADR-1, design-spec section 3, constitution #3).
 *
 * Fallback chain: image -> lottie -> svg -> native (one-way per mount).
 * The visible layer is sized 1em x 1em of the container font-size; the
 * original emoji string always survives in exactly one text node so
 * screen readers and existing getByText/textContent assertions keep
 * working (BR-02, AC-1.3).
 */
import { Fragment, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { hasLottie, svgUrl, toEmojiKey } from '../lib/emoji/emojiAssets';
import {
  disableLottieForSession,
  hasLottieEverRendered,
  isLottieDisabledForSession,
  LOTTIE_READY_TIMEOUT_MS,
  markLottieReady,
} from '../lib/emoji/lottieRuntime';
import { initialMode, modeAfterImageError, type EmojiRenderMode } from '../lib/emoji/renderMode';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { EmojiVisualErrorBoundary } from './EmojiVisualErrorBoundary';

const LazyLottiePlayer = lazy(() => import('./EmojiLottiePlayer'));

export interface EmojiVisualProps {
  /** One emoji (may be a ZWJ/keycap sequence). */
  emoji: string;
  /** >= 1. count > 1 = repeated context: static pictures, no lottie/photo. */
  count?: number;
  /** Only single-picture contexts pass true (table 3.6). */
  animated?: boolean;
  /** Only where BR-09 allows; resolved via getWordVisual(wordId). */
  imageUrl?: string;
  /** 'block' = exact 1em flex box; 'inline' = sits in text flow. */
  variant?: 'inline' | 'block';
  /** Applies to `image` mode only (AC-5.7). */
  loading?: 'eager' | 'lazy';
  /** Fired once when the photo fails (all-or-nothing group fallback, AC-5.3). */
  onImageError?: () => void;
  /** Spacing utilities only - never size, opacity or display. */
  className?: string;
}

export function EmojiVisual({
  emoji,
  count = 1,
  animated = false,
  imageUrl,
  variant = 'inline',
  loading = 'eager',
  onImageError,
  className,
}: EmojiVisualProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const key = toEmojiKey(emoji);

  const modeInput = {
    emoji,
    count,
    animated,
    imageUrl,
    prefersReducedMotion,
    lottieDisabledForSession: isLottieDisabledForSession(),
    hasLottie,
  };

  const [mode, setMode] = useState<EmojiRenderMode>(() => initialMode(modeInput));
  const [lottieReady, setLottieReady] = useState(false);
  const [staticReady, setStaticReady] = useState(false);
  const onImageErrorRef = useRef(onImageError);
  onImageErrorRef.current = onImageError;

  // prefers-reduced-motion flips mid-play: lottie -> svg (AC-2.7, C6).
  useEffect(() => {
    if (mode === 'lottie' && prefersReducedMotion) {
      setMode('svg');
      setLottieReady(false);
    }
  }, [mode, prefersReducedMotion]);

  // Lottie ready timeout (AC-2.8): 2500 ms. A timeout before the session's
  // first ever frame trips the breaker; a later timeout only falls back
  // this mount (DS-9).
  useEffect(() => {
    if (mode !== 'lottie' || lottieReady) {
      return;
    }
    const timer = window.setTimeout(() => {
      if (!hasLottieEverRendered()) {
        disableLottieForSession();
      }
      setMode('svg');
    }, LOTTIE_READY_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [mode, lottieReady]);

  function handlePhotoError() {
    setMode(modeAfterImageError(modeInput));
    onImageErrorRef.current?.();
  }

  function handleLottieError(kind: 'data' | 'runtime') {
    // DS-9: player-level failures (runtime/WASM/chunk import) trip the
    // session breaker; a single JSON data failure only falls back this
    // mount. (Timeout-before-first-frame trips in the timer effect.)
    if (kind === 'runtime') {
      disableLottieForSession();
    }
    setMode('svg');
  }

  function handleLottieReady() {
    markLottieReady();
    setLottieReady(true);
  }

  const ready = mode === 'native' || staticReady || lottieReady;

  const rootClass =
    mode === 'native'
      ? 'relative inline-block leading-none'
      : count > 1
        ? 'relative inline'
        : variant === 'block'
          ? 'relative mx-auto flex h-[1em] w-[1em] items-center justify-center leading-none'
          : 'relative inline-block h-[1em] w-[1em] align-[-0.125em] leading-none';

  const svgImg = (
    <img
      src={svgUrl(key)}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      onLoad={() => setStaticReady(true)}
      onError={() => setMode('native')}
      className={
        count > 1
          ? 'mx-[0.05em] inline-block h-[1em] w-[1em] select-none align-[-0.125em]'
          : 'block h-full w-full select-none'
      }
    />
  );

  return (
    <span
      data-emoji-visual={emoji}
      data-emoji-mode={mode}
      {...(ready ? { 'data-emoji-ready': 'true' } : {})}
      className={className ? `${rootClass} ${className}` : rootClass}
    >
      {mode === 'image' && imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          loading={loading}
          decoding="async"
          draggable={false}
          onLoad={() => setStaticReady(true)}
          onError={handlePhotoError}
          className="block h-full w-full select-none object-contain"
        />
      ) : null}
      {mode === 'lottie' ? (
        <>
          {lottieReady ? null : svgImg}
          <span
            aria-hidden="true"
            className={`absolute inset-0 transition-opacity duration-150 ${lottieReady ? 'opacity-100' : 'opacity-0'}`}
          >
            <EmojiVisualErrorBoundary onError={() => handleLottieError('runtime')}>
              <Suspense fallback={null}>
                <LazyLottiePlayer lottieKey={key} onReady={handleLottieReady} onError={handleLottieError} />
              </Suspense>
            </EmojiVisualErrorBoundary>
          </span>
        </>
      ) : null}
      {mode === 'svg'
        ? Array.from({ length: count }, (_, i) => <Fragment key={i}>{svgImg}</Fragment>)
        : null}
      <span className={mode === 'native' ? 'inline-block leading-none' : 'sr-only'}>
        {emoji.repeat(count)}
      </span>
    </span>
  );
}

