export async function startAudioRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream);
  } catch (err) {
    stream.getTracks().forEach((track) => track.stop());
    throw err;
  }
  const release = () => stream.getTracks().forEach((track) => track.stop());
  let vadStop = () => {};
  let vadCtx: AudioContext | undefined;
  try {
    const ctx = new AudioContext();
    vadCtx = ctx;
    const src = ctx.createMediaStreamSource(stream);
    src.connect(ctx.createAnalyser());
    vadStop = () => { if (ctx.state !== 'closed') void ctx.close().catch(() => {}); };
  } catch {
    if (vadCtx && vadCtx.state !== 'closed') void vadCtx.close().catch(() => {});
  }
  try {
    recorder.start();
  } catch (err) {
    release();
    throw err;
  }
  return recorder;
}
