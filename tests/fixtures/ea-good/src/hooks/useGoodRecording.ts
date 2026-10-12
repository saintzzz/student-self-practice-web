export function useGoodRecording() {
  const unmountedRef = useRef(false);
  return async () => {
    const controller = await startAudioRecording();
    if (unmountedRef.current) {
      controller.cancel();
      return;
    }
    recorderRef.current = controller;
  };
}
