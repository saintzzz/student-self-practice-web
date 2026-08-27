import { test, expect } from '@playwright/test';
import {
  selectGrade,
  selectTopic,
  readQuestionProgress,
  currentQuestionKind,
  discoverCurrentQuestionAnswer,
  playAudio,
  goToNextQuestion,
} from './utils/practice-flow';

/**
 * Covers plan.md AC5's audio-resilience requirement: headless Chromium may
 * expose zero speechSynthesis voices, but clicking play-audio-button must
 * never throw an uncaught error or crash the page, and the app must stay
 * fully responsive afterward (the input/submit flow still works). This does
 * not assert actual audio playback, only that the app survives the call and
 * keeps functioning.
 */
test.describe('Student self-practice: audio playback resilience', () => {
  test('play-audio-button does not crash the page and the input/submit flow keeps working afterward', async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));

    await page.goto('/');
    await selectGrade(page, 0);
    await selectTopic(page, 0);

    const { total: totalQuestions } = await readQuestionProgress(page);

    let exercisedListeningQuestion = false;
    let q = 1;
    while (!exercisedListeningQuestion && q <= totalQuestions) {
      const kind = await currentQuestionKind(page);

      if (kind === 'listening-fill-blank') {
        exercisedListeningQuestion = true;

        // Click play, then again to exercise the "Nghe lai" (listen again)
        // affordance, which re-triggers the same speech synthesis call per
        // plan.md. Neither click should throw or crash the page even with
        // zero available TTS voices.
        await playAudio(page);
        await playAudio(page);

        // The app must remain responsive: the input/submit flow still works
        // via the Enter key (AC5's second accepted submit method) and
        // yields feedback.
        const input = page.getByTestId('answer-input');
        await input.fill('resilience-check-guess');
        await input.press('Enter');
        await expect(page.getByTestId('answer-feedback')).toBeVisible();
      } else {
        // Answer minimally to reach a listening-fill-blank question later
        // in the session; the outcome does not matter for this scenario.
        // discoverCurrentQuestionAnswer branches correctly on whichever of
        // the 4 v3 kinds is showing (image-choice/counting-image use
        // option-{index}, extra-letter uses letter-tile-{index}), unlike a
        // blind option click which would hang on a non-option kind.
        await discoverCurrentQuestionAnswer(page);
        await goToNextQuestion(page);
        q++;
      }
    }

    expect(
      exercisedListeningQuestion,
      'this session had no listening-fill-blank question to exercise the audio button on',
    ).toBe(true);
    expect(
      pageErrors,
      `page threw uncaught error(s) after clicking play-audio-button: ${pageErrors
        .map((error) => error.message)
        .join('; ')}`,
    ).toEqual([]);
  });
});
