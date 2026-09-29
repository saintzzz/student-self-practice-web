import { CHIP_AMBER, CHIP_AMBER_URGENT } from '../lib/ui/tokens';
import { EmojiVisual } from './EmojiVisual';

interface RoundTimerProps {
  secondsRemaining: number;
}

function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Visible countdown for the active Round's 5:00 timer (plan.md v7 "Round
 * Timer", AC27) - e.g. "⏱ 04:32". Turns red in the final 30 seconds as a
 * gentle urgency cue; the underlying countdown logic lives in
 * `useRoundTimer`, this component only renders the current value. CR-09:
 * rendered as a header chip inside the shared play strip.
 */
export default function RoundTimer({ secondsRemaining }: RoundTimerProps) {
  const isUrgent = secondsRemaining <= 30;

  return (
    <p data-testid="round-timer" className={isUrgent ? CHIP_AMBER_URGENT : CHIP_AMBER}>
      <EmojiVisual emoji="⏱️" />
      {formatTimer(secondsRemaining)}
    </p>
  );
}
