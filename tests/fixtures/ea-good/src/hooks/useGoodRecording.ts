export function useGoodRecording() {
  const unmountedRef = useRef(false);
  useEffect(() => {
    unmountedRef.current = false;
    return () => { unmountedRef.current = true; };
  }, []);
  return async () => {
    const controller = await startAudioRecording();
    if (unmountedRef.current) {
      controller.cancel();
      return;
    }
    recorderRef.current = controller;
  };
}
