import { useEffect, useRef, useState } from 'react';
import { gameBestStars, gameLevelStars, subscribe, trailSnapshot, visitMysteryIsland } from '../lib/engagement/store';
import { drillSkillsFor, skillLabel } from '../lib/engagement/skills';
import { weakSkillsFor } from '../lib/engagement/coach';
import { hashString } from '../lib/prng';
import { gameCardChip, gameCardClass, gameHeroClass } from '../lib/ui/tokens';
import { IconLock, IconParty } from '../components/icons';
import { EmojiVisual } from '../components/EmojiVisual';
import { playSfx } from '../lib/sfx';
import { GAME_DEFS } from './defs';
import GameArt from './GameArt';
import { GAME_LEVELS } from './levels';
import type { GameDef, GameId } from './types';

function Stars({ id, onCandy = false }: { id: GameId; onCandy?: boolean }) {
  const best = gameBestStars(id);
  /* CR-91 r54: stars are meaningful indicators (>=3:1 non-text). On the
     light paper cards amber-500 (~2:1) fails - amber-600 measures ~4.5:1.
     On the saturated hero keep the dark-slate pair (strong on candy). */
  const on = onCandy ? 'text-slate-900' : 'text-amber-600';
  const off = onCandy ? 'text-slate-900/25' : 'text-slate-300';
  return (
    <span
      data-testid={`game-best-${id}`}
      className="text-sm tracking-wider"
      aria-label={`Thành tích tốt nhất: ${best} sao`}
    >
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < best ? on : off}>★</span>
      ))}
    </span>
  );
}

function NewBadge() {
  return (
    <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-rose-600 shadow">
      Mới
    </span>
  );
}

/* CR-148 (P1-6): coach flag on the cards whose skill the kid is
   weakest in right now - the shelf answers "chơi gì để giỏi hơn". */
function WeakBadge() {
  return (
    <span
      data-testid="game-weak-badge"
      className="absolute left-2 top-2 rounded-full bg-rose-500/95 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow"
    >
      Điểm yếu
    </span>
  );
}

/* CR-99 M2: total earned stars across the 3 levels - the completionist
   goal Martin's badges provide. Hidden until the kid owns at least 1. */
function TotalStars({ id }: { id: GameId }) {
  const total = GAME_LEVELS.reduce((n, l) => n + gameLevelStars(id, l), 0);
  if (total === 0) return null;
  return (
    <span className="text-[10px] font-extrabold text-slate-500" aria-label={`Tổng số sao: ${total} trên 9`}>
      ⭐{total}/9
    </span>
  );
}

/* CR-99 M6+M7 + CR-148 (P2-4): the teaser card is no longer a promise
   without a date - finishing a grade's first lantern lap (epoch >= 1)
   opens Đảo bí mật: a celebration panel that stamps the
   mystery-island sticker into the album once ever. */
function MysteryIslandCard({ gradeId }: { gradeId?: string }) {
  const [taps, setTaps] = useState(0);
  const [open, setOpen] = useState(false);
  const [firstVisit, setFirstVisit] = useState(false);
  const [, setVersion] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  /* The card must flip to unlocked the moment a lap completes - same
     subscribe rule as LandDecor/HomeShelf (r229). */
  useEffect(() => subscribe(() => setVersion((v) => v + 1)), []);
  const unlocked = gradeId ? trailSnapshot(gradeId).epoch >= 1 : false;

  const poke = () => {
    playSfx('pop');
    setTaps((n) => n + 1);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTaps(0), 2400);
  };

  const visit = () => {
    playSfx('pop');
    const r = gradeId ? visitMysteryIsland(gradeId) : { unlocked: false, firstVisit: false };
    setFirstVisit(r.firstVisit);
    setOpen(true);
  };

  if (open) {
    return (
      <div
        data-testid="mystery-island-panel"
        className={`${gameCardClass('sky')} relative col-span-2 !items-start gap-2 text-left`}
      >
        <div className="flex w-full items-center justify-between gap-2">
          <span className="font-display text-base font-extrabold text-slate-700">🏝️ Đảo bí mật</span>
          <button
            type="button"
            data-testid="mystery-island-close"
            onClick={() => setOpen(false)}
            className="rounded-full bg-slate-200/80 px-3 py-1 text-xs font-extrabold text-slate-600 transition hover:bg-slate-300"
          >
            Đóng
          </button>
        </div>
        <p className="text-sm font-semibold leading-snug text-slate-600">
          Em đã thắp sáng trọn vẹn một vùng đất - hòn đảo bí mật hiện ra
          để chào mừng! Cứ thắp hết đèn mỗi vùng, đảo lại có quà mới.
        </p>
        {firstVisit ? (
          <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200">
            <IconParty size={22} className="text-amber-500" aria-hidden />
            <p className="text-sm font-extrabold text-amber-800">
              Huy hiệu mới: Nhà thám hiểm đảo bí mật!
            </p>
          </div>
        ) : (
          <p className="text-xs font-semibold text-slate-500">
            Huy hiệu "Nhà thám hiểm đảo bí mật" đã nằm trong bộ sưu tập của em.
          </p>
        )}
      </div>
    );
  }

  if (unlocked) {
    return (
      <button
        type="button"
        data-testid="game-card-mystery-island"
        onClick={visit}
        className={`${gameCardClass('amber')} relative`}
      >
        <span className="absolute right-2 top-2 rounded-full bg-emerald-500/95 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow">
          Đã mở
        </span>
        <span className={gameCardChip('amber')}>
          <EmojiVisual emoji="🏝️" variant="block" className="text-3xl" />
        </span>
        <span className="font-display text-base font-extrabold leading-tight text-slate-700">Đảo bí mật</span>
        <span className="text-xs font-semibold leading-snug text-slate-600">
          Em đã thắp hết đèn một vùng - vào đảo nhận quà nào!
        </span>
      </button>
    );
  }

  const hint = taps >= 3 ? 'Thắp hết đèn một vùng đất là đảo mở!' : taps >= 1 ? 'Sắp mở rồi!' : null;
  return (
    <button
      type="button"
      data-testid="game-card-coming-soon"
      onClick={poke}
      className={`${gameCardClass('sky')} relative opacity-70 saturate-50 ${taps ? 'chest-wiggle' : ''}`}
    >
      <span className="absolute right-2 top-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-300 shadow">
        Sắp mở
      </span>
      <span className={gameCardChip('sky')}><IconLock size={28} className="text-slate-500" /></span>
      <span className="font-display text-base font-extrabold leading-tight text-slate-600">Đảo bí mật</span>
      <span className="text-xs font-semibold leading-snug text-slate-500">
        {hint ?? 'Thắp hết đèn một vùng đất để mở đảo'}
      </span>
    </button>
  );
}

/* CR-148 (P1-6): shelf sections by training skill - a fixed order so
   kids learn the geography (listening first, reading last). Defs
   without a skill land in "Khám phá". */
const SKILL_SECTIONS: readonly string[] = [
  'listening', 'vocabulary', 'spelling', 'phonics', 'count-and-name',
  'wordorder', 'matching', 'speaking', 'reading',
];
const OTHER_SECTION = '__other__';

/**
 * CR-83 Game Zone shelf - the grid of game cards rendered inside the
 * "Khu tro choi" hub tile. Component-free metadata (defs.ts) keeps the
 * main bundle clean; tapping a card routes to the lazy game screen.
 *
 * CR-85 redesign: one daily "Tro choi hom nay" hero + a per-hue card
 * grid. `grade` filters defs that declare a grade list (arcade shelf
 * honors the same band split the games do). CR-148: the grid groups
 * cards into skill sections and flags the coach's weakest skill.
 */
export default function GameZoneShelf({ grade, onPlay }: { grade?: string; onPlay: (gameId: GameId) => void }) {
  const defs = GAME_DEFS.filter((d) => !grade || !d.grades || d.grades.includes(grade));
  const now = new Date();
  const featured: GameDef =
    defs[hashString(`${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`) % defs.length];
  const rest = defs.filter((d) => d.id !== featured.id);

  /* The kid's weakest skills (coach, needs >=3 answers of evidence) -
     a def is flagged when its skill IS the weak key, or maps onto a
     qb skill the coach flagged (vocabulary <-> vocabulary-recognition). */
  const weakKeys = new Set(grade ? weakSkillsFor(grade).map((w) => w.skillKey) : []);
  const isWeak = (def: GameDef) =>
    !!def.skill && (weakKeys.has(def.skill) || drillSkillsFor(def.skill).some((k) => weakKeys.has(k)));

  const sections = new Map<string, GameDef[]>();
  for (const d of rest) {
    const key = d.skill && SKILL_SECTIONS.includes(d.skill) ? d.skill : OTHER_SECTION;
    const list = sections.get(key) ?? [];
    list.push(d);
    sections.set(key, list);
  }
  const orderedSections = [...SKILL_SECTIONS, OTHER_SECTION]
    .filter((k) => sections.has(k))
    .map((k) => ({ key: k, label: k === OTHER_SECTION ? 'Khám phá' : skillLabel(k), defs: sections.get(k)! }));

  return (
    <div data-testid="game-zone-shelf" className="space-y-4">
      {/* Featured: a deterministic daily pick keeps the 15-game shelf
          curated instead of an undifferentiated wall. */}
      <button
        type="button"
        data-testid={`game-card-${featured.id}`}
        onClick={() => onPlay(featured.id)}
        className={gameHeroClass(featured.tone ?? 'amber')}
      >
        <span className="shrink-0" aria-hidden><GameArt art={featured.art} emoji={featured.emoji} artImage={featured.artImage} size="hero" animated /></span>
        <span className="min-w-0 flex-1">
          <span className="inline-block rounded-full bg-white/40 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-900 ring-1 ring-white/60">
            Trò chơi hôm nay
          </span>
          <span className="mt-1 block font-display text-lg font-extrabold leading-tight">
            {featured.title}
          </span>
          <span className="block text-xs font-semibold text-slate-900/90">{featured.tagline}</span>
        </span>
        <Stars id={featured.id} onCandy />
        {featured.fresh && <NewBadge />}
      </button>

      {orderedSections.map((section) => (
        <section key={section.key} data-testid={`game-section-${section.key}`}>
          <h3 className="mb-2 flex items-center gap-2 px-1 text-xs font-extrabold uppercase tracking-widest text-slate-500">
            {section.label}
            <span aria-hidden className="h-px flex-1 bg-slate-300/60" />
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {section.defs.map((def) => (
              <button
                key={def.id}
                type="button"
                data-testid={`game-card-${def.id}`}
                onClick={() => onPlay(def.id)}
                className={gameCardClass(def.tone ?? 'sky')}
              >
                {def.fresh && <NewBadge />}
                {isWeak(def) && <WeakBadge />}
                <span className={gameCardChip(def.tone ?? 'sky')}><GameArt art={def.art} emoji={def.emoji} artImage={def.artImage} /></span>
                <span className="font-display text-base font-extrabold leading-tight">
                  {def.title}
                </span>
                <span className="text-xs font-semibold leading-snug text-slate-600">{def.tagline}</span>
                <span className="flex items-center gap-1.5">
                  <Stars id={def.id} />
                  <TotalStars id={def.id} />
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}

      {/* Đảo bí mật keeps its own full-width row - it is a destination,
          not a game card inside a skill section. */}
      <div className="grid grid-cols-2 gap-3">
        <MysteryIslandCard gradeId={grade} />
      </div>
    </div>
  );
}
