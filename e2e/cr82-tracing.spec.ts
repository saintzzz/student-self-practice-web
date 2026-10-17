/**
 * CR-82 (spec s12, ARCHITECTURE-v5 D-01/D-02/D-10): letter-tracing e2e.
 *
 * Runs a real grade-1 batch - Round 1 places tracing items at indexes 3
 * and 7 (0-based). Structural only: the traced letter is read from the
 * slate's aria-label ("Khung tô chữ a"), and pointer paths are projected
 * from the authored stroke data in src/data/tracing/strokes.ts (the same
 * 0-100 box the guide layer renders), never from vocabulary.
 *
 * Verified:
 *  - a faithful trace marks every stroke done and earns the clean-pass
 *    verdict "Em tô đẹp quá!" (spec s12.6);
 *  - off-path traces count attempts (data-tracing-attempts) and after 3
 *    failures the stroke auto-draws (data-state="auto"), yielding the
 *    gentle wrong verdict (spec s12.5 attempt ladder);
 *  - the keyboard/switch path ("Tô tự động từng nét") completes every
 *    stroke assisted and still submits a correct verdict (R-v5-07).
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { advanceToQuestionKind, startBatch } from './utils/batch-flow';
import { GLYPH_STROKES, type TracingStrokePoint } from '../src/data/tracing/strokes';

/** Reads the target letter from the slate's accessible name. */
async function tracedLetter(card: Locator): Promise<string> {
  const label = await card.getByTestId('tracing-slate').getAttribute('aria-label');
  expect(label, 'tracing slate must announce "Khung tô chữ <letter>"').toBeTruthy();
  return label!.replace(/^Khung tô chữ\s*/, '').trim();
}

/**
 * Draws one authored stroke onto the canvas with a real mouse pointer.
 * Guide coordinates live in a 0-100 box that maps onto the canvas rect.
 */
async function drawStroke(
  page: Page,
  canvas: Locator,
  stroke: ReadonlyArray<TracingStrokePoint>,
): Promise<void> {
  const box = await canvas.boundingBox();
  expect(box, 'tracing canvas must have a laid-out rect').toBeTruthy();
  const pts = stroke.map(([x, y]) => ({
    x: box!.x + (x / 100) * box!.width,
    y: box!.y + (y / 100) * box!.height,
  }));
  await page.mouse.move(pts[0].x, pts[0].y);
  await page.mouse.down();
  for (const p of pts.slice(1)) {
    await page.mouse.move(p.x, p.y, { steps: 4 });
  }
  await page.mouse.up();
}

/** A path that starts on the guide but veers off - never covers it. */
function offPath(stroke: ReadonlyArray<TracingStrokePoint>): TracingStrokePoint[] {
  return [
    stroke[0],
    ...stroke.slice(1).map(([x, y]): TracingStrokePoint => [
      Math.min(97, x + 45),
      Math.max(3, y - 40),
    ]),
  ];
}

async function readAttempts(card: Locator): Promise<number[]> {
  const raw = await card.locator('[data-tracing-attempts]').getAttribute('data-tracing-attempts');
  return JSON.parse(raw ?? '[]') as number[];
}

test('pass: a faithful trace marks strokes done and earns the clean-pass headline', async ({
  page,
}) => {
  await startBatch(page);
  const card = await advanceToQuestionKind(page, 'letter-tracing');
  const letter = await tracedLetter(card);
  const glyph = GLYPH_STROKES[letter];
  expect(glyph, `strokes.ts must define glyph "${letter}"`).toBeTruthy();

  const canvas = card.getByTestId('tracing-canvas');
  await expect(canvas).toBeVisible();

  for (let i = 0; i < glyph.strokes.length; i += 1) {
    await drawStroke(page, canvas, glyph.strokes[i]);
    await expect(card.getByTestId(`tracing-stroke-${i}`)).toHaveAttribute('data-state', 'done');
  }

  const feedback = page.getByTestId('answer-feedback');
  await expect(feedback).toBeVisible({ timeout: 10_000 });
  await expect(feedback).toHaveAttribute('data-correct', 'true');
  await expect(feedback).toContainText('Em tô đẹp quá!');
});

test('fail ladder: 3 off-path traces auto-draw the stroke, then the gentle verdict', async ({
  page,
}) => {
  await startBatch(page);
  const card = await advanceToQuestionKind(page, 'letter-tracing');
  const letter = await tracedLetter(card);
  const glyph = GLYPH_STROKES[letter]!;
  const canvas = card.getByTestId('tracing-canvas');
  const stroke0 = card.getByTestId('tracing-stroke-0');

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await drawStroke(page, canvas, offPath(glyph.strokes[0]));
    if (attempt < 3) {
      const attempts = await readAttempts(card);
      expect(attempts[0], `attempt ${attempt} must be counted`).toBe(attempt);
      await expect(stroke0).toHaveAttribute('data-state', 'active');
    }
  }
  /* Third failure -> the stroke auto-draws itself (spec s12.5). */
  await expect(stroke0).toHaveAttribute('data-state', 'auto');

  /* Trace the remaining strokes faithfully - NOT the keyboard path
     (R-v5-07 submits isCorrect=true assisted, which would mask the
     gentle verdict under test). With stroke 0 'auto' rather than
     'done', the s12.5 formula yields the wrong verdict. */
  for (let i = 1; i < glyph.strokes.length; i += 1) {
    await drawStroke(page, canvas, glyph.strokes[i]);
    await expect(card.getByTestId(`tracing-stroke-${i}`)).toHaveAttribute('data-state', 'done');
  }
  const feedback = page.getByTestId('answer-feedback');
  await expect(feedback).toBeVisible({ timeout: 10_000 });
  await expect(feedback).toHaveAttribute('data-correct', 'false');
  await expect(feedback).toContainText('Em tô xong rồi - lần sau mình tự tô hết nhé!');
});

test('keyboard path: Enter on "Tô tự động từng nét" completes assisted and submits', async ({
  page,
}) => {
  await startBatch(page);
  const card = await advanceToQuestionKind(page, 'letter-tracing');
  const letter = await tracedLetter(card);
  const glyph = GLYPH_STROKES[letter]!;

  const auto = card.getByTestId('tracing-auto-step');
  await expect(auto).toBeVisible();
  for (let i = 0; i < glyph.strokes.length; i += 1) {
    await auto.press('Enter');
    if (i < glyph.strokes.length - 1) {
      await expect(card.getByTestId(`tracing-stroke-${i}`)).toHaveAttribute('data-state', 'auto');
    }
  }
  /* The last stroke submits: every stroke is auto -> assisted correct. */
  await expect(card.getByTestId(`tracing-stroke-${glyph.strokes.length - 1}`)).toHaveAttribute(
    'data-state',
    'auto',
  );
  const feedback = page.getByTestId('answer-feedback');
  await expect(feedback).toBeVisible({ timeout: 10_000 });
  await expect(feedback).toHaveAttribute('data-correct', 'true');
});
