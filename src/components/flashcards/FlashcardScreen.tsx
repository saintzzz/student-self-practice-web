import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Grade } from '../../types';
import { getWordsByGrade, ensureContentBank } from '../../lib/content/contentBank';
import { useViewer } from '../../lib/viewer/ViewerContext';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { usePressRelease } from '../../hooks/usePressRelease';
import ConfirmEndDialog from '../ConfirmEndDialog';
import Mascot, { type MascotMood } from '../Mascot';
import {
  buildDeck,
  deckReducer,
  INITIAL_DECK_STATE,
  ratingTally,
  type DeckRating,
} from '../../lib/flashcards/deck';
import { readReviewStore, saveFlashRating } from '../../lib/flashcards/reviewStore';
import FlashcardDeck from './FlashcardDeck';
import {
  material,
  CHIP_AMBER,
  CHIP_PAPER_EMERALD,
  CHIP_PAPER_SKY,
  CTA_GOLD_XL,
  BTN_SECONDARY_PAPER,
  FLASH_PANEL,
  TYPE_SECTION_PAPER,
  TYPE_BODY_PAPER,
} from '../../lib/ui/tokens';

/**
 * CR-82 (spec s14 / ARCHITECTURE-v5 D-11, D-16): the unscored flashcard
 * route screen - chrome strip (card counter + KẾT THÚC), the deck, and
 * the s14.5 summary/empty/load-error panels. No points, no feedback
 * sheet, no quest credit; ratings persist through reviewStore only.
 */

export interface FlashcardScreenProps {
  grade: Grade;
  onExit: () => void;
}

function SummaryPanel({
  mood,
  heading,
  known,
  again,
  primary,
  onPrimary,
  retryAgain,
  onRetryAgain,
  onExit,
  floorClass,
  headingRef,
}: {
  mood: MascotMood;
  heading: string;
  known?: number;
  again?: number;
  primary: string;
  onPrimary: () => void;
  retryAgain?: string | null;
  onRetryAgain?: () => void;
  onExit: () => void;
  floorClass: string;
  headingRef: React.Ref<HTMLHeadingElement>;
}) {
  /* CR-82 (spec s16.1): the summary gold CTA gets press-release. */
  const press = usePressRelease();
  return (
    <div data-testid="flashcard-summary" className={`${FLASH_PANEL} flex flex-col items-center gap-4`}>
      <Mascot mood={mood} size="block" />
      <h2 ref={headingRef} tabIndex={-1} className={`${TYPE_SECTION_PAPER} focus:outline-none`}>
        {heading}
      </h2>
      {known !== undefined && again !== undefined && (known + again) > 0 && (
        <div className="flex items-center gap-2">
          <span data-testid="flashcard-chip-known" className={CHIP_PAPER_EMERALD}>Nhớ: {known}</span>
          <span data-testid="flashcard-chip-again" className={CHIP_PAPER_SKY}>Ôn lại: {again}</span>
        </div>
      )}
      <div className="flex w-full flex-col items-center gap-2">
        <button
          type="button"
          data-testid="flashcard-summary-primary"
          className={`${CTA_GOLD_XL} w-full sm:w-auto`}
          onClick={onPrimary}
          {...press}
        >
          {primary}
        </button>
        {retryAgain && (
          <button
            type="button"
            data-testid="flashcard-retry-again"
            className={`${BTN_SECONDARY_PAPER} w-full sm:w-auto${floorClass}`}
            onClick={onRetryAgain}
          >
            {retryAgain}
          </button>
        )}
        <button
          type="button"
          data-testid="flashcard-summary-exit"
          className={`${BTN_SECONDARY_PAPER} w-full sm:w-auto${floorClass}`}
          onClick={onExit}
        >
          Về trang chính
        </button>
      </div>
    </div>
  );
}

export default function FlashcardScreen({ grade, onExit }: FlashcardScreenProps) {
  const { band, density } = useViewer();
  const reducedMotion = usePrefersReducedMotion();
  const [state, dispatch] = useReducer(deckReducer, INITIAL_DECK_STATE);
  const [buildError, setBuildError] = useState(false);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const floorClass = density.primaryMinH >= 76 ? ' !min-h-[76px]' : ' !min-h-[64px]';

  /* One deck-build seed per mount; a rebuild after a load error gets a
     fresh seed so the next deck is shuffled anew. */
  const seedRef = useRef(0);
  const build = () => {
    void (async () => {
      try {
        // CR-103: the deck's word pool arrives via the lazy content bank.
        await ensureContentBank();
        const words = getWordsByGrade(grade.id);
        const ratings = readReviewStore(grade.id);
        seedRef.current += 1;
        const deck = buildDeck(words, ratings, `g-${grade.id}-s${seedRef.current}`);
        dispatch({ type: 'load', deck });
        setBuildError(false);
      } catch {
        /* s14.5 load error - a failure never claims there are no cards. */
        setBuildError(true);
      }
    })();
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(build, [grade.id]);

  /* Focus the panel heading whenever a summary/empty/error state mounts. */
  useEffect(() => {
    if (state.phase === 'summary' || state.phase === 'empty' || buildError) {
      headingRef.current?.focus();
    }
  }, [state.phase, state.exit, buildError]);

  const activeCard = state.deck[state.cursor] ?? null;
  const tally = useMemo(() => ratingTally(state.rated), [state.rated]);
  const againCount = tally.again;

  const rate = (rating: DeckRating) => {
    if (!activeCard) return;
    saveFlashRating(grade.id, activeCard.wordId, rating === 'known' ? 'k' : 'a');
    dispatch({ type: 'rate', rating });
  };

  const rated = state.rated.size;
  const total = state.deck.length;

  const body = () => {
    if (buildError) {
      return (
        <div data-testid="flashcard-error" role="alert" className={`${FLASH_PANEL} flex flex-col items-center gap-3`}>
          <Mascot mood="encouraging" size="block" />
          <h2 ref={headingRef} tabIndex={-1} className={`${TYPE_SECTION_PAPER} focus:outline-none`}>
            Chưa mở được bộ thẻ
          </h2>
          <p className={TYPE_BODY_PAPER}>Có lỗi khi mở thẻ - em thử lại nhé. Nếu vẫn lỗi, báo bố mẹ giúp em.</p>
          <div className="flex w-full flex-col items-center gap-2">
            <button
              type="button"
              data-testid="flashcard-error-retry"
              className={`${BTN_SECONDARY_PAPER} w-full sm:w-auto${floorClass}`}
              onClick={build}
            >
              Thử lại
            </button>
            <button
              type="button"
              data-testid="flashcard-error-exit"
              className={`${BTN_SECONDARY_PAPER} w-full sm:w-auto${floorClass}`}
              onClick={onExit}
            >
              Về trang chính
            </button>
          </div>
        </div>
      );
    }

    if (state.phase === 'empty') {
      return (
        <div data-testid="flashcard-empty" className={`${FLASH_PANEL} flex flex-col items-center gap-3`}>
          <Mascot mood="encouraging" size="block" />
          <h2 ref={headingRef} tabIndex={-1} className={`${TYPE_SECTION_PAPER} focus:outline-none`}>
            Chưa có thẻ cho lớp này
          </h2>
          <p className={TYPE_BODY_PAPER}>Chưa có thẻ cho lớp này - em thử phần khác nhé.</p>
          <button
            type="button"
            data-testid="flashcard-empty-exit"
            className={`${BTN_SECONDARY_PAPER} w-full sm:w-auto${floorClass}`}
            onClick={onExit}
          >
            Về trang chính
          </button>
        </div>
      );
    }

    if (state.phase === 'summary') {
      if (state.exit === 'full') {
        return (
          <SummaryPanel
            mood="celebrating"
            heading={`Em đã xem hết ${total} thẻ - giỏi lắm!`}
            known={tally.known}
            again={tally.again}
            primary="Học tiếp bộ mới"
            onPrimary={build}
            retryAgain={againCount > 0 ? `Ôn lại ${againCount} thẻ` : null}
            onRetryAgain={() => dispatch({ type: 'retryAgain' })}
            onExit={onExit}
            floorClass={floorClass}
            headingRef={headingRef}
          />
        );
      }
      if (state.exit === 'partial') {
        return (
          <SummaryPanel
            mood="happy"
            heading={`Em đã xem ${rated}/${total} thẻ - lần sau mình xem tiếp nhé!`}
            known={tally.known}
            again={tally.again}
            primary={`Xem tiếp ${total - rated} thẻ`}
            onPrimary={() => dispatch({ type: 'resume' })}
            retryAgain={againCount > 0 ? `Ôn lại ${againCount} thẻ` : null}
            onRetryAgain={() => dispatch({ type: 'retryAgain' })}
            onExit={onExit}
            floorClass={floorClass}
            headingRef={headingRef}
          />
        );
      }
      return (
        <SummaryPanel
          mood="encouraging"
          heading="Mình chưa xem thẻ nào - em quay lại khi sẵn sàng nhé."
          primary="Bắt đầu xem thẻ"
          onPrimary={() => dispatch({ type: 'resume' })}
          onExit={onExit}
          floorClass={floorClass}
          headingRef={headingRef}
        />
      );
    }

    if (state.phase === 'loading' || !activeCard) {
      /* s14.5 loading: paper skeleton, buttons disabled. Deck build is
         local so this is normally <100ms. */
      return (
        <div data-testid="flashcard-loading" aria-busy="true" className="flex flex-col items-center gap-6">
          <div className="aspect-[3/4] w-[min(84vw,360px)] rounded-[2rem] bg-amber-100 animate-pulse motion-reduce:animate-none" />
        </div>
      );
    }

    return (
      <FlashcardDeck
        card={activeCard}
        index={state.cursor + 1}
        total={total}
        band={band}
        reducedMotion={reducedMotion}
        onRate={rate}
      />
    );
  };

  return (
    <div className="mx-auto max-w-2xl overflow-x-clip px-4 py-6 sm:py-10">
      {/* Chrome strip: card counter + KẾT THÚC (s14.3 anatomy). */}
      <div className={`mb-4 flex items-center justify-between gap-2 ${material.chrome} p-2 sm:px-4 sm:py-2.5`}>
        <span data-testid="flashcard-counter" className={CHIP_AMBER}>
          {state.phase === 'cards' && activeCard ? `Thẻ ${state.cursor + 1}/${total}` : 'Thẻ từ vựng'}
        </span>
        <button
          type="button"
          data-testid="flashcard-end"
          onClick={() => setEndConfirmOpen(true)}
          className="min-h-[48px] shrink-0 rounded-full bg-sky-600 px-4 font-display text-sm font-extrabold tracking-wide text-white shadow-md transition hover:bg-sky-500 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          KẾT THÚC
        </button>
      </div>

      {body()}

      {endConfirmOpen && (
        <ConfirmEndDialog
          title="Dừng xem thẻ?"
          body="Các thẻ em đã chọn Nhớ hoặc Ôn lại sẽ được lưu."
          confirmLabel="Dừng xem thẻ"
          onConfirm={() => {
            setEndConfirmOpen(false);
            dispatch({ type: 'endEarly' });
          }}
          onCancel={() => setEndConfirmOpen(false)}
        />
      )}
    </div>
  );
}
