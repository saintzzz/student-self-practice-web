import { useEffect, useMemo, useRef, useState } from 'react';
import { GRADES } from '../data/vocabulary';
import ActiveRoundQuestion from './ActiveRoundQuestion';
import {
  buildPlacementSession,
  computePlacement,
  QUESTIONS_PER_GRADE,
} from '../lib/placement';
import { savePlacementResult } from '../lib/practiceResults';
import {
  advanceToNextQuestion,
  isSessionComplete,
  submitOptionAnswer,
  type PracticeSessionState,
} from '../lib/practiceSession';
import { BODY, CARD, H1, NAV_PILL, SCREEN_ENTER } from '../lib/ui/tokens';

const BTN =
  'rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 py-3 text-base font-extrabold text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.15),0_3px_8px_-3px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus:outline-none focus:ring-4 focus:ring-emerald-400';

interface PlacementScreenProps {
  /** Dang nhap (student) thi luu ket qua placement; guest chi xem goi y. */
  isLoggedIn: boolean;
  onStartGrade: (gradeId: string) => void;
  onBack: () => void;
}

/**
 * CR-23: bai kiem tra dau vao - 15 cau image-choice tang dan theo lop
 * 1->5, goi y lop bat dau luyen tap. Tai dung QuestionCard de giong
 * trai nghiem choi thuong.
 */
export default function PlacementScreen({ isLoggedIn, onStartGrade, onBack }: PlacementScreenProps) {
  const seed = useMemo(() => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, []);
  const [state, setState] = useState<{ session: PracticeSessionState; questionGradeIds: string[] }>(() =>
    buildPlacementSession(seed),
  );

  const done = isSessionComplete(state.session);
  const placement = done ? computePlacement(state.session, state.questionGradeIds) : null;
  const savedRef = useRef(false);
  useEffect(() => {
    if (done && placement && isLoggedIn && !savedRef.current) {
      savedRef.current = true;
      const totalCorrect = placement.correctByGrade.reduce((a, b) => a + b, 0);
      void savePlacementResult(
        placement.recommendedGradeId,
        totalCorrect,
        state.session.questions.length,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  function handleSubmitOption(index: number): void {
    setState((s) => ({ ...s, session: submitOptionAnswer(s.session, index) }));
  }

  function handleNext(): void {
    setState((s) => ({ ...s, session: advanceToNextQuestion(s.session) }));
  }

  if (done && placement) {
    const recommended = GRADES.find((g) => g.id === placement.recommendedGradeId) ?? GRADES[0];
    const totalCorrect = placement.correctByGrade.reduce((a, b) => a + b, 0);
    return (
      <div className={`mx-auto max-w-xl px-4 py-8 text-center ${SCREEN_ENTER}`}>
        <div className={CARD}>
          <h1 className={H1} data-testid="placement-result-title">
            Con nên bắt đầu từ {recommended.name}
          </h1>
          <p className={`mt-2 ${BODY}`}>
            Con trả lời đúng {totalCorrect}/{state.session.questions.length} câu.
          </p>
          <ul data-testid="placement-breakdown" className="mx-auto mt-4 flex max-w-sm flex-col gap-2 text-left">
            {GRADES.map((g, i) => (
              <li key={g.id} className="flex items-center gap-3">
                <span className="w-16 font-bold text-sky-900">{g.name}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-sky-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                    style={{ width: `${(placement.correctByGrade[i] / QUESTIONS_PER_GRADE) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-right text-sm font-bold text-sky-700">
                  {placement.correctByGrade[i]}/{QUESTIONS_PER_GRADE}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              type="button"
              data-testid="placement-start-recommended"
              className={BTN}
              onClick={() => onStartGrade(placement.recommendedGradeId)}
            >
              Bắt đầu {recommended.name}
            </button>
            <button type="button" className={NAV_PILL} onClick={onBack}>
              Chọn lớp khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentGrade =
    GRADES.find((g) => g.id === state.questionGradeIds[state.session.currentIndex])?.name ?? '';

  return (
    <div className={`mx-auto max-w-2xl px-4 pt-2 ${SCREEN_ENTER}`}>
      <div className="mb-2 flex items-center gap-3">
        <button type="button" onClick={onBack} className={NAV_PILL}>
          Thoát
        </button>
        <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-sky-800 ring-1 ring-sky-200">
          Bài kiểm tra đầu vào - {currentGrade}
        </span>
      </div>
      <ActiveRoundQuestion
        session={state.session}
        onSubmitOption={handleSubmitOption}
        onSubmitListening={() => {}}
        onSubmitExtraLetter={() => {}}
        onSubmitPronunciation={() => {}}
        onSubmitPairMatching={() => {}}
        onNextQuestion={handleNext}
      />
    </div>
  );
}
