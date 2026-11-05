import { useEffect, useMemo, useRef, useState } from 'react';
import { speakSentence, stopAllAudio } from '../../lib/speech';
import { usePronunciationRecording } from '../../hooks/usePronunciationRecording';
import { scorePronunciationAttempt } from '../../lib/rounds/pronunciationScoring';
import { gameVerdictSfx, GameRoundDots } from '../mechanics';
import { IconMic, IconSpeaker } from '../../components/icons';
import { storiesForGrade, type Story } from '../stories';
import type { GameProps } from '../types';

type Phase = 'pick' | 'read' | 'quiz' | 'mic';
const QUIZ_POINTS = 10;
const MIC_POINTS = 10;

/**
 * One-tap mic for the read-aloud round - same contract as SayItLoud's
 * RoundMic: persistent button (never unmounts mid-flow, keeps focus),
 * retry/skip, verdict by scorePronunciationAttempt on the sentence.
 */
function ReadAloudMic({
  sentence,
  onResult,
}: {
  sentence: string;
  onResult: (hit: boolean, score: number, heard: string) => void;
}) {
  const [settled, setSettled] = useState(false);
  const { phase, startRecording, stopRecording, retry, skip, heardText } =
    usePronunciationRecording((transcript) => {
      const { score, isCorrect } = scorePronunciationAttempt(sentence, transcript);
      gameVerdictSfx(isCorrect);
      setSettled(true);
      onResult(isCorrect, score, transcript);
    }, sentence);
  const micRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { micRef.current?.focus(); }, []);
  const recording = phase === 'recording';
  const processing = phase === 'processing';

  if (settled) {
    return (
      <button
        type="button"
        ref={micRef}
        aria-disabled="true"
        data-testid="story-mic"
        aria-label="Đã gửi giọng đọc"
        className="relative flex h-20 w-20 cursor-default items-center justify-center rounded-full bg-gradient-to-b from-rose-400 to-rose-600 text-white opacity-50 shadow-[inset_0_3px_0_rgba(255,255,255,0.35),0_10px_24px_-6px_rgba(244,63,94,0.5)] focus:outline-none focus:ring-4 focus:ring-rose-400"
      >
        <IconMic size={30} />
      </button>
    );
  }
  if (phase === 'unsupported') {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="max-w-xs rounded-2xl border border-white/15 bg-navy-800/70 px-5 py-4 text-center text-sm font-semibold text-slate-300">
          Trình duyệt chưa hỗ trợ micro cho phần này - bấm Bỏ qua để xem điểm nhé.
        </p>
        <button type="button" onClick={skip} data-testid="story-mic-skip"
          className="rounded-2xl bg-gradient-to-b from-sky-400 to-sky-600 px-5 py-2.5 text-sm font-extrabold text-white shadow transition hover:-translate-y-0.5 active:scale-95">
          Bỏ qua
        </button>
      </div>
    );
  }
  if (phase === 'error' || phase === 'permission-denied') {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="max-w-xs text-center text-sm font-semibold text-slate-300">
          {phase === 'permission-denied'
            ? 'Micro đang bị chặn - bật quyền Micro cho trang này rồi chọn Thử lại, hoặc Bỏ qua câu này.'
            : 'Chưa nghe rõ giọng em - ra chỗ yên tĩnh rồi đọc thật to nhé.'}
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={retry} data-testid="story-mic-retry"
            className="rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 py-2.5 text-sm font-extrabold text-white shadow transition hover:-translate-y-0.5 active:scale-95">
            Thử lại
          </button>
          <button type="button" onClick={skip} data-testid="story-mic-skip"
            className="rounded-2xl bg-gradient-to-b from-sky-400 to-sky-600 px-5 py-2.5 text-sm font-extrabold text-white shadow transition hover:-translate-y-0.5 active:scale-95">
            Bỏ qua
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        ref={micRef}
        data-testid="story-mic"
        aria-label={`Nhấn rồi đọc to câu: ${sentence}`}
        onClick={processing ? () => {} : recording ? stopRecording : startRecording}
        className={`relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-[inset_0_3px_0_rgba(255,255,255,0.35),0_10px_24px_-6px_rgba(244,63,94,0.5)] transition focus:outline-none focus:ring-4 focus:ring-rose-400 ${
          recording
            ? 'animate-pulse bg-gradient-to-b from-rose-500 to-rose-700'
            : 'bg-gradient-to-b from-rose-400 to-rose-600 hover:-translate-y-0.5 active:scale-95'
        }`}
      >
        <IconMic size={30} />
      </button>
      <p aria-live="polite" className="min-h-5 text-center text-sm font-semibold text-sky-200" data-testid="story-mic-live">
        {recording
          ? heardText
            ? `Nghe thấy: "${heardText}"`
            : 'Đang nghe - đọc to lên nhé'
          : processing
            ? 'Đang chấm…'
            : 'Nhấn mic rồi đọc to câu truyện'}
      </p>
    </div>
  );
}

/**
 * CR-126 - "Doc truyen": leveled reading track (Raz-Kids Level Up /
 * Little Fox story-as-container). Pick a story -> read with TTS karaoke
 * (listen-all or tap a sentence) -> 3 comprehension MCQs -> read-aloud
 * mic round on the story's key sentence. Score = 3x10 quiz + 10 mic.
 */
export default function StoryTime({ grade, seed, level = 1, onEnd }: GameProps) {
  const stories = useMemo(() => storiesForGrade(grade.id), [grade.id]);
  /* Level ladder = reading scaffold, Raz-Kids-style: Man 1 full audio
     support (listen-all + tap-to-hear), Man 2 keeps per-sentence audio,
     Man 3 removes TTS entirely - pure independent reading. */
  const canHear = level <= 2;
  const canPlayAll = level === 1;
  const [phase, setPhase] = useState<Phase>('pick');
  const [story, setStory] = useState<Story | null>(null);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [playingAll, setPlayingAll] = useState(false);
  const [quizIdx, setQuizIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [micResult, setMicResult] = useState<{ hit: boolean; score: number; heard: string } | null>(null);
  const liveRef = useRef(true);
  /* playGen retires every in-flight status callback whenever a new play
     starts or playback is stopped - a stale 'ended' (e.g. Safari firing
     end-on-cancel, or a paused-then-replayed cached mp3) can then never
     advance the highlight onto the wrong sentence. */
  const playingAllRef = useRef(false);
  const playGenRef = useRef(0);
  useEffect(() => {
    /* StrictMode double-mount: the cleanup below flips liveRef false on
       the simulated unmount - the effect body must restore it or every
       deferred callback (quiz reveal, onEnd) dies silently in dev. */
    liveRef.current = true;
    return () => {
      liveRef.current = false;
      playGenRef.current += 1;
      stopAllAudio();
    };
  }, []);
  void seed;

  function stopPlayback() {
    playingAllRef.current = false;
    setPlayingAll(false);
    playGenRef.current += 1;
    setPlayingIdx(null);
    stopAllAudio();
  }

  function playSentence(idx: number, thenAll = false) {
    if (!story) return;
    if (!thenAll) {
      playingAllRef.current = false;
      setPlayingAll(false);
    }
    const gen = ++playGenRef.current;
    setPlayingIdx(idx);
    speakSentence(story.sentences[idx], (st) => {
      if (st !== 'ended' && st !== 'error' && st !== 'unsupported') return;
      if (!liveRef.current || gen !== playGenRef.current) return;
      if (thenAll && playingAllRef.current && idx + 1 < story.sentences.length) {
        playSentence(idx + 1, true);
      } else {
        setPlayingIdx(null);
        if (thenAll) {
          playingAllRef.current = false;
          setPlayingAll(false);
        }
      }
    });
  }

  function playAll() {
    if (!story || playingAllRef.current) return;
    playingAllRef.current = true;
    setPlayingAll(true);
    playSentence(0, true);
  }

  function pick(st: Story) {
    setStory(st);
    setPhase('read');
  }

  function answerQuiz(i: number) {
    if (picked !== null || !story) return;
    setPicked(i);
    const ok = i === story.quiz[quizIdx].correct;
    gameVerdictSfx(ok);
    const newCorrect = quizCorrect + (ok ? 1 : 0);
    setTimeout(() => {
      if (!liveRef.current) return;
      setPicked(null);
      setQuizCorrect(newCorrect);
      if (quizIdx + 1 < story.quiz.length) setQuizIdx(quizIdx + 1);
      else setPhase('mic');
    }, 700);
  }

  function finishMic(hit: boolean, score: number, heard: string) {
    setMicResult({ hit, score, heard });
    const cc = quizCorrect + (hit ? 1 : 0);
    setTimeout(() => {
      if (!liveRef.current) return;
      onEnd({
        points: quizCorrect * QUIZ_POINTS + (hit ? MIC_POINTS : 0),
        maxPoints: story!.quiz.length * QUIZ_POINTS + MIC_POINTS,
        correctCount: cc,
        attempted: story!.quiz.length + 1,
      });
    }, 1400);
  }

  function skipMic() {
    const cc = quizCorrect;
    onEnd({
      points: quizCorrect * QUIZ_POINTS,
      maxPoints: story!.quiz.length * QUIZ_POINTS + MIC_POINTS,
      correctCount: cc,
      attempted: story!.quiz.length,
    });
  }

  if (phase === 'pick') {
    return (
      <div className="flex w-full max-w-md flex-col gap-3" data-testid="story-pick">
        <p className="text-center text-lg font-extrabold text-amber-100">Chọn một câu chuyện</p>
        {stories.map((st) => (
          <button
            key={st.id}
            type="button"
            data-testid={`story-pick-${st.id}`}
            onClick={() => pick(st)}
            className="flex items-center gap-4 rounded-3xl border border-white/10 bg-navy-800/80 px-5 py-4 text-left shadow-lg transition hover:-translate-y-0.5 hover:border-amber-300/50 focus:outline-none focus:ring-4 focus:ring-amber-400"
          >
            <span className="text-4xl" aria-hidden>{st.emoji}</span>
            <span className="min-w-0">
              <span className="block truncate text-base font-extrabold text-amber-100">{st.titleVi}</span>
              <span className="block truncate text-sm font-semibold text-slate-300">{st.titleEn} · {st.sentences.length} câu</span>
            </span>
          </button>
        ))}
      </div>
    );
  }

  if (phase === 'read' && story) {
    return (
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-3xl border border-white/10 bg-navy-800/80 p-5 shadow-xl" data-testid="story-read">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-extrabold text-amber-100">{story.titleVi}</p>
            <p className="text-sm font-semibold text-slate-400">{story.titleEn}</p>
          </div>
          {canPlayAll && (
            <button
              type="button"
              data-testid="story-play-all"
              onClick={playingAll ? stopPlayback : playAll}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-extrabold text-white shadow transition hover:-translate-y-0.5 active:scale-95 ${
                playingAll ? 'bg-gradient-to-b from-rose-400 to-rose-600' : 'bg-gradient-to-b from-sky-400 to-sky-600'
              }`}
            >
              <IconSpeaker size={16} />
              {playingAll ? 'Dừng' : 'Nghe cả truyện'}
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {story.sentences.map((s, i) =>
            canHear ? (
              <button
                key={i}
                type="button"
                data-testid={`story-sentence-${i}`}
                onClick={() => playSentence(i)}
                aria-label={`Nghe câu: ${s}`}
                className={`rounded-2xl px-4 py-2.5 text-left text-base font-semibold leading-relaxed transition focus:outline-none focus:ring-4 focus:ring-amber-400 ${
                  playingIdx === i
                    ? 'bg-amber-400/90 text-navy-900'
                    : 'bg-white/5 text-slate-100 hover:bg-white/10'
                }`}
              >
                {s}
              </button>
            ) : (
              <p
                key={i}
                data-testid={`story-sentence-${i}`}
                className="rounded-2xl bg-white/5 px-4 py-2.5 text-left text-base font-semibold leading-relaxed text-slate-100"
              >
                {s}
              </p>
            ),
          )}
        </div>
        <button
          type="button"
          data-testid="story-to-quiz"
          onClick={() => { stopPlayback(); setPhase('quiz'); }}
          className="rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 py-3 text-base font-extrabold text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.15)] transition hover:-translate-y-0.5 active:scale-95 focus:outline-none focus:ring-4 focus:ring-emerald-400"
        >
          Đọc xong - làm quiz
        </button>
      </div>
    );
  }

  if (phase === 'quiz' && story) {
    const q = story.quiz[quizIdx];
    return (
      <div className="flex w-full max-w-md flex-col gap-4 rounded-3xl border border-white/10 bg-navy-800/80 p-5 shadow-xl" data-testid="story-quiz">
        <GameRoundDots done={quizIdx} total={story.quiz.length} />
        <p className="text-center text-lg font-extrabold text-amber-100">{q.question}</p>
        {q.options.map((opt, i) => {
          const isPicked = picked === i;
          const isRight = picked !== null && i === q.correct;
          const isWrong = isPicked && i !== q.correct;
          return (
            <button
              key={i}
              type="button"
              data-testid={`story-option-${i}`}
              disabled={picked !== null}
              onClick={() => answerQuiz(i)}
              className={`rounded-2xl px-5 py-3 text-left text-base font-bold shadow transition focus:outline-none focus:ring-4 focus:ring-sky-400 ${
                isRight
                  ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white'
                  : isWrong
                    ? 'bg-gradient-to-b from-rose-400 to-rose-600 text-white opacity-80'
                    : 'bg-white/90 text-navy-900 hover:-translate-y-0.5'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (phase === 'mic' && story) {
    const sentence = story.sentences[story.readAloudIdx];
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-white/10 bg-navy-800/80 p-5 shadow-xl" data-testid="story-mic-phase">
        <p className="text-center text-lg font-extrabold text-amber-100">Đọc to câu này</p>
        <p className="rounded-2xl bg-amber-400/90 px-5 py-3 text-center text-lg font-extrabold text-navy-900" data-testid="story-mic-target">
          {sentence}
        </p>
        {canHear && (
          <button
            type="button"
            data-testid="story-mic-listen"
            onClick={() => playSentence(story.readAloudIdx)}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-b from-sky-400 to-sky-600 px-4 py-2 text-sm font-extrabold text-white shadow transition hover:-translate-y-0.5 active:scale-95"
          >
            <IconSpeaker size={16} /> Nghe mẫu
          </button>
        )}
        {micResult ? (
          <div aria-live="polite" className="flex flex-col items-center gap-2">
            <p className={`text-xl font-extrabold ${micResult.hit ? 'text-emerald-300' : 'text-amber-300'}`} data-testid="story-mic-verdict">
              {micResult.hit ? 'Chuẩn lắm!' : `Nghe thấy "${micResult.heard || '...'}" - ${micResult.score} điểm`}
            </p>
            <p className="text-sm font-semibold text-slate-400">Đang tính điểm…</p>
          </div>
        ) : (
          <ReadAloudMic sentence={sentence} onResult={finishMic} />
        )}
        {!micResult && (
          <button type="button" onClick={skipMic} data-testid="story-mic-skip-phase"
            className="text-sm font-bold text-slate-400 underline underline-offset-2 transition hover:text-slate-200">
            Bỏ qua phần đọc
          </button>
        )}
      </div>
    );
  }
  return null;
}
