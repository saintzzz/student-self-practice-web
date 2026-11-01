import { useEffect, useMemo, useRef, useState } from 'react';
import type { ExamProgramId } from '../types/exam';
import { GRADES } from '../data/grades';
import { createExamFromBank } from '../lib/qb/bank';
import {
  ROSTER_STORAGE_KEY,
  SAMPLE_QUESTIONS,
  SAMPLE_ROSTER,
  SHOW_POINTS,
  normalizeShowQuestion,
  parseRoster,
  pickStudent,
  podiumOrder,
  type ShowQuestion,
} from '../lib/classshow';
import { playGentleWrong, playSfx } from '../lib/sfx';
import Confetti from './celebrations/Confetti';
import { IconCheck, IconPlay, IconStar, IconTrophy, IconX } from './icons';
import {
  CARD, CHIP_EMERALD, CHIP_GOLD, CHIP_SKY, CTA_GOLD_XL,
  H2, NAV_PILL_SM, SCREEN_ENTER, TYPE_SECTION_NAVY,
} from '../lib/ui/tokens';

/** CR-114: Sân khấu lớp - teacher-led, one screen for the whole class.
 *  Learned from Questora's classroom model: the teacher projects this,
 *  students answer aloud, the teacher taps the verdict. Zero student
 *  devices needed; works for guests too (sample roster + public bank). */

const PROGRAMS: readonly { id: ExamProgramId; name: string; emoji: string }[] = [
  { id: 'english', name: 'Tiếng Anh', emoji: '🔤' },
  { id: 'math', name: 'Toán tiếng Anh', emoji: '🔢' },
  { id: 'science', name: 'Khoa học', emoji: '🔬' },
];

const QUESTION_COUNTS = [8, 12, 16] as const;
const AVATARS = ['🦊', '🐰', '🐼', '🐯', '🦁', '🐸', '🐵', '🐨', '🦄', '🐷', '🐔', '🐙', '🦉', '🐝', '🦖', '🐳'];

type Phase = 'setup' | 'loading' | 'spotlight' | 'question' | 'revealed' | 'podium';

interface Player { name: string; score: number; }

export default function ClassShowScreen({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [gradeId, setGradeId] = useState('grade-3');
  const [programId, setProgramId] = useState<ExamProgramId>('english');
  const [count, setCount] = useState<number>(8);
  const [rosterText, setRosterText] = useState(() => {
    try { return localStorage.getItem(ROSTER_STORAGE_KEY) ?? SAMPLE_ROSTER.join(', '); } catch { return SAMPLE_ROSTER.join(', '); }
  });
  const [questions, setQuestions] = useState<ShowQuestion[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState(-1);
  const [spotName, setSpotName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const lastPicked = useRef(-1);
  const spotTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const roster = useMemo(() => parseRoster(rosterText), [rosterText]);
  const question = questions[qIndex];
  const leader = useMemo(() => players.reduce((m, p) => Math.max(m, p.score), 0), [players]);

  useEffect(() => () => { if (spotTimer.current) clearInterval(spotTimer.current); }, []);

  async function start() {
    if (roster.length < 2) { setError('Cần ít nhất 2 học sinh để mở sân khấu.'); return; }
    setError(null);
    setPhase('loading');
    try { localStorage.setItem(ROSTER_STORAGE_KEY, rosterText); } catch { /* ignore */ }
    let shows: ShowQuestion[] = [];
    try {
      const state = await createExamFromBank(programId, gradeId, { count: count * 3, mode: 'practice' });
      shows = (state?.questions ?? []).map(normalizeShowQuestion)
        .filter((q): q is ShowQuestion => q !== null).slice(0, count);
    } catch { /* bank unreachable - fall through to the bundled set */ }
    if (shows.length < 4) {
      /* A classroom show must not die on flaky wifi or a guest challenge
         miss - shuffle the bundled set instead of blocking the lesson. */
      shows = [...SAMPLE_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, count);
    }
    setQuestions(shows);
    setPlayers(roster.map((name) => ({ name, score: 0 })));
    setQIndex(0);
    lastPicked.current = -1;
    spin();
  }

  function spin() {
    setPhase('spotlight');
    const names = roster.length ? roster : SAMPLE_ROSTER;
    let ticks = 0;
    spotTimer.current = setInterval(() => {
      ticks += 1;
      setSpotName(names[Math.floor(Math.random() * names.length)]);
      if (ticks >= 16) {
        if (spotTimer.current) clearInterval(spotTimer.current);
        const idx = pickStudent(names, lastPicked.current, Math.random);
        lastPicked.current = idx;
        setPicked(idx);
        setSpotName(names[idx]);
        playSfx('flip');
        setPhase('question');
      }
    }, 80);
  }

  function verdict(correct: boolean) {
    if (phase !== 'revealed' && phase !== 'question') return;
    if (correct) {
      playSfx('correct');
      setPlayers((ps) => ps.map((p, i) => (i === picked ? { ...p, score: p.score + SHOW_POINTS } : p)));
    } else {
      playGentleWrong();
    }
    if (qIndex + 1 >= questions.length) {
      setPhase('podium');
      playSfx('star');
    } else {
      setQIndex((i) => i + 1);
      spin();
    }
  }

  // Projector keyboard: Space/Enter reveals or picks, → Đúng, ← Sai.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'question' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); setPhase('revealed'); }
      else if (phase === 'revealed' && (e.key === 'ArrowRight' || e.key === 'Enter')) verdict(true);
      else if (phase === 'revealed' && e.key === 'ArrowLeft') verdict(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qIndex, picked, questions.length]);

  const podium = useMemo(() => podiumOrder(players), [players]);

  return (
    <div className={`${SCREEN_ENTER} mx-auto w-full max-w-5xl px-4 pb-10`} data-testid="class-show">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={onBack} className={NAV_PILL_SM} data-testid="class-show-back">
          ← Quay lại
        </button>
        <span className={CHIP_GOLD}>🎤 Sân khấu lớp</span>
      </div>

      {phase === 'setup' || phase === 'loading' ? (
        <div className={`${CARD} space-y-6`}>
          <div>
            <p className={TYPE_SECTION_NAVY}>Cả lớp chơi trên một màn hình</p>
            <h1 className={H2}>Chiếu màn này lên lớp - em nào được gọi sẽ trả lời!</h1>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-sky-200">Lớp</p>
            <div className="flex flex-wrap gap-2">
              {GRADES.map((g) => (
                <button key={g.id} type="button" data-testid={`show-grade-${g.id}`}
                  onClick={() => setGradeId(g.id)}
                  className={`rounded-full px-5 py-2.5 text-base font-bold ring-1 transition ${gradeId === g.id ? 'bg-amber-300 text-amber-950 ring-amber-200' : 'bg-white/10 text-amber-100 ring-white/15 hover:bg-white/15'}`}>
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-sky-200">Môn</p>
            <div className="flex flex-wrap gap-2">
              {PROGRAMS.map((p) => (
                <button key={p.id} type="button" data-testid={`show-program-${p.id}`}
                  onClick={() => setProgramId(p.id)}
                  className={`rounded-full px-5 py-2.5 text-base font-bold ring-1 transition ${programId === p.id ? 'bg-amber-300 text-amber-950 ring-amber-200' : 'bg-white/10 text-amber-100 ring-white/15 hover:bg-white/15'}`}>
                  {p.emoji} {p.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-sky-200">Số câu hỏi</p>
            <div className="flex gap-2">
              {QUESTION_COUNTS.map((n) => (
                <button key={n} type="button" data-testid={`show-count-${n}`}
                  onClick={() => setCount(n)}
                  className={`rounded-full px-5 py-2.5 text-base font-bold ring-1 transition ${count === n ? 'bg-amber-300 text-amber-950 ring-amber-200' : 'bg-white/10 text-amber-100 ring-white/15 hover:bg-white/15'}`}>
                  {n} câu
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-sky-200">
              Danh sách học sinh <span className="font-normal text-sky-300/80">(cách nhau bởi dấu phẩy - {roster.length} em)</span>
            </p>
            <textarea
              data-testid="show-roster"
              value={rosterText}
              onChange={(e) => setRosterText(e.target.value)}
              rows={3}
              className="w-full rounded-2xl bg-white/10 p-4 text-lg font-semibold text-amber-50 ring-1 ring-white/15 placeholder:text-sky-300/50 focus:outline-none focus:ring-2 focus:ring-amber-300"
              placeholder="Minh Anh, Bảo Nam, Khánh Linh..."
            />
            <button type="button" onClick={() => setRosterText(SAMPLE_ROSTER.join(', '))}
              className="mt-2 text-sm font-bold text-sky-300 underline underline-offset-2 hover:text-sky-200">
              Dùng lớp mẫu 8 em
            </button>
          </div>

          {error && <p className="rounded-xl bg-rose-500/15 px-4 py-3 text-base font-bold text-rose-200 ring-1 ring-rose-400/40">{error}</p>}

          <button type="button" data-testid="show-start" onClick={start} disabled={phase === 'loading'}
            className={`${CTA_GOLD_XL} w-full ${phase === 'loading' ? 'opacity-60' : ''}`}>
            {phase === 'loading' ? 'Đang lấy câu hỏi...' : '🎬 Bắt đầu buổi diễn'}
          </button>
        </div>
      ) : null}

      {(phase === 'spotlight' || phase === 'question' || phase === 'revealed') && question ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <span className={CHIP_SKY}>Câu {qIndex + 1}/{questions.length}</span>
            <span className={CHIP_EMERALD}>+{SHOW_POINTS} điểm</span>
          </div>

          {/* Spotlight card - who answers */}
          <div className={`${CARD} relative overflow-hidden py-8 text-center`}>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.18),transparent_65%)]" />
            <p className={`${TYPE_SECTION_NAVY} relative`}>Em trả lời</p>
            <p data-testid="show-spotlight"
              className={`relative font-display text-5xl font-extrabold tracking-tight sm:text-6xl ${phase === 'spotlight' ? 'animate-pulse text-amber-200/80' : 'text-amber-300'}`}>
              {spotName || '...'}
            </p>
          </div>

          {/* Question stage */}
          {phase !== 'spotlight' ? (
            <div className={`${CARD} space-y-5`}>
              {question.subPrompt && (
                <p className="rounded-2xl bg-white/5 px-5 py-4 text-lg leading-relaxed text-sky-100 ring-1 ring-white/10">
                  {question.subPrompt}
                </p>
              )}
              {question.imageUrl && (
                <img src={question.imageUrl} alt="" className="mx-auto max-h-44 rounded-2xl ring-1 ring-white/15" />
              )}
              <p data-testid="show-question" className="text-center font-display text-3xl font-extrabold leading-snug text-white sm:text-4xl">
                {question.prompt}
              </p>

              {question.kind === 'choice' && question.options ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {question.options.map((opt, i) => {
                    const isCorrect = phase === 'revealed' && i === question.correctIndex;
                    return (
                      <div key={i} data-testid={`show-option-${i}`}
                        className={`flex items-center gap-4 rounded-2xl px-5 py-4 text-2xl font-bold ring-2 transition ${isCorrect ? 'bg-emerald-400/25 text-emerald-200 ring-emerald-300' : 'bg-white/5 text-amber-50 ring-white/10'}`}>
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl font-extrabold ${isCorrect ? 'bg-emerald-300 text-emerald-950' : 'bg-white/10 text-amber-200'}`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        {opt}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {question.kind === 'bool' ? (
                <div className="grid grid-cols-2 gap-3">
                  {[true, false].map((v) => {
                    const isCorrect = phase === 'revealed' && v === question.boolAnswer;
                    return (
                      <div key={String(v)} data-testid={`show-bool-${v}`}
                        className={`rounded-2xl px-5 py-5 text-center text-3xl font-extrabold ring-2 ${isCorrect ? 'bg-emerald-400/25 text-emerald-200 ring-emerald-300' : 'bg-white/5 text-amber-50 ring-white/10'}`}>
                        {v ? 'ĐÚNG ✓' : 'SAI ✗'}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {question.kind === 'reveal' && phase === 'revealed' ? (
                <p data-testid="show-reveal" className="rounded-2xl bg-emerald-400/20 px-5 py-5 text-center font-display text-4xl font-extrabold text-emerald-200 ring-2 ring-emerald-300/50">
                  {question.revealText}
                </p>
              ) : null}

              {/* Teacher controls */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {phase === 'question' ? (
                  <button type="button" data-testid="show-reveal-btn" onClick={() => setPhase('revealed')}
                    className={CTA_GOLD_XL}>
                    <IconPlay size={22} className="mr-2" /> Hiện đáp án
                  </button>
                ) : (
                  <>
                    <button type="button" data-testid="show-wrong" onClick={() => verdict(false)}
                      className="inline-flex min-h-[64px] items-center justify-center gap-2 rounded-3xl bg-rose-500/20 px-8 text-2xl font-extrabold text-rose-200 ring-2 ring-rose-400/40 transition hover:bg-rose-500/30 active:scale-95">
                      <IconX size={26} /> Sai
                    </button>
                    <button type="button" data-testid="show-correct" onClick={() => verdict(true)}
                      className="inline-flex min-h-[64px] items-center justify-center gap-2 rounded-3xl bg-emerald-500/25 px-8 text-2xl font-extrabold text-emerald-200 ring-2 ring-emerald-300/50 transition hover:bg-emerald-500/35 active:scale-95">
                      <IconCheck size={26} /> Đúng +{SHOW_POINTS}
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {/* Racer scoreboard */}
          <div className={`${CARD} space-y-2`}>
            {players.map((p, i) => (
              <div key={p.name} data-testid={`show-player-${i}`}
                className={`flex items-center gap-3 rounded-xl px-3 py-1.5 transition ${i === picked && phase !== 'spotlight' ? 'bg-amber-400/15 ring-1 ring-amber-300/40' : ''}`}>
                <span className="w-8 text-center text-xl">{AVATARS[i % AVATARS.length]}</span>
                <span className={`w-32 truncate text-base font-bold ${i === picked ? 'text-amber-300' : 'text-amber-100'}`}>{p.name}</span>
                <div className="h-4 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-[width] duration-500 motion-reduce:transition-none"
                    style={{ width: `${leader > 0 ? Math.max(4, (p.score / Math.max(leader, 1)) * 100) : 2}%` }} />
                </div>
                <span className="w-14 text-right font-display text-lg font-extrabold text-amber-200">{p.score}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {phase === 'podium' ? (
        <div className={`${CARD} relative overflow-hidden text-center`}>
          <Confetti big />
          <IconTrophy size={56} className="mx-auto mb-3 text-amber-300" />
          <h2 className="mb-6 font-display text-4xl font-extrabold text-white">Bảng vinh danh</h2>
          <div className="mx-auto flex max-w-lg items-end justify-center gap-4">
            {[1, 0, 2].map((real) => {
              const player = podium[real];
              if (!player) return null;
              const height = real === 0 ? 'h-36' : real === 1 ? 'h-24' : 'h-16';
              const gradient = real === 0 ? 'from-amber-300 to-amber-600' : real === 1 ? 'from-slate-300 to-slate-500' : 'from-orange-300 to-orange-600';
              return (
                <div key={player.name} data-testid={`show-podium-${real}`} className="flex flex-col items-center">
                  <span className="mb-2 text-4xl">{real === 0 ? '🥇' : real === 1 ? '🥈' : '🥉'}</span>
                  <span className="mb-1 flex items-center gap-1 font-display text-2xl font-extrabold text-amber-200">
                    <IconStar size={18} /> {player.score}
                  </span>
                  <div className={`flex w-28 items-start justify-center rounded-t-2xl bg-gradient-to-b ${gradient} ${height} px-2 pt-3`}>
                    <span className="text-center text-base font-extrabold leading-tight text-slate-900">{player.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" data-testid="show-again" onClick={() => { setPhase('setup'); }} className={CTA_GOLD_XL}>
              Diễn lại từ đầu
            </button>
            <button type="button" onClick={onBack} className={NAV_PILL_SM}>
              Về trang chủ
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
