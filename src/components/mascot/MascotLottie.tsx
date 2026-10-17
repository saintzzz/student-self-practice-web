/**
 * CR-82 (D-08/D-09): the mascot's Lottie player - the ONLY other importer
 * of @lottiefiles/* besides EmojiLottiePlayer, so Rollup keeps the player +
 * its self-hosted WASM (imported via `?url`, same-origin, constitution #4)
 * inside the async chunks - never the entry (AC-2.5).
 */
import { useEffect, useRef, useState } from 'react';
import { DotLottieReact, setWasmUrl, type Data, type DotLottie } from '@lottiefiles/dotlottie-react';
import wasmUrl from '@lottiefiles/dotlottie-web/dotlottie-player.wasm?url';
import { mascotAssetUrl } from '../../lib/mascot/assets';
import { loopConfig } from '../../lib/mascot/lottieFromPoses';
import type { MascotPoseName } from '../../lib/mascot/poses';

setWasmUrl(wasmUrl);

export interface MascotLottieProps {
  pose: MascotPoseName;
  /** First rendered frame - the rig crossfades the poster out. */
  onReady: () => void;
  /** 'data' = this pose's JSON failed (per-pose static); 'runtime' = player
      /WASM/chunk failed (session breaker - all poses go static). */
  onError: (kind: 'data' | 'runtime') => void;
}

export default function MascotLottie({ pose, onReady, onError }: MascotLottieProps) {
  const [animationData, setAnimationData] = useState<Data | null>(null);
  const playerRef = useRef<DotLottie | null>(null);
  const readyFiredRef = useRef(false);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;
  /* Latest data/pose mirrors for the ref callback - it can arrive AFTER
     the apply-effect below already early-returned on a null player
     (external review r34-A2). */
  const animationDataRef = useRef<Data | null>(null);
  const poseRef = useRef(pose);
  animationDataRef.current = animationData;
  poseRef.current = pose;

  /* Fetch the pose JSON; a pose change swaps the source on the SAME player
     instance via load() (spec s9.5 performance rule) instead of remounting. */
  useEffect(() => {
    const controller = new AbortController();
    fetch(mascotAssetUrl(pose), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`mascot lottie ${pose}: HTTP ${response.status}`);
        return response.json();
      })
      .then((data: unknown) => setAnimationData(data as Data))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        onErrorRef.current('data');
      });
    return () => controller.abort();
  }, [pose]);

  /* Apply the pose to the player once data lands. */
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !animationData) return;
    const { loop, loopCount } = loopConfig(pose);
    readyFiredRef.current = false;
    player.load({ data: animationData, autoplay: true, loop, loopCount });
  }, [animationData, pose]);

  /* Pause rendering while the tab is hidden (spec s9.5). */
  useEffect(() => {
    function onVisibility() {
      const player = playerRef.current;
      if (!player) return;
      if (document.hidden) player.freeze();
      else player.unfreeze();
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(
    () => () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    },
    [],
  );

  function handleRef(instance: DotLottie | null) {
    playerRef.current = instance;
    if (!instance) return;
    instance.addEventListener('render', () => {
      if (!readyFiredRef.current) {
        readyFiredRef.current = true;
        onReadyRef.current();
      }
    });
    instance.addEventListener('loadError', () => onErrorRef.current('data'));
    instance.addEventListener('renderError', () => onErrorRef.current('runtime'));
    /* If the player instance materialised after the apply-effect ran
       (async WASM/callback ordering), load whatever data is already
       here - without this the mascot would stay blank forever with no
       error signal. A same-data reload by the effect is a harmless
       restart inside the same commit. */
    const data = animationDataRef.current;
    if (data) {
      const { loop, loopCount } = loopConfig(poseRef.current);
      readyFiredRef.current = false;
      instance.load({ data, autoplay: true, loop, loopCount });
    }
  }

  if (!animationData) return null;

  return (
    <span data-lottie-player="mascot" aria-hidden="true" className="block h-full w-full">
      <DotLottieReact
        autoplay
        renderConfig={{
          devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
          freezeOnOffscreen: true,
        }}
        dotLottieRefCallback={handleRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </span>
  );
}
