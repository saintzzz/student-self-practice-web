import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Grade } from '../types';
import type { ExamProgramId } from '../types/exam';
import type { ArenaOpenChallenge } from '../lib/arena';
import { isSupabaseConfigured } from '../lib/supabase/client';
import { listBankForms, type AssessmentFormInfo } from '../lib/qb/bank';
import { getDueReviewItems } from '../lib/engagement/store';
import Mascot from './Mascot';
import DailyQuestCard from './DailyQuestCard';
import ReviewCard from './ReviewCard';
import CoachCard from './CoachCard';
import LeaderboardCard from './LeaderboardCard';
import ArenaCard from './ArenaCard';
import PetCard from './PetCard';
import { InstructionSpeaker } from './InstructionSpeaker';
import ExploreSheet from './ExploreSheet';
import {
  CARD,
  H1,
  H2,
  PROMPT,
  NAV_PILL,
  SCREEN_ENTER,
  CTA_GOLD_XL,
  DISCLOSURE_BTN,
  TRAIL_TILE,
  TRAIL_TILE_SM,
  BTN_DRILL,
  BTN_EXAM,
  BTN_ADVANCED,
} from '../lib/ui/tokens';
import { examConfigForGrade } from '../lib/exam/examSession';
import { getLand } from '../lib/ui/theme';
import { useViewer } from '../lib/viewer/ViewerContext';
import type { BankFetchFocus } from '../lib/qb/bank';

interface StartBatchScreenProps {
  grade: Grade;
  onStartBatch: () => void;
  /** CR-25: 'practice' = 20-question drill with instant verdicts; 'exam' = 200q/30min.
   *  CR-28: 'review' = spaced-repetition session over due wrong questions.
   *  CR-34: 'arena' = 10-question 1v1 duel on a shared seed.
   *  CR-58/59: focus = skill drill (coach) or advanced tier filter. */
  onStartExam: (programId: ExamProgramId, mode: 'practice' | 'exam' | 'review', formId?: string, focus?: BankFetchFocus & { label?: string }) => void;
  /** CR-34: arena entry points - create / accept / guest bot run. */
  onArenaCreate?: () => void;
  onArenaAccept?: (challenge: ArenaOpenChallenge) => void;
  onArenaBot?: () => void;
  onBack: () => void;
  /** CR-30: guests see a lock prompt on the leaderboard card. */
  isGuest?: boolean;
  /** CR-50: assessment forms are a teacher surface - admin only. */
  isAdmin?: boolean;
  onLogin?: () => void;
}

/** CR-24: IOE-style Thi thử - 3 chương trình riêng biệt. */
const EXAM_PROGRAMS: readonly { id: ExamProgramId; icon: string; name: string; desc: string }[] = [
  { id: 'english', icon: '🇬🇧', name: 'Tiếng Anh', desc: 'Nghe, đọc, ngữ pháp, sắp câu' },
  { id: 'math', icon: '🔢', name: 'Toán tiếng Anh', desc: 'Tính nhẩm, đọc số, hình học' },
  { id: 'science', icon: '🔬', name: 'Khoa học', desc: 'Động vật, cây cối, tự nhiên' },
];

const FORM_KIND_LABEL: Record<string, string> = {
  'unit-test': 'Kiểm tra unit',
  diagnostic: 'Chẩn đoán đầu vào',
  'midterm-1': 'Giữa kỳ 1',
  'final-1': 'Cuối kỳ 1',
  'midterm-2': 'Giữa kỳ 2',
  'final-2': 'Cuối kỳ 2',
};

/** CR-48 phase 5 + CR-50: collapsible V6 assessment forms per program.
 *  Teacher-only surface - students drill via Luyen de / Thi thu.
 *  kids-UX: lives inside the light Khám phá sheet, so the chrome moved
 *  from navy-glass to the paper register. */
function FormPicker({ gradeId, programId, isAdmin, onStartExam }: { gradeId: string; programId: ExamProgramId; isAdmin: boolean; onStartExam: (p: ExamProgramId, m: 'exam', formId: string) => void }) {
  const [forms, setForms] = useState<AssessmentFormInfo[] | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!isAdmin || !isSupabaseConfigured()) return;
    let alive = true;
    listBankForms(gradeId, programId)
      .then((f) => { if (alive) setForms(f); })
      .catch(() => { if (alive) setForms([]); });
    return () => { alive = false; };
  }, [gradeId, programId, isAdmin]);
  if (!forms || forms.length === 0) return null;
  return (
    <div className="mt-2">
      <button
        type="button"
        data-testid={`forms-toggle-${programId}`}
        onClick={() => setOpen((v) => !v)}
        className="min-h-[44px] w-full rounded-lg bg-sky-100 px-3 py-2 text-xs font-extrabold text-sky-800 transition hover:bg-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        📋 Đề có sẵn ({forms.length}) {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="mt-1 max-h-52 space-y-1 overflow-y-auto pr-1">
          {forms.map((f) => (
            <button
              key={f.id}
              type="button"
              data-testid={`form-${f.id}`}
              onClick={() => onStartExam(programId, 'exam', f.id)}
              className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-left text-xs font-bold text-white transition hover:bg-indigo-500 active:scale-[0.98] motion-reduce:transition-none"
            >
              <span>{f.kind === 'unit-test' ? f.title : FORM_KIND_LABEL[f.kind] ?? f.kind} - đề {f.id.slice(-2)} · {f.total_questions} câu</span>
              <span className="text-indigo-200">→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** kids-UX §3.1.c: one "trail tile" row inside the Khám phá sheet - emoji
 *  icon + the relocated card, band-sized (96px G1-2 / 76px G3-5 floor). */
function SheetTile({ icon, tileClass, children }: { icon: string; tileClass: string; children: ReactNode }) {
  return (
    <section className={tileClass}>
      <span aria-hidden="true" className="shrink-0 text-2xl leading-none">{icon}</span>
      <div className="min-w-0 flex-1 [&>*]:mt-0">{children}</div>
    </section>
  );
}

/**
 * kids-UX (design-kids-ux §3.1): the launchpad collapses to ONE gold
 * action ("Chơi"). G1-2 sees 4 interactive elements (back, speaker, Chơi,
 * Khám phá); G3-5 keeps progress cards (DailyQuest, Review) on screen and
 * folds everything else into the Khám phá sheet - the sheet renders the
 * same card components, unchanged.
 */
export default function StartBatchScreen({ grade, onStartBatch, onStartExam, onArenaCreate, onArenaAccept, onArenaBot, onBack, isGuest, isAdmin, onLogin }: StartBatchScreenProps) {
  // CR-46: same modes for every grade - only question counts scale.
  const examConfig = examConfigForGrade(grade.id);
  const { band } = useViewer();
  // Band source of truth is the viewer context (ADR KUX-5); the grade-id
  // check keeps un-wrapped renders (unit tests) on the right band.
  const isG12 = band === 'G12' || grade.id === 'grade-1' || grade.id === 'grade-2';
  const tileClass = isG12 ? TRAIL_TILE : TRAIL_TILE_SM;
  const land = getLand(grade.id);
  const [exploreOpen, setExploreOpen] = useState(false);
  const exploreToggleRef = useRef<HTMLButtonElement>(null);
  // Local store read - same check ReviewCard makes itself; used only to
  // hide the dead sheet row, the card still decides its own render.
  const [hasDueReview] = useState(() => getDueReviewItems(grade.id).length > 0);

  const arenaHandlers = onArenaCreate && onArenaAccept && onArenaBot
    ? { onArenaCreate, onArenaAccept, onArenaBot }
    : null;

  const examProgramsBlock = (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-600">
        Luyện đề: {examConfig.drillCount} câu, chữa ngay. Thi thử: {examConfig.examCount} câu trong {Math.floor(examConfig.examTimeSec / 60)} phút, giống thi thật.
      </p>
      {EXAM_PROGRAMS.map((program) => (
        <div
          key={program.id}
          className="rounded-2xl bg-white p-3 ring-1 ring-sky-200"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">{program.icon}</span>
            <div>
              <div className="font-extrabold text-slate-800">{program.name}</div>
              <div className="text-xs font-semibold text-slate-500">{program.desc}</div>
            </div>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            <button
              type="button"
              data-testid={`drill-${program.id}`}
              onClick={() => onStartExam(program.id, 'practice')}
              className={`${BTN_DRILL} w-full${isG12 ? ' !min-h-[76px]' : ''}`}
            >
              ✏️ Luyện đề - {examConfig.drillCount} câu
            </button>
            <button
              type="button"
              data-testid={`exam-program-${program.id}`}
              onClick={() => onStartExam(program.id, 'exam')}
              className={`${BTN_EXAM} w-full${isG12 ? ' !min-h-[76px]' : ''}`}
            >
              🏆 Thi thử - {examConfig.examCount} câu
            </button>
            <button
              type="button"
              data-testid={`advanced-${program.id}`}
              onClick={() => onStartExam(program.id, 'practice', undefined, { minDifficulty: 3, label: 'Nâng cao' })}
              className={`${BTN_ADVANCED} w-full${isG12 ? ' !min-h-[76px]' : ''}`}
            >
              🔥 Nâng cao - {examConfig.drillCount} câu
            </button>
            <FormPicker gradeId={grade.id} programId={program.id} isAdmin={isAdmin ?? false} onStartExam={onStartExam} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`mx-auto max-w-2xl px-4 py-6 sm:py-10 ${SCREEN_ENTER}`}>
      <div className={`${CARD} text-center`}>
        <div className="mb-6 flex items-start justify-between gap-2">
          <button type="button" data-testid="back-to-grades" onClick={onBack} className={NAV_PILL}>
            ← Quay lại
          </button>
          {/* kids-UX §3.2: persistent instruction speaker; autoplays once on
              G1-2, tap-to-hear on G3-5. */}
          <InstructionSpeaker
            text={
              isG12
                ? 'Mình cùng chơi bốn trò nhỏ nhé. Bấm nút Chơi màu vàng để bắt đầu!'
                : 'Bấm nút Chơi để bắt đầu, hoặc mở Khám phá để xem thêm nhé!'
            }
            lang="vi-VN"
            autoplay={isG12}
            autoplayKey={`start-${grade.id}`}
          />
        </div>
        <Mascot mood="greeting" />
        {isG12 ? (
          <>
            <p className={`mt-1 ${PROMPT}`}>
              Mình cùng chơi 4 trò nhỏ nhé! Bấm Chơi nào!
            </p>
            {/* Ruling R-14: non-interactive orientation label. */}
            <h1 className={`mt-2 ${H2}`}>{grade.name} - {land.nameVi}</h1>
          </>
        ) : (
          <>
            <h1 className={`mt-1 ${H1}`}>{grade.name}: Sẵn sàng phiêu lưu chưa?</h1>
            <p className={`mt-3 ${PROMPT}`}>
              Luyện tập Tiếng Anh: 4 vòng game nhỏ, mỗi vòng khoảng 10 câu hỏi.
            </p>
          </>
        )}
        <button
          type="button"
          data-testid="start-batch-button"
          onClick={onStartBatch}
          className={`mt-6 w-full ${CTA_GOLD_XL} sm:w-auto`}
        >
          <span className="flex flex-col items-center">
            <span>▶ Chơi</span>
            {!isG12 && (
              <span className="text-base font-bold">4 trò nhỏ - khoảng 10 câu mỗi trò</span>
            )}
          </span>
        </button>
        <div className="mt-4">
          <button
            type="button"
            ref={exploreToggleRef}
            data-testid="explore-toggle"
            aria-haspopup="dialog"
            aria-expanded={exploreOpen}
            onClick={() => setExploreOpen(true)}
            className={isG12 ? `min-h-[76px] w-full text-lg ${DISCLOSURE_BTN}` : DISCLOSURE_BTN}
          >
            🗺️ Khám phá
          </button>
        </div>
      </div>

      {/* G3-5 keeps progress info on screen (AC-2.2, ≤6 decisions);
          G1-2 moves everything into the sheet. */}
      {!isG12 && (
        <>
          <DailyQuestCard />
          <ReviewCard gradeId={grade.id} onStartReview={() => onStartExam('english', 'review')} />
        </>
      )}

      <ExploreSheet
        open={exploreOpen}
        onClose={() => setExploreOpen(false)}
        returnFocusRef={exploreToggleRef}
        speakerAutoplay={isG12}
        speakerKey={`explore-${grade.id}`}
      >
        {/* Relocated content - the same card components, unchanged; each
            still decides its own visibility when empty. */}
        {isG12 && (
          <SheetTile icon="🎯" tileClass={tileClass}>
            <DailyQuestCard />
          </SheetTile>
        )}
        {isG12 && hasDueReview && (
          <SheetTile icon="📚" tileClass={tileClass}>
            <ReviewCard gradeId={grade.id} onStartReview={() => onStartExam('english', 'review')} />
          </SheetTile>
        )}
        <SheetTile icon="💪" tileClass={tileClass}>
          <CoachCard
            gradeId={grade.id}
            onDrill={(programId, focus) =>
              onStartExam(programId, 'practice', undefined, {
                ...focus,
                label: 'Ôn kỹ năng yếu',
              })
            }
          />
        </SheetTile>
        <SheetTile icon="🏡" tileClass={tileClass}>
          <PetCard />
        </SheetTile>
        <SheetTile icon="🏅" tileClass={tileClass}>
          <LeaderboardCard gradeId={grade.id} isGuest={isGuest ?? false} onLogin={onLogin} />
        </SheetTile>
        {arenaHandlers && (
          <SheetTile icon="⚔️" tileClass={tileClass}>
            <ArenaCard
              gradeId={grade.id}
              isGuest={isGuest ?? false}
              onCreate={arenaHandlers.onArenaCreate}
              onAccept={arenaHandlers.onArenaAccept}
              onBot={arenaHandlers.onArenaBot}
              onLogin={onLogin}
            />
          </SheetTile>
        )}
        <SheetTile icon="🏆" tileClass={tileClass}>
          <div className="min-w-0 flex-1">
            <div className="mb-2 font-extrabold text-slate-800">Thi &amp; luyện đề</div>
            {examProgramsBlock}
          </div>
        </SheetTile>
      </ExploreSheet>
    </div>
  );
}
