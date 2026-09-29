/**
 * Lazily-loaded dotLottie player chunk (ADR-6). This module is the ONLY
 * importer of @lottiefiles/*, so Rollup keeps the whole player (and its
 * WASM, imported via `?url` from the installed package - version-locked,
 * same-origin, constitution #4) inside this async chunk.
 */
import { useEffect, useRef, useState } from 'react';
import { DotLottieReact, setWasmUrl, type Data, type DotLottie } from '@lottiefiles/dotlottie-react';
import wasmUrl from '@lottiefiles/dotlottie-web/dotlottie-player.wasm?url';
import { lottieUrl } from '../lib/emoji/emojiAssets';

// Runs exactly once when this chunk first executes - before any player
// mounts - so the runtime never falls back to the CDN default (AC-2.6).
setWasmUrl(wasmUrl);

export interface EmojiLottiePlayerProps {
  /** Twemoji key (src/lib/emoji/emojiKey.ts). */
  lottieKey: string;
  /** First rendered frame. */
  onReady: () => void;
  /** 'data' = JSON fetch failed (per-mount fallback); 'runtime' = player/WASM failed (trips the session breaker, DS-9). */
  onError: (kind: 'data' | 'runtime') => void;
}

export default function EmojiLottiePlayer({ lottieKey, onReady, onError }: EmojiLottiePlayerProps) {
  const [animationData, setAnimationData] = useState<Data | null>(null);
  const readyFiredRef = useRef(false);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  useEffect(() => {
    const controller = new AbortController();
    fetch(lottieUrl(lottieKey), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`lottie ${lottieKey}: HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((data: unknown) => setAnimationData(data as Data))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        onErrorRef.current('data');
      });
    return () => controller.abort();
  }, [lottieKey]);

  const dotLottieRef = useRef<DotLottie | null>(null);
  useEffect(
    () => () => {
      dotLottieRef.current?.destroy();
      dotLottieRef.current = null;
    },
    [],
  );

  function handleRef(instance: DotLottie | null) {
    dotLottieRef.current = instance;
    if (!instance) {
      return;
    }
    instance.addEventListener('render', () => {
      if (!readyFiredRef.current) {
        readyFiredRef.current = true;
        onReadyRef.current();
      }
    });
    // DS-9 split: 'loadError' fires for well-formed-but-invalid animation
    // data - a single-asset failure that falls back this mount only. Player/
    // WASM-level failures (renderError) trip the session breaker.
    instance.addEventListener('loadError', () => onErrorRef.current('data'));
    instance.addEventListener('renderError', () => onErrorRef.current('runtime'));
  }

  if (!animationData) {
    return null;
  }

  return (
    <DotLottieReact
      data={animationData}
      autoplay
      loop
      renderConfig={{ devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2) }}
      dotLottieRefCallback={handleRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
