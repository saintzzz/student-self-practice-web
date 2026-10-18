import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import type { Grade } from '../types';
import type { ExamProgramId } from '../types/exam';
import type { ArenaOpenChallenge } from '../lib/arena';
import { isSupabaseConfigured } from '../lib/supabase/client';
import { listBankForms, type AssessmentFormInfo } from '../lib/qb/bank';
import { getDueReviewItems } from '../lib/engagement/store';
import { weakSkillsFor } from '../lib/engagement/coach';
import Mascot from './Mascot';
import DailyQuestCard from './DailyQuestCard';
import ReviewCard from './ReviewCard';
import CoachCard from './CoachCard';
import LeaderboardCard from './LeaderboardCard';
import ArenaCard from './ArenaCard';
import PetCard from './PetCard';
import HomeShelf from './HomeShelf';
import { InstructionSpeaker } from './InstructionSpeaker';
import ModeHub, { HubGroup, type HubTileDef } from './ModeHub';
import GameZoneShelf from '../games/GameZoneShelf';
import type { GameId } from '../games/types';
import {
  IconArrowLeft,
  IconArrowRight,
  IconBook,
  IconChevronDown,
  IconChevronUp,
  IconFlag,
  IconFlask,
  IconGift,
  IconHash,
  IconMuscle,
  IconNote,
  IconPlay,
  IconSwords,
  type IconProps,
} from './icons';
import {
  CARD,
  H1,
  PROMPT,
  NAV_PILL,
  SCREEN_ENTER,
  CTA_GOLD_XL,
  BTN_DRILL,
  BTN_EXAM,
  BTN_ADVANCED,
  BTN_PAPER_ACTION,
} from '../lib/ui/tokens';
import { examConfigForGrade } from '../lib/exam/examSession';
import { getLand } from '../lib/ui/theme';
import LandScene from './scene/LandScene';
import { EmojiVisual } from './EmojiVisual';
import { useViewer } from '../lib/viewer/ViewerContext';
import { usePressRelease } from '../hooks/usePressRelease';
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
  /** CR-82 (R-v5-12): flashcards entry - 4th row of the English block.
   *  Optional like the arena handlers: absent = the row does not mount. */
  onStartFlashcards?: () => void;
  /** CR-83: Game Zone entry - opens the arcade run for a game id. */
  onStartGame?: (gameId: GameId) => void;
  onBack: () => void;
  /** CR-30: guests see a lock prompt on the leaderboard card. */
  isGuest?: boolean;
  /** CR-50: assessment forms are a teacher surface - admin only. */
  isAdmin?: boolean;
  onLogin?: () => void;
}

/** CR-24: IOE-style Thi thử - 3 chương trình riêng biệt. */
const EXAM_PROGRAMS: readonly { id: ExamProgramId; icon: ComponentType<IconProps>; name: string; desc: string }[] = [
  { id: 'english', icon: IconFlag, name: 'Tiếng Anh', desc: 'Nghe, đọc, ngữ pháp, sắp câu' },
  { id: 'math', icon: IconHash, name: 'Toán tiếng Anh', desc: 'Tính nhẩm, đọc số, hình học' },
  { id: 'science', icon: IconFlask, name: 'Khoa học', desc: 'Động vật, cây cối, tự nhiên' },
];

const PROGRAM_VOICE_HINT: Record<ExamProgramId, string> = {
  english: 'Chọn cách luyện Tiếng Anh nhé!',
  math: 'Chọn cách luyện Toán bằng tiếng Anh nhé!',
  science: 'Chọn cách luyện Khoa học nhé!',
};

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
 *  CR-73: indigo rows -> semantic action.secondary on paper
 *  (`BTN_PAPER_ACTION`); unicode arrows -> icons.tsx chevrons. */
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
        className="min-h-[44px] w-full rounded-lg bg-sky-100 px-3 py-2 text-xs font-extrabold text-sky-800 transition hover:bg-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
      >
        <IconNote size={16} className="mr-1 inline-block" /> Đề có sẵn ({forms.length}){' '}
        {open ? <IconChevronUp size={14} className="inline-block" /> : <IconChevronDown size={14} className="inline-block" />}
      </button>
      {open && (
        <div className="mt-1 max-h-52 space-y-1 overflow-y-auto pr-1">
          {forms.map((f) => (
            <button
              key={f.id}
              type="button"
              data-testid={`form-${f.id}`}
              onClick={() => onStartExam(programId, 'exam', f.id)}
              className={`flex w-full items-center justify-between gap-2 text-left ${BTN_PAPER_ACTION}`}
            >
              <span>{f.kind === 'unit-test' ? f.title : FORM_KIND_LABEL[f.kind] ?? f.kind} - đề {f.id.slice(-2)} · {f.total_questions} câu</span>
              <IconArrowRight size={14} className="shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * CR-73 redesign (design-spec-v2 §5.1): the launchpad = one gold
 * `action.primary` ("Chơi") + an inline Mode Hub of labeled section
 * tiles inside a light paper panel. The Khám phá bottom sheet is gone -
 * every destination is visible-by-label and expands in place.
 *
 *  - G1-2: back + Chơi + "Luyện thêm" (per-program subtiles, ≤4 new
 *    controls per expansion) + "Phần thưởng" = ≤4 interactive elements.
 *  - G3-5: back + Chơi + DailyQuestCard + 3 section tiles = ≤6 (AC-2.1
 *    amendment: count = elements visible with all sections collapsed).
 *  - CR-46 preserved: every grade reaches every program/mode - only
 *    the container path differs per band.
 */
export default function StartBatchScreen({ grade, onStartBatch, onStartExam, onArenaCreate, onArenaAccept, onArenaBot, onStartFlashcards, onStartGame, onBack, isGuest, isAdmin, onLogin }: StartBatchScreenProps) {
  const examConfig = examConfigForGrade(grade.id);
  const { band, density } = useViewer();
  const isG12 = band === 'G12' || grade.id === 'grade-1' || grade.id === 'grade-2';
  const land = getLand(grade.id);
  const [hasDueReview] = useState(() => getDueReviewItems(grade.id).length > 0);
  const [hasCoachHints] = useState(() => weakSkillsFor(grade.id).length > 0);

  const arenaHandlers = onArenaCreate && onArenaAccept && onArenaBot
    ? { onArenaCreate, onArenaAccept, onArenaBot }
    : null;

  /* CR-82 (spec s16.1): the gold "Chơi" CTA springs on release. */
  const startPress = usePressRelease();

  /** One program block: 3 mode buttons + admin FormPicker (paper card
   *  inside the hub panel). The header repeats the program name, so it
   *  only renders when there is no subtile label carrying it (G3-5). */
  function programBlock(program: (typeof EXAM_PROGRAMS)[number], showHeader = true): ReactNode {
    return (
      <div key={program.id} className="rounded-2xl bg-white p-3 ring-1 ring-sky-200">
        {showHeader && (
          <div className="flex items-center gap-2">
            <program.icon size={26} className="shrink-0 text-sky-600" aria-hidden="true" />
            <div>
              <div className="font-extrabold text-slate-800">{program.name}</div>
              <div className="text-xs font-semibold text-slate-500">{program.desc}</div>
            </div>
          </div>
        )}
        <div className="mt-2 flex flex-col gap-2">
          <button
            type="button"
            data-testid={`drill-${program.id}`}
            onClick={() => onStartExam(program.id, 'practice')}
            className={`${BTN_DRILL} w-full${density.primaryMinH >= 76 ? ' !min-h-[76px]' : ''}`}
          >
            Luyện đề - {examConfig.drillCount} câu
          </button>
          <button
            type="button"
            data-testid={`exam-program-${program.id}`}
            onClick={() => onStartExam(program.id, 'exam')}
            className={`${BTN_EXAM} w-full${density.primaryMinH >= 76 ? ' !min-h-[76px]' : ''}`}
          >
            Thi thử - {examConfig.examCount} câu
          </button>
          <button
            type="button"
            data-testid={`advanced-${program.id}`}
            onClick={() => onStartExam(program.id, 'practice', undefined, { minDifficulty: 3, label: 'Nâng cao' })}
            className={`${BTN_ADVANCED} w-full${density.primaryMinH >= 76 ? ' !min-h-[76px]' : ''}`}
          >
            Nâng cao - {examConfig.drillCount} câu
          </button>
          {/* CR-82 (R-v5-12): flashcards = the 4th row of the English
              block only (vocabulary is English content), a BTN_DRILL-
              family paper row at the band's standalone floor. */}
          {program.id === 'english' && onStartFlashcards && (
            <button
              type="button"
              data-testid="flashcards-start"
              onClick={onStartFlashcards}
              className={`${BTN_DRILL} w-full${density.primaryMinH >= 76 ? ' !min-h-[76px]' : ''}`}
            >
              <IconBook size={16} className="mr-1 inline-block" /> Thẻ từ vựng
            </button>
          )}
          <FormPicker gradeId={grade.id} programId={program.id} isAdmin={isAdmin ?? false} onStartExam={onStartExam} />
        </div>
      </div>
    );
  }

  const reviewCardEl = hasDueReview ? (
    <ReviewCard gradeId={grade.id} onStartReview={() => onStartExam('english', 'review')} />
  ) : null;

  const coachCardEl = hasCoachHints ? (
    <CoachCard
      gradeId={grade.id}
      onDrill={(programId, focus) =>
        onStartExam(programId, 'practice', undefined, {
          ...focus,
          label: 'Ôn kỹ năng yếu',
        })
      }
    />
  ) : null;

  const arenaCardEl = arenaHandlers ? (
    <ArenaCard
      gradeId={grade.id}
      isGuest={isGuest ?? false}
      onCreate={arenaHandlers.onArenaCreate}
      onAccept={arenaHandlers.onArenaAccept}
      onBot={arenaHandlers.onArenaBot}
      onLogin={onLogin}
    />
  ) : null;

  const leaderboardEl = (
    <LeaderboardCard gradeId={grade.id} isGuest={isGuest ?? false} onLogin={onLogin} />
  );

  const rewardCards = (withQuest: boolean) => (
    <div id="hub-section-reward" data-testid="hub-section-reward">
      {withQuest && <DailyQuestCard />}
      <PetCard />
      <HomeShelf />
    </div>
  );

  /* CR-92: the note sits inside the dark hub tray - slate-600 was the
     paper-pairing value; on the tray it needs light ink. */
  const learnNote = (
    <p className="text-sm font-semibold text-slate-200">
      Luyện đề: {examConfig.drillCount} câu, chữa ngay. Thi thử: {examConfig.examCount} câu trong {Math.floor(examConfig.examTimeSec / 60)} phút, giống thi thật.
    </p>
  );

  const tiles: HubTileDef[] = isG12
    ? [
        {
          id: 'more',
          icon: IconBook,
          label: 'Luyện thêm',
          sub: 'Đề luyện và ôn tập',
          voiceHint: 'Chọn môn hoặc mục để luyện thêm nhé!',
          tone: 'sky',
          emoji: '📚',
          content: (
            <HubGroup
              subtile
              voiceKeyPrefix="hub-sub"
              tiles={[
                /* CR-82 (R-v5-12): Đấu trường left this group - 3
                   subjects + conditional Ôn tập = 3 or 4 subtiles. */
                ...EXAM_PROGRAMS.map((program) => ({
                  id: program.id,
                  icon: program.icon,
                  label: program.name,
                  sub: program.desc,
                  voiceHint: PROGRAM_VOICE_HINT[program.id],
                  tone: program.id === 'english' ? 'sky' as const : program.id === 'math' ? 'rose' as const : 'emerald' as const,
                  emoji: program.id === 'english' ? '🔤' : program.id === 'math' ? '🔢' : '🔬',
                  content: programBlock(program, false),
                })),
                ...(hasDueReview || hasCoachHints
                  ? [{
                      id: 'review',
                      icon: IconMuscle,
                      label: 'Ôn tập',
                      sub: 'Câu sai và điểm yếu của em',
                      voiceHint: 'Ôn lại những câu chưa chắc nhé!',
                      tone: 'amber' as const,
                      emoji: '💪',
                      /* Spec §5.1: aria-controls lists only the sections
                         actually rendered. */
                      sections: [
                        ...(hasDueReview ? [{ id: 'review', content: reviewCardEl }] : []),
                        ...(hasCoachHints ? [{ id: 'coach', content: coachCardEl }] : []),
                      ],
                    }]
                  : []),
              ]}
            />
          ),
        },
        /* CR-82 (R-v5-12, human ruling): Đấu trường is its own top-level
           hub tile between Luyện thêm and Phần thưởng - learning first,
           competition second, rewards last. hub-section-arena only
           mounts when arena handlers exist; hub-section-rank always
           does, so the tile is never empty. */
        {
          id: 'arena',
          icon: IconSwords,
          label: 'Đấu trường',
          sub: 'Thi đua với bạn bè',
          voiceHint: 'Chọn bạn đấu nhé!',
          variant: 'arena',
          tone: 'orange',
          emoji: '⚔️',
          sections: [
            ...(arenaHandlers ? [{ id: 'arena', content: arenaCardEl }] : []),
            { id: 'rank', content: leaderboardEl },
          ],
        },
        /* CR-83: Game Zone sits between competition and rewards -
           learn -> đấu -> chơi -> thưởng. */
        ...(onStartGame
          ? [{
              id: 'games',
              icon: IconPlay,
              label: 'Khu trò chơi',
              sub: 'Lật thẻ, bóng bay, đua xe, câu cá và nhiều hơn',
              voiceHint: 'Chọn một trò chơi nhé!',
              tone: 'emerald' as const,
              emoji: '🎮',
              content: <GameZoneShelf grade={grade.id} onPlay={onStartGame} />,
            }]
          : []),
        {
          id: 'reward',
          icon: IconGift,
          label: 'Phần thưởng',
          sub: 'Quà, bạn đồng hành và nhà của em',
          voiceHint: 'Xem quà của em nhé!',
          tone: 'amber',
          emoji: '🎁',
          content: rewardCards(true),
        },
      ]
    : [
        {
          id: 'learn',
          icon: IconBook,
          label: 'Luyện & thi',
          sub: 'Đề luyện, thi thử và ôn tập',
          voiceHint: 'Chọn môn để luyện nhé!',
          tone: 'sky',
          emoji: '📚',
          content: (
            <>
              <div id="hub-section-learn" data-testid="hub-section-learn" className="space-y-3">
                {learnNote}
                {EXAM_PROGRAMS.map((p) => programBlock(p))}
              </div>
              {hasDueReview && (
                <div id="hub-section-review" data-testid="hub-section-review">{reviewCardEl}</div>
              )}
              {hasCoachHints && (
                <div id="hub-section-coach" data-testid="hub-section-coach">{coachCardEl}</div>
              )}
            </>
          ),
        },
        {
          id: 'arena',
          icon: IconSwords,
          label: 'Đấu trường',
          sub: 'Thử thách và bảng xếp hạng',
          voiceHint: 'Chọn bạn đấu nhé!',
          /* CR-82 (R-v5-12): cross-band consistency - the G3-5 tile
             adopts the same arena surface + VS emblem. */
          variant: 'arena',
          tone: 'orange',
          emoji: '⚔️',
          content: (
            <>
              <div id="hub-section-arena" data-testid="hub-section-arena">{arenaCardEl}</div>
              <div id="hub-section-rank" data-testid="hub-section-rank">{leaderboardEl}</div>
            </>
          ),
        },
        /* CR-83: Game Zone between competition and rewards. */
        ...(onStartGame
          ? [{
              id: 'games',
              icon: IconPlay,
              label: 'Khu trò chơi',
              sub: 'Lật thẻ, bóng bay, đua xe, câu cá và nhiều hơn',
              voiceHint: 'Chọn một trò chơi nhé!',
              tone: 'emerald' as const,
              emoji: '🎮',
              content: <GameZoneShelf grade={grade.id} onPlay={onStartGame} />,
            }]
          : []),
        {
          id: 'reward',
          icon: IconGift,
          label: 'Phần thưởng',
          sub: 'Bạn đồng hành và nhà của em',
          voiceHint: 'Xem quà của em nhé!',
          tone: 'amber',
          emoji: '🎁',
          content: rewardCards(false),
        },
      ];

  return (
    <div className={`mx-auto max-w-2xl px-4 py-6 sm:py-10 ${SCREEN_ENTER}`}>
      <div className={`${CARD} text-center`}>
        <div className="mb-6 flex items-start justify-between gap-2">
          <button type="button" data-testid="back-to-grades" onClick={onBack} className={NAV_PILL}>
            <span className="inline-flex items-center gap-1.5"><IconArrowLeft size={18} /> Quay lại</span>
          </button>
          <InstructionSpeaker
            text={
              isG12
                ? 'Bấm Chơi màu vàng để bắt đầu, hoặc bấm Luyện thêm hoặc Phần thưởng để xem thêm!'
                : 'Bấm Chơi để bắt đầu, hoặc mở một mục bên dưới nhé!'
            }
            lang="vi-VN"
            autoplayKey={`start-${grade.id}`}
          />
        </div>
        {/* Land vignette: the mascot stands ON its land's ground (strip
            scene over the land's page gradient) instead of floating on
            navy - each grade's home screen wears its land identity. */}
        <div className={`relative mx-auto h-40 max-w-sm overflow-hidden rounded-2xl ring-1 ring-white/20 shadow-[inset_0_2px_0_rgba(255,255,255,0.15)] ${land.pageGradient}`}>
          <LandScene land={land.key} variant="strip" tone="day" />
          <div className="absolute inset-x-0 bottom-1 flex justify-center">
            <Mascot mood="greeting" />
          </div>
        </div>
        {isG12 ? (
          <>
            {/* Speech bubble from the pig - the prompt reads as the
                mascot talking (Khan Kids / Lingokids character idiom). */}
            <div className="relative mx-auto mt-3 inline-block max-w-xs rounded-2xl bg-white/95 px-5 py-2.5 shadow-md">
              <span aria-hidden="true" className="absolute -top-1.5 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 rounded-sm bg-white/95" />
              <p className="text-lg font-bold text-slate-700">
                Mình cùng chơi 5 trò nhỏ nhé! Bấm Chơi nào!
              </p>
            </div>
            {/* Ruling R-14: non-interactive orientation label - now a
                land badge carrying the land's tint + motif. */}
            <h1 className="mt-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full ${land.cardTint} px-4 py-1.5 font-display text-base font-extrabold ${land.accentText} ring-2 ${land.cardRing}`}>
                {land.motif && <EmojiVisual emoji={land.motif} className="text-sm" />}
                {grade.name} - {land.nameVi}
              </span>
            </h1>
          </>
        ) : (
          <>
            <h1 className={`mt-3 ${H1}`}>{grade.name}: Sẵn sàng phiêu lưu chưa?</h1>
            <p className="mt-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full ${land.cardTint} px-4 py-1.5 text-sm font-extrabold ${land.accentText} ring-2 ${land.cardRing}`}>
                {land.motif && <EmojiVisual emoji={land.motif} className="text-xs" />}
                {land.nameVi}
              </span>
            </p>
            <p className={`mt-3 ${PROMPT}`}>
              Luyện tập Tiếng Anh: 4 vòng câu hỏi + 1 vòng trò chơi thưởng.
            </p>
          </>
        )}
        <button
          type="button"
          data-testid="start-batch-button"
          onClick={onStartBatch}
          className={`mt-6 w-full ${CTA_GOLD_XL} sm:w-auto`}
          {...startPress}
        >
          <span className="flex flex-col items-center">
            <span className="inline-flex items-center gap-2"><IconPlay size={18} /> Chơi</span>
            {!isG12 && (
              <span className="text-base font-bold">4 vòng câu hỏi + 1 trò chơi thưởng</span>
            )}
          </span>
        </button>

        {/* G3-5: the headline progress card stays on-screen above the
            hub (AC-2.1 amendment: ≤6 elements with sections collapsed). */}
        {!isG12 && <DailyQuestCard />}

        {/* CR-73: the hub lives inside the launchpad card as a light
            paper panel - labeled tiles, inline expansion, no sheet. */}
        <div className="mt-5 text-left">
          <ModeHub tiles={tiles} voiceKeyPrefix={`hub-${grade.id}`} />
        </div>
      </div>
    </div>
  );
}
