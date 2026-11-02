import { useEffect, useMemo, useRef, useState } from 'react';
import { getWordVisual } from '../../lib/emoji/wordVisual';
import { pickGameWords } from '../sources';
import { GameRoundDots, gameVerdictSfx } from '../mechanics';
import { specFor } from '../levels';
import { ComboMeter, HeartMeter, useCombo, useGameLives } from '../lives';
import { usePronunciationRecording } from '../../hooks/usePronunciationRecording';
import {
  scorePronunciationAttempt,
  type PronunciationScoringOptions,
} from '../../lib/rounds/pronunciationScoring';
import { speakWord } from '../../lib/speech';
import { IconClock, IconMic, IconSpeaker } from '../../components/icons';
import { EmojiVisual } from '../../components/EmojiVisual';
import type { GameProps } from '../types';
import type { VocabWord } from '../../types';

const ROUNDS = 5;

/**
 * One round's mic capture - remounted per round (`key={round}`) so the
 * hook's settled flag and phase machine always start fresh.
 */
function RoundMic({
  word,
  onAttempt,
  disabled,
}: {
  word: string;
  onAttempt: (transcript: string, options?: PronunciationScoringOptions) => void;
  /** r160-2: grey the control while the verdict shows (settled anyway). */
  disabled?: boolean;
}) {
  const { phase, startRecording, stopRecording, retry, skip, heardText } =
    usePronunciationRecording(onAttempt, word);
  // r160-2: each round's fresh mic takes keyboard focus so SR/keyboard
  // users land on the actionable control instead of losing their place.
  const micRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { micRef.current?.focus(); }, []);

  // r160-2/r162: while the verdict shows, keep the same button element
  // mounted (disabled + settled caption) - replacing it with a note
  // drops keyboard focus to the document until the next round mounts.
  if (disabled) {
    return (
      <div className="flex flex-col items-center gap-3 py-1">
        <button
          type="button"
          ref={micRef}
          data-testid="say-mic"
          aria-disabled="true"
          onClick={() => {}}
          aria-label={`Đã gửi giọng đọc của từ ${word}`}
          className="relative flex h-20 w-20 cursor-default items-center justify-center rounded-full bg-gradient-to-b from-rose-400 to-rose-600 text-white opacity-50 shadow-[inset_0_3px_0_rgba(255,255,255,0.35),0_10px_24px_-6px_rgba(244,63,94,0.5)] focus:outline-none focus:ring-4 focus:ring-rose-400"
        >
          <IconMic size={30} />
        </button>
        <p className="text-sm font-semibold text-slate-400">Đã gửi giọng đọc - sang câu tiếp…</p>
      </div>
    );
  }
  if (phase === 'unsupported') {
    return (
      <p className="max-w-xs rounded-2xl border border-white/15 bg-navy-800/70 px-5 py-4 text-center text-sm font-semibold text-slate-300">
        Trình duyệt chưa hỗ trợ nhận diện giọng nói cho trò này - quay lại chọn trò khác nhé.
      </p>
    );
  }
  if (phase === 'error' || phase === 'permission-denied') {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="max-w-xs text-center text-sm font-semibold text-slate-300">
          {phase === 'permission-denied'
            ? 'Micro đang bị chặn - bấm vào biểu tượng ổ khóa cạnh địa chỉ trang web, bật quyền Micro rồi chọn Thử lại. Hoặc Bỏ qua câu này nhé.'
            : 'Chưa nghe rõ giọng em - ra chỗ yên tĩnh, để micro gần miệng rồi đọc thật to nhé.'}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            data-testid="say-retry"
            onClick={retry}
            className="rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 px-5 py-2.5 font-bold text-amber-950 shadow transition active:scale-95 motion-reduce:transition-none focus:outline-none focus:ring-4 focus:ring-amber-300"
          >
            Thử lại
          </button>
          <button
            type="button"
            data-testid="say-skip"
            onClick={skip}
            className="rounded-2xl border-2 border-white/20 bg-navy-800/70 px-5 py-2.5 font-bold text-slate-200 transition active:scale-95 motion-reduce:transition-none focus:outline-none focus:ring-4 focus:ring-sky-400"
          >
            Bỏ qua
          </button>
        </div>
      </div>
    );
  }
  const recording = phase === 'recording';
  const processing = phase === 'processing';
  // One button element for idle/recording/processing - swapping elements
  // mid-flow drops keyboard focus (r160-2).
  return (
    <div className="flex flex-col items-center gap-3 py-1">
      <button
        type="button"
        ref={micRef}
        data-testid="say-mic"
        aria-disabled={processing || undefined}
        onClick={processing ? () => {} : recording ? stopRecording : startRecording}
        aria-label={processing
          ? `Đang chấm giọng đọc của từ ${word}`
          : recording
            ? `Đọc xong ${word} nhấn lại để chấm luôn`
            : `Nhấn rồi đọc to: ${word}`}
        className={`relative flex h-20 w-20 items-center justify-center rounded-full text-white transition hover:-translate-y-0.5 active:scale-95 motion-reduce:transition-none focus:outline-none focus:ring-4 focus:ring-rose-400 ${
          processing
            ? 'cursor-wait bg-gradient-to-b from-amber-400 to-amber-600 shadow-[inset_0_3px_0_rgba(255,255,255,0.35),0_10px_24px_-6px_rgba(245,158,11,0.5)]'
            : recording
              ? 'bg-gradient-to-b from-rose-500 to-rose-700 shadow-[inset_0_3px_0_rgba(255,255,255,0.3),0_10px_28px_-6px_rgba(244,63,94,0.6)]'
              : 'bg-gradient-to-b from-rose-400 to-rose-600 shadow-[inset_0_3px_0_rgba(255,255,255,0.35),0_10px_24px_-6px_rgba(244,63,94,0.5)]'
        }`}
      >
        {recording && (
          <span aria-hidden className="absolute -inset-1.5 animate-pulse rounded-full border-4 border-rose-400/50 motion-reduce:hidden" />
        )}
        {processing ? (
          <IconClock size={30} className="animate-pulse motion-reduce:animate-none" />
        ) : recording ? (
          <span className="flex items-end gap-1" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="audio-bars h-6 w-1.5 rounded-full bg-white/90" style={{ animationDelay: `${i * 130}ms` }} />
            ))}
          </span>
        ) : (
          <IconMic size={30} />
        )}
      </button>
      <p className="text-sm font-semibold text-slate-300">
        {processing ? 'Đang chấm giọng em...' : recording ? 'Đọc xong nhấn lại để chấm luôn' : 'Nhấn mic rồi đọc to lên'}
      </p>
      {recording && heardText && (
        <p data-testid="say-heard" className="text-sm italic text-amber-300">Nghe thấy: {heardText}</p>
      )}
    </div>
  );
}

/**
 * CR-120 Game - Đọc to nào: the word card + "Nghe mẫu" speaker prompt,
 * the mic captures one attempt, `scorePronunciationAttempt` judges it
 * (>=70 passes, same rule as the batch round). Covers speaking - the
 * skill every pronunciation-first competitor sells and the one no
 * Game Zone entry exercised. Skip (mic trouble) advances with no
 * credit and no life loss; a scored miss costs a heart.
 */
export default function SayItLoud({ grade, seed, level, onEnd }: GameProps) {
  const spec = specFor(level, ROUNDS);
  const words = useMemo(
    () => pickGameWords(grade.id, seed, spec.rounds),
    [grade.id, seed, spec.rounds],
  );
  const [round, setRound] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; score: number; ok: boolean } | null>(null);
  const lives = useGameLives(spec.lives);
  const combo = useCombo();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const word: VocabWord | undefined = words[Math.min(round, words.length - 1)];
  if (!word) return null;
  const visual = getWordVisual(word.id);

  const advance = (newCorrect: number) => {
    if (round + 1 >= words.length) {
      onEnd({ points: newCorrect, maxPoints: words.length, correctCount: newCorrect, attempted: words.length });
      return;
    }
    setRound(round + 1);
    setFeedback(null);
  };

  const handleAttempt = (transcript: string, options?: PronunciationScoringOptions) => {
    // 'Bỏ qua' / empty transcript - mic trouble is not the child's fault:
    // the round passes with no credit and no heart lost.
    if (!transcript) {
      advance(correctCount);
      return;
    }
    // r160-1: local scoring only - a present serverScore would raise the
    // pass bar from 70 to 90 (assess mode), quietly re-tuning the game's
    // difficulty against the approved scope.
    void options;
    const { score, isCorrect } = scorePronunciationAttempt(word.word, transcript);
    gameVerdictSfx(isCorrect);
    setFeedback({ text: transcript, score, ok: isCorrect });
    if (isCorrect) combo.hit(); else combo.miss();
    const newCorrect = correctCount + (isCorrect ? 1 : 0);
    setCorrectCount(newCorrect);
    if (!isCorrect && lives.lose() <= 0) {
      timerRef.current = setTimeout(
        () => onEnd({ points: newCorrect, maxPoints: words.length, correctCount: newCorrect, attempted: round + 1 }),
        1100,
      );
      return;
    }
    timerRef.current = setTimeout(() => advance(newCorrect), 1100);
  };

  return (
    <div data-testid="game-say-it-loud" className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-4">
        <GameRoundDots total={words.length} done={round} />
        <HeartMeter lives={lives.lives} max={lives.max} />
        <ComboMeter streak={combo.streak} />
      </div>
      <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-200/70 bg-gradient-to-b from-amber-50 to-orange-100 px-5 py-3 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.55)]">
        <EmojiVisual emoji={visual?.emoji ?? '❓'} imageUrl={visual?.imageUrl} animated variant="block" className="text-5xl" />
        <span className="font-display text-3xl font-extrabold tracking-wide text-slate-800">{word.word}</span>
        <button
          type="button"
          data-testid="say-model"
          onClick={() => speakWord(word.word)}
          aria-label={`Nghe mẫu từ ${word.word}`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b from-amber-400 to-amber-600 text-white shadow transition hover:-translate-y-0.5 active:scale-95 motion-reduce:transition-none focus:outline-none focus:ring-4 focus:ring-amber-400"
        >
          <IconSpeaker size={18} />
        </button>
      </div>
      {/* r160-2: persistent live region announces the verdict while the
          mic stays mounted - unmounting it mid-run dropped keyboard
          focus and screen-reader users missed the result entirely. */}
      <p
        role="status"
        aria-live="polite"
        data-testid="say-feedback"
        className={`min-h-7 text-lg font-extrabold ${feedback ? (feedback.ok ? 'text-emerald-300' : 'text-rose-300') : 'sr-only'}`}
      >
        {feedback ? (feedback.ok ? 'Chuẩn lắm!' : `Nghe thấy "${feedback.text}" - ${feedback.score} điểm`) : ''}
      </p>
      <RoundMic key={`${word.id}-${round}`} word={word.word} onAttempt={handleAttempt} disabled={!!feedback} />
    </div>
  );
}
