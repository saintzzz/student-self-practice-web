import { type Locator, type Page } from '@playwright/test';
import { type AnswerOutcome, questionCard, readElementOutcome } from './practice-flow';

/**
 * Option-button ("pick 1 of 4") primitives, split out of practice-flow.ts to
 * keep both files under the project's ~200-line file-size guideline
 * (docs/code-standards.md / development-rules.md "File Size Management").
 * This shell is shared by image-choice, counting-image (pre-existing kinds)
 * and Round 4's describe-and-choose-image (plan.md v6, "Data-Testid
 * Contract Additions": Round 4 "reuses option-{index}",
 * `data-description-type="count"|"negation"` on the question container).
 */

export type DescriptionType = 'count' | 'negation';

/**
 * The 4-option "pick one" button shell shared by image-choice,
 * counting-image, and Round 4's describe-and-choose-image.
 */
export function optionButtons(page: Page): Locator {
  return questionCard(page).locator('[data-testid^="option-"]');
}

/**
 * Reads Round 4's data-description-type attribute off question-card.
 * Throws on any other value rather than returning it unchecked, since this
 * is an enum-shaped contract, not free-form copy.
 */
export async function currentDescriptionType(page: Page): Promise<DescriptionType> {
  const value = await questionCard(page).getAttribute('data-description-type');
  if (value !== 'count' && value !== 'negation') {
    throw new Error(`expected question-card data-description-type to be "count" or "negation", got: "${value}".`);
  }
  return value;
}

export interface OptionAnswerResult {
  outcome: AnswerOutcome;
  clickedIndex: number;
  correctIndex: number;
  optionCount: number;
}

/**
 * Clicks the option at clickedIndex, then reads the post-answer styling
 * signal (readElementOutcome) off every rendered option-{index} button to
 * discover which single option the app marks as correct -- the same
 * discovery-from-revealed-state technique as answerExtraLetterTile /
 * submitListeningAnswer in practice-flow.ts, applied to the option-button
 * shell shared by image-choice/counting-image/describe-and-choose-image
 * (src/components/optionButtonStyle.ts's getOptionButtonClassName always
 * colors the correct index green and a wrong clicked index red). Throws if
 * zero or more than one option shows a 'correct' signal, since exactly one
 * correct option is a hard invariant for this question shell (plan.md v5
 * Round 4 Negation Design: "the single-correct-answer invariant must
 * hold").
 */
export async function answerOptionQuestion(page: Page, clickedIndex: number): Promise<OptionAnswerResult> {
  const options = optionButtons(page);
  const optionCount = await options.count();
  await options.nth(clickedIndex).click();

  const outcomes: AnswerOutcome[] = [];
  for (let i = 0; i < optionCount; i++) {
    outcomes.push(await readElementOutcome(options.nth(i)));
  }

  const correctIndices = outcomes.reduce<number[]>((acc, outcome, index) => {
    if (outcome === 'correct') acc.push(index);
    return acc;
  }, []);

  if (correctIndices.length !== 1) {
    throw new Error(
      `expected exactly one option-{index} to show a 'correct' styling signal after answering, got ` +
        `${correctIndices.length} (indices: [${correctIndices.join(', ')}], all outcomes: [${outcomes.join(', ')}]).`,
    );
  }

  const correctIndex = correctIndices[0];
  const outcome: AnswerOutcome = clickedIndex === correctIndex ? 'correct' : 'incorrect';
  return { outcome, clickedIndex, correctIndex, optionCount };
}
