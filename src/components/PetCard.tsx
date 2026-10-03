import { useState } from 'react';
import {
  choosePet,
  getPet,
  markPetStageSeen,
  PET_SPECIES,
  PET_STAGE_XP,
  PET_XP_PER_CORRECT,
  type PetSpecies,
} from '../lib/engagement/store';
import { CARD } from '../lib/ui/tokens';

/**
 * CR-36: companion pet on the grade home screen. Every correct answer in
 * any mode feeds the pet (recordCorrectAnswers hook); the pet evolves
 * egg -> baby -> kid -> adult on XP thresholds. The one-time evolution
 * congrats shows until marked seen.
 */
export default function PetCard() {
  const [pet, setPet] = useState(() => getPet());

  function pick(species: PetSpecies): void {
    choosePet(species);
    setPet(getPet());
  }

  function dismissCongrats(): void {
    markPetStageSeen();
    setPet(getPet());
  }

  const stageStart = PET_STAGE_XP[pet.stage]!;
  const stageEnd = pet.stage + 1 < PET_STAGE_XP.length ? PET_STAGE_XP[pet.stage + 1]! : null;
  const pct = stageEnd === null ? 100 : Math.round(((pet.xp - stageStart) / (stageEnd - stageStart)) * 100);

  return (
    <div data-testid="pet-card" className={`mt-4 ${CARD} text-left`}>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-extrabold text-amber-300">🐾 Bạn đồng hành</h2>
        <span className="rounded-full bg-violet-500/20 px-3 py-1 text-sm font-extrabold text-violet-300 ring-1 ring-violet-400/40">
          {pet.xp} XP
        </span>
      </div>

      {pet.justEvolved && pet.species && (
        <div
          data-testid="pet-evolved"
          className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-amber-400/15 p-3 ring-1 ring-amber-400/40"
        >
          <p className="text-sm font-extrabold text-amber-200">
            🎉 {pet.nameVi} vừa lớn lên thành {pet.stageName}! Giỏi quá!
          </p>
          <button
            type="button"
            data-testid="pet-evolved-ok"
            onClick={dismissCongrats}
            className="shrink-0 rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-extrabold text-amber-950 transition hover:bg-amber-300 active:scale-95"
          >
            Tuyệt!
          </button>
        </div>
      )}

      {pet.species === null ? (
        <div className="mt-3">
          <p className="text-sm font-semibold text-slate-300">
            Chọn một bạn nhỏ đồng hành cùng em - trả lời đúng là bạn ấy lớn lên!
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(Object.keys(PET_SPECIES) as PetSpecies[]).map((species) => (
              <button
                key={species}
                type="button"
                data-testid={`pet-pick-${species}`}
                onClick={() => pick(species)}
                className="rounded-2xl bg-[#16232e] p-3 text-center ring-1 ring-white/10 transition hover:bg-[#1d3040] hover:ring-amber-400/50 active:scale-95"
              >
                <div className="text-4xl">{PET_SPECIES[species].emojis[1]}</div>
                <div className="mt-1 text-sm font-extrabold text-white">{PET_SPECIES[species].nameVi}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-4 rounded-2xl bg-[#16232e] p-4 ring-1 ring-white/10">
          <div data-testid="pet-emoji" className="text-6xl">{pet.emoji}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-extrabold text-white">{pet.nameVi} - {pet.stageName}</span>
              {pet.xpToNext !== null && (
                <span className="text-xs font-bold text-slate-400">còn {pet.xpToNext} XP</span>
              )}
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                data-testid="pet-xp-bar"
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-all motion-reduce:transition-none"
                style={{ width: `${Math.max(4, pct)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs font-semibold text-slate-400">
              {stageEnd === null
                ? 'Bạn ấy đã trưởng thành - cùng chinh phục tiếp nhé!'
                : `Mỗi câu đúng = +${PET_XP_PER_CORRECT} XP để bạn ấy lớn lên`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
