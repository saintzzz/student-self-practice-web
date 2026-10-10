import { useState } from 'react';
import {
  isAudioRecordingSupported,
  isIOSOrIPadOS,
  pickAudioMimeType,
  startAudioRecording,
} from '../lib/audioRecording';
import { transcribePronunciationAudio } from '../lib/pronunciationTranscription';

interface LogLine {
  time: string;
  msg: string;
  kind: 'info' | 'ok' | 'err';
}

function stamp(): string {
  return new Date().toISOString().slice(17, 23);
}

export default function DebugAudioScreen() {
  const [lines, setLines] = useState<LogLine[]>([]);
  const log = (msg: string, kind: LogLine['kind'] = 'info') =>
    setLines((prev) => [...prev, { time: stamp(), msg, kind }]);

  const hasSynth = typeof window !== 'undefined' && !!window.speechSynthesis;
  const voices = hasSynth ? window.speechSynthesis.getVoices() : [];
  const enVoices = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
  const hasMedia = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const recog =
    (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
      .SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

  const testSpeak = () => {
    if (!hasSynth) {
      log('speechSynthesis: KHONG CO trong trinh duyet', 'err');
      return;
    }
    const synth = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance('Hello, this is a test.');
    u.lang = 'en-US';
    u.rate = 0.9;
    const v = enVoices[0];
    if (v) {
      u.voice = v;
      log(`dung voice: ${v.name} (${v.lang}) localService=${v.localService}`);
    } else {
      log('khong co voice en-* nao - de browser tu chon', 'err');
    }
    u.onstart = () => log('onstart - bat dau phat', 'ok');
    u.onend = () => log('onend - phat xong', 'ok');
    u.onerror = (e) => log(`onerror: ${e.error}`, 'err');
    synth.resume();
    try {
      synth.speak(u);
      log('speak() da goi');
    } catch (err) {
      log(`speak() throw: ${String(err)}`, 'err');
    }
    setTimeout(() => {
      log(
        `trang thai sau 2s: speaking=${synth.speaking} pending=${synth.pending} paused=${synth.paused}`,
      );
    }, 2000);
  };

  const testMic = async () => {
    if (!hasMedia) {
      log('mediaDevices.getUserMedia: KHONG CO (context khong secure hoac trinh duyet cu)', 'err');
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      log(`mic OK - track: ${s.getAudioTracks()[0]?.label ?? '(an)' }`, 'ok');
      s.getTracks().forEach((t) => t.stop());
    } catch (err) {
      const e = err as DOMException;
      log(`mic loi: ${e.name} - ${e.message}`, 'err');
    }
  };

  const testRecord = async () => {
    if (!isAudioRecordingSupported()) {
      log('MediaRecorder/getUserMedia: KHONG CO - trinh duyet qua cu hoac context khong secure', 'err');
      return;
    }
    try {
      log(`MediaRecorder mime: ${pickAudioMimeType() || '(browser tu chon)'}`);
      const controller = await startAudioRecording({ maxDurationMs: 4000 });
      log('dang ghi 4s - doc to chu "apple"...', 'info');
      const blob = await controller.stop();
      log(`ghi xong: ${blob.size} bytes, type ${blob.type || '?'}`, 'ok');
      const transcript = await transcribePronunciationAudio(blob, 'apple');
      log(
        transcript === null
          ? 'transcribe LOI - edge function chua deploy hoac chua co AI key'
          : `transcript: "${transcript}"`,
        transcript === null ? 'err' : 'ok',
      );
    } catch (err) {
      const e = err as DOMException;
      log(`ghi am loi: ${e.name} - ${e.message}`, 'err');
    }
  };

  const testPlainAudio = () => {
    const a = new Audio(
      'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
    );
    a.play()
      .then(() => log('audio element: da play (khong co tieng la binh thuong - file rong)', 'ok'))
      .catch((e: DOMException) => log(`audio element loi: ${e.name} - ${e.message}`, 'err'));
  };

  return (
    <div className="min-h-screen bg-[#0b1224] p-5 font-sans text-white">
      <h1 className="mb-1 text-xl font-bold text-amber-300">Debug Audio - VieSchool</h1>
      <p className="mb-4 text-xs text-slate-400">
        mo trang nay tren dien thoai, bam tung nut, chup man hinh gui lai
      </p>

      <div className="mb-4 space-y-1 rounded-xl bg-white/5 p-3 text-xs">
        <div>
          UA: <span className="text-slate-300">{navigator.userAgent}</span>
        </div>
        <div>
          speechSynthesis:{' '}
          <b className={hasSynth ? 'text-emerald-400' : 'text-red-400'}>
            {hasSynth ? 'co' : 'KHONG CO'}
          </b>
        </div>
        <div>
          voices: <b>{voices.length}</b> tong, <b>{enVoices.length}</b> tieng Anh
        </div>
        {enVoices.slice(0, 5).map((v) => (
          <div key={v.voiceURI} className="pl-3 text-slate-400">
            - {v.name} ({v.lang}) {v.localService ? 'local' : 'network'}
          </div>
        ))}
        <div>
          getUserMedia:{' '}
          <b className={hasMedia ? 'text-emerald-400' : 'text-red-400'}>
            {hasMedia ? 'co' : 'KHONG CO'}
          </b>
        </div>
        <div>
          SpeechRecognition:{' '}
          <b className={recog ? 'text-emerald-400' : 'text-red-400'}>{recog ? 'co' : 'KHONG CO'}</b>
        </div>
        <div>
          MediaRecorder:{' '}
          <b className={isAudioRecordingSupported() ? 'text-emerald-400' : 'text-red-400'}>
            {isAudioRecordingSupported() ? `co (${pickAudioMimeType() || 'auto'})` : 'KHONG CO'}
          </b>
        </div>
        <div>
          iOS/iPadOS: <b>{String(isIOSOrIPadOS())}</b>
        </div>
        <div>
          secureContext:{' '}
          <b className={window.isSecureContext ? 'text-emerald-400' : 'text-red-400'}>
            {String(window.isSecureContext)}
          </b>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={testSpeak}
          className="rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-slate-900"
        >
          1. Test phat am (TTS)
        </button>
        <button
          onClick={testPlainAudio}
          className="rounded-xl bg-sky-400 px-4 py-3 text-sm font-bold text-slate-900"
        >
          2. Test loa (audio tag)
        </button>
        <button
          onClick={testMic}
          className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-900"
        >
          3. Test mic
        </button>
        <button
          onClick={testRecord}
          className="rounded-xl bg-rose-400 px-4 py-3 text-sm font-bold text-slate-900"
        >
          4. Test ghi am + cham diem
        </button>
        <button
          onClick={() => setLines([])}
          className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold"
        >
          Xoa log
        </button>
      </div>

      <div className="space-y-1 rounded-xl bg-black/30 p-3 font-mono text-xs">
        {lines.length === 0 && <div className="text-slate-500">chua co log</div>}
        {lines.map((l, i) => (
          <div
            key={i}
            className={
              l.kind === 'err' ? 'text-red-400' : l.kind === 'ok' ? 'text-emerald-400' : 'text-slate-300'
            }
          >
            [{l.time}] {l.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
