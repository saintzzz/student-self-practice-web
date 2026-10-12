export function useBadRecording() {
  return async () => {
    const controller = await startAudioRecording();
    recorderRef.current = controller;
  };
}
