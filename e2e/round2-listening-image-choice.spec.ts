import { test, expect } from '@playwright/test';
import { startBatch, runExtraLetterRound, goToNextRound } from './utils/batch-flow';
import { currentQuestionKindOneOf, goToNextQuestion, playAudio, readQuestionProgress, submitListeningAnswer } from './utils/practice-flow';
import { answerOptionQuestion, optionButtons } from './utils/option-flow';

/**
 * Covers plan.md v8 "Round 2 Addition: Listening Image-Choice" / AC30 in
 * depth -- the listening-image-choice-specific slice of Round 2 coverage.
 * The plays-through-the-whole-mixed-round coverage (both kinds appearing,
 * overall scoring) lives in round2-listening-sentence.spec.ts, updated for
 * the v8 mix; this file focuses only on what item 2 of this task asks for:
 * play-audio does not crash, exactly one of 4 options is correct, and a
 * wrong answer reveals the correct option.
 *
 * Written BEFORE a real listening-image-choice implementation existed
 * (built by another agent in parallel with this suite). If no
 * listening-image-choice question ever appears within a Round 2 pass, this
 * test fails with a clear "expected at least one listening-image-choice
 * question" message -- that is the expected signal of an in-progress/
 * not-yet-landed parallel build, not a test bug. See
 * plans/reports/tester-260831-student-self-practice-v8-listening-pairmatching.md
 * for pass/fail status.
 *
 * ASSUMPTIONS about listening-image-choice's DOM (informed by plan.md v8's
 * spec text, not yet a verified implementation when this was written):
 * reuses the option-{index} 4-option shell verbatim (plan.md: "reuses the
 * existing option-{index} 4-option shell"), so the same discover-the-
 * correct-option-from-post-answer-styling technique as Round 4's
 * describe-and-choose-image (via answerOptionQuestion) applies unchanged;
 * and reuses play-audio-button (plan.md: "play-audio-button likely reused
 * too"). If the real implementation differs, this file is what needs
 * revision, not necessarily the underlying answerOptionQuestion/playAudio
 * helpers (shared, already-verified primitives).
 *
 * Never hardcodes any vocabulary/word/emoji content -- the correct option is
 * discovered from the app's own post-answer styling signal, same technique
 * as every other option-shell kind in this suite.
 */
test.describe('Batch/Round: Round 2 listening-image-choice (v8 addition)', () => {
  test('play-audio does not crash, every listening-image-choice question has exactly one correct option, and a wrong pick reveals the correct one', async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    const onPageError = (error: Error) => pageErrors.push(error);
    page.on('pageerror', onPageError);

    await startBatch(page);
    await runExtraLetterRound(page);
    await goToNextRound(page);

    const { total } = await readQuestionProgress(page);
    let imageChoiceCount = 0;
    let audioExercised = false;
    let foundWrongCase = false;

    try {
      for (let q = 1; q <= total; q++) {
        const progress = await readQuestionProgress(page);
        expect(progress.current, `expected question ${q} of Round 2`).toBe(q);
        const kind = await currentQuestionKindOneOf(page, ['listening-sentence-fill-blank', 'listening-image-choice']);

        if (kind === 'listening-sentence-fill-blank') {
          // Not under test here -- skip quickly with the same guaranteed-
          // wrong technique used everywhere else in this suite, so this test
          // reaches every listening-image-choice question in the round
          // without needing to know sentence/vocabulary content.
          await submitListeningAnswer(page, '0000');
          await goToNextQuestion(page);
          continue;
        }

        imageChoiceCount++;

        if (!audioExercised) {
          audioExercised = true;
          await test.step(`question ${q}: play-audio-button (incl. "listen again") does not crash the page`, async () => {
            await playAudio(page);
            await playAudio(page);
          });
        }

        const optionCount = await optionButtons(page).count();
        expect(optionCount, `question ${q} (listening-image-choice): expected exactly 4 options`).toBe(4);

        // Structural choice (always option index 0), never a hardcoded
        // content assumption. answerOptionQuestion itself enforces the
        // "exactly one correct option" invariant, throwing otherwise -- a
        // clean run through this loop is itself proof of that invariant
        // holding for every listening-image-choice question seen.
        const result = await answerOptionQuestion(page, 0);

        if (!foundWrongCase && result.outcome === 'incorrect') {
          foundWrongCase = true;
          await test.step(`question ${q}: a wrong pick shows incorrect styling on the clicked option and reveals the correct option`, async () => {
            expect(result.clickedIndex).not.toBe(result.correctIndex);
            const correctOptionText = (await optionButtons(page).nth(result.correctIndex).innerText()).trim();
            expect(
              correctOptionText.length,
              'expected the revealed correct option to have real (non-empty) content',
            ).toBeGreaterThan(0);
            const optionsCount = await optionButtons(page).count();
            for (let i = 0; i < optionsCount; i++) {
              await expect(
                optionButtons(page).nth(i),
                `option-${i} must be disabled once the question is answered (no further picks allowed)`,
              ).toBeDisabled();
            }
          });
        }

        await goToNextQuestion(page);
      }
    } finally {
      page.off('pageerror', onPageError);
    }

    expect(
      imageChoiceCount,
      `expected at least one listening-image-choice question within this ${total}-question Round 2 pass (plan.md v8 AC30) -- ` +
        'got none. This is the expected signal if the v8 listening-image-choice addition has not landed yet, not a test bug.',
    ).toBeGreaterThan(0);

    // Reached only if imageChoiceCount > 0 (the assertion above already threw
    // otherwise), so this checks a real "did we ever see a wrong pick"
    // outcome across those questions.
    expect(
      foundWrongCase,
      `expected at least one listening-image-choice question (out of ${imageChoiceCount} seen) where clicking option 0 was ` +
        'the wrong answer, which is where the wrong-answer-reveals-correct-option assertions above ran -- getting all of ' +
        'them correct by always picking option 0 is possible in principle (each has 4 options) but increasingly unlikely ' +
        'the more such questions appear in a single round; if this ever fires with imageChoiceCount > 2, it is worth ' +
        'investigating rather than assuming test flakiness',
    ).toBe(true);

    expect(
      pageErrors,
      `page threw uncaught error(s) during this Round 2 pass: ${pageErrors.map((error) => error.message).join('; ')}`,
    ).toEqual([]);
  });
});
