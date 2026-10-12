export async function startAudioRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  recorder.start();
  let vadStop = () => {};
  try {
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    src.connect(ctx.createAnalyser());
    vadStop = () => { void ctx.close(); };
  } catch {
    // ignored
  }
  return recorder;
}
