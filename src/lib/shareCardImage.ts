/**
 * kids-UX step 11 (design-kids-ux s3.8.b, AC-9.2): the shareable
 * achievement image. Drawn client-side on a Canvas 2D - no new dependency,
 * no network. This module is only ever lazy-imported from ShareCard so the
 * canvas code stays out of the entry bundle.
 *
 * Text contract: `buildShareLines` is the single place that decides which
 * strings land on the card (tested pure function). The caller composes the
 * achievement copy; the app-name footer is fixed here so a caller cannot
 * accidentally drop or rewrite the brand line.
 */

export const SHARE_CARD_WIDTH = 1200;
export const SHARE_CARD_HEIGHT = 630;
/** Fixed footer on every generated card. */
export const SHARE_APP_NAME = 'English Arena';
const SHARE_APP_URL = 'ea.vieschool.com';

/**
 * Ordered text the card draws: [title, ...body lines, footer].
 * Empty/blank body lines are dropped so callers can pass optional lines.
 */
export function buildShareLines(title: string, lines: readonly string[]): string[] {
  return [title, ...lines.filter((line) => line.trim().length > 0), `${SHARE_APP_NAME} - ${SHARE_APP_URL}`];
}

/** Draws the card and resolves the PNG blob, or null when Canvas 2D is
 *  unavailable (very old webviews - the caller falls back to error copy). */
export async function renderShareCardPng(title: string, lines: readonly string[]): Promise<Blob | null> {
  // Wait for the brand fonts (Baloo 2 / Be Vietnam Pro) so the card does
  // not render in fallback glyphs on a cold load.
  try {
    await document.fonts?.ready;
  } catch {
    // font readiness is best-effort - draw anyway.
  }
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_CARD_WIDTH;
  canvas.height = SHARE_CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const [heading, ...rest] = buildShareLines(title, lines);
  const footer = rest.pop() ?? SHARE_APP_NAME;

  // Navy brand gradient + gold double frame.
  const bg = ctx.createLinearGradient(0, 0, 0, SHARE_CARD_HEIGHT);
  bg.addColorStop(0, '#0b1224');
  bg.addColorStop(1, '#162C55');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);
  ctx.strokeStyle = '#fbbf24'; // amber-400
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, SHARE_CARD_WIDTH - 48, SHARE_CARD_HEIGHT - 48);
  ctx.strokeStyle = '#f59e0b'; // amber-500
  ctx.lineWidth = 2;
  ctx.strokeRect(38, 38, SHARE_CARD_WIDTH - 76, SHARE_CARD_HEIGHT - 76);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Mascot mark: the app's pig emoji is the icon language (Twemoji fallback
  // renders everywhere fillText does).
  ctx.font = '96px "Baloo 2", "Be Vietnam Pro", sans-serif';
  ctx.fillText('🐷', SHARE_CARD_WIDTH / 2, 130);

  // Title in gold display type.
  ctx.fillStyle = '#fbbf24';
  ctx.font = '800 64px "Baloo 2", "Be Vietnam Pro", sans-serif';
  ctx.fillText(heading ?? '', SHARE_CARD_WIDTH / 2, 260);

  // Body lines.
  ctx.fillStyle = '#e2e8f0'; // slate-200
  ctx.font = '400 38px "Be Vietnam Pro", sans-serif';
  rest.forEach((line, i) => {
    ctx.fillText(line, SHARE_CARD_WIDTH / 2, 360 + i * 56);
  });

  // Fixed brand footer.
  ctx.fillStyle = '#fcd34d'; // amber-300
  ctx.font = '600 30px "Be Vietnam Pro", sans-serif';
  ctx.fillText(footer, SHARE_CARD_WIDTH / 2, SHARE_CARD_HEIGHT - 58);

  return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
}
