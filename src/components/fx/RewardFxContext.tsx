import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { IconStar } from '../icons';

/**
 * CR-82 (ARCHITECTURE-v5 D-17, spec s16.2): the star-fly reward channel.
 * `BatchScreen` mounts one provider around the chrome + question card;
 * `LiveScore` registers its chip as the score target; `QuestionCard`
 * calls `fireStar(origin)` on a correct verdict.
 *
 *  - Full motion: one fixed `IconStar` flies from the origin rect centre
 *    to the chip centre along `--fx/--fy` (star-fly 600ms ease-out-expo).
 *  - Reduced motion: no fly - the registered chip gets a 600ms
 *    `ring-2 ring-amber-300` highlight instead (same information).
 *
 * The fly layer is pointer-events-none and aria-hidden - purely
 * decorative, so it never intersects the a11y tree or hit-testing.
 */

export interface RewardFx {
  registerScoreTarget: (el: HTMLElement | null) => void;
  fireStar: (origin: DOMRect) => void;
}

const NOOP_FX: RewardFx = {
  registerScoreTarget: () => {},
  fireStar: () => {},
};

const RewardFxContext = createContext<RewardFx>(NOOP_FX);

export function useRewardFx(): RewardFx {
  return useContext(RewardFxContext);
}

interface Fly {
  id: number;
  x: number;
  y: number;
  fx: number;
  fy: number;
}

const FLY_MS = 600;
const HIGHLIGHT_MS = 600;

export function RewardFxProvider({ children }: { children: ReactNode }) {
  const reducedMotion = usePrefersReducedMotion();
  const targetRef = useRef<HTMLElement | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flies, setFlies] = useState<Fly[]>([]);
  const nextId = useRef(0);

  const registerScoreTarget = useCallback((el: HTMLElement | null) => {
    targetRef.current = el;
  }, []);

  const fireStar = useCallback(
    (origin: DOMRect) => {
      const target = targetRef.current;
      if (!target) return;

      if (reducedMotion) {
        /* Reduced-motion twin: the chip highlight carries the same
           "+1 earned" signal - no flight. */
        target.classList.add('ring-2', 'ring-amber-300');
        if (highlightTimer.current) clearTimeout(highlightTimer.current);
        highlightTimer.current = setTimeout(() => {
          target.classList.remove('ring-2', 'ring-amber-300');
          highlightTimer.current = null;
        }, HIGHLIGHT_MS);
        return;
      }

      const tr = target.getBoundingClientRect();
      const ox = origin.left + origin.width / 2;
      const oy = origin.top + origin.height / 2;
      const id = ++nextId.current;
      setFlies((f) => [
        ...f,
        { id, x: ox, y: oy, fx: tr.left + tr.width / 2 - ox, fy: tr.top + tr.height / 2 - oy },
      ]);
      setTimeout(() => {
        setFlies((f) => f.filter((fly) => fly.id !== id));
      }, FLY_MS + 60);
    },
    [reducedMotion],
  );

  return (
    <RewardFxContext.Provider value={{ registerScoreTarget, fireStar }}>
      {children}
      {/* StarFlyLayer - decorative fixed layer, never hit-testable. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60]">
        {flies.map((fly) => (
          <span
            key={fly.id}
            data-testid="star-fly"
            className="animate-star-fly absolute"
            style={{
              left: fly.x - 12,
              top: fly.y - 12,
              ['--fx' as string]: `${fly.fx}px`,
              ['--fy' as string]: `${fly.fy}px`,
            }}
          >
            <IconStar size={24} className="fill-amber-300 text-amber-300" />
          </span>
        ))}
      </div>
    </RewardFxContext.Provider>
  );
}
