import { test, expect } from '@playwright/test';
import { fastForwardThroughRounds1And2, goToNextRound, readRoundProgress } from './utils/batch-flow';
import { currentQuestionKind, currentQuestionKindOneOf, questionCard } from './utils/practice-flow';
import { runPronunciationRecordingRoundFallback } from './utils/round34-flow';

// Round 4 mixes describe-and-choose-image with picture-pair-matching (plan.md
// v8) - which kind shuffles first is not deterministic, so tests here only
// assert "a real Round 4 kind", never one specific kind, matching the
// pattern already used by round34-flow.ts and round-topic-spread.spec.ts.
const ROUND4_KINDS = ['describe-and-choose-image', 'picture-pair-matching'] as const;

/**
 * Covers plan.md v5/v6 Round 3 (pronunciation-recording -- AC19, AC24, Data-
 * Testid Contract Additions: record-button, recording-indicator,
 * pronunciation-feedback, mic-permission-denied-message,
 * speech-recognition-unsupported-message).
 *
 * SCOPE NOTE (read before editing): headless Chromium has no real
 * microphone input and Playwright cannot supply one, so this suite can
 * never exercise a genuine spoken-word transcription or a real
 * pronunciation score. Per plan.md v5's own Test Strategy Addition
 * ("Playwright's browser does not reliably support microphone input or
 * real SpeechRecognition in headless mode -- Round 3 E2E coverage should
 * verify the permission-denied and unsupported-browser fallback paths"),
 * this suite covers exactly the boundary that is realistically testable
 * end-to-end:
 *   1. record-button renders on a pronunciation-recording question and is
 *      clickable without crashing the page.
 *   2. disclosure copy about approximate (non-phoneme) scoring is visible
 *      near the record control before any interaction (AC19).
 *   3. the speech-recognition-unsupported-message fallback path (forced by
 *      deleting window.SpeechRecognition/webkitSpeechRecognition before the
 *      page loads) renders and does not block the Batch from reaching
 *      Round 4 (AC19).
 *   4. the mic-permission-denied-message fallback path (forced by a stub
 *      SpeechRecognition that reports a 'not-allowed' error, since headless
 *      Chromium has no microphone to grant permission for anyway, and the
 *      app itself no longer pre-flights a separate getUserMedia() call --
 *      see usePronunciationRecording.ts) renders and does not block the
 *      Batch from reaching Round 4 (AC19).
 *
 * These tests were written before Round 3 had a real implementation --
 * Round 3 was being built by another agent in parallel with this suite
 * (plan.md v6 "Build Round 3 and Round 4 sequentially, not in parallel").
 * The exact mechanism the real implementation uses to detect
 * mic-permission-denied vs. speech-recognition-unsupported is therefore an
 * informed assumption (the two standard, idiomatic browser APIs for each
 * check -- there is no other way to feature-detect SpeechRecognition, and
 * an explicit getUserMedia call is the most direct way to get an
 * unambiguous permission-denied signal), not a verified fact -- see
 * ./utils/batch-flow.ts's advanceRound3FallbackQuestion doc comment for the
 * full list of assumptions. If the real implementation detects these
 * conditions differently, the mocks below (and that helper) are what need
 * revision; the assertions on the resulting UI contract (record-button, the
 * two fallback message testids, disclosure copy, non-blocking flow into
 * Round 4) remain correct regardless of the trigger mechanism.
 */
test.describe('Batch/Round: Round 3 (pronunciation-recording)', () => {
  test('record-button renders on a pronunciation-recording question and is clickable without crashing the page', async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    const onPageError = (error: Error) => pageErrors.push(error);
    page.on('pageerror', onPageError);

    try {
      await fastForwardThroughRounds1And2(page);

      await test.step('Round 3 begins at round 3 of 4 with pronunciation-recording questions', async () => {
        const roundProgress = await readRoundProgress(page);
        expect(roundProgress.current).toBe(3);
        expect(roundProgress.total).toBe(4);
        await currentQuestionKind(page, 'pronunciation-recording');
      });

      const recordButton = page.getByTestId('record-button');
      await expect(
        recordButton,
        'record-button must render for a pronunciation-recording question (plan.md v5 Data-Testid Contract)',
      ).toBeVisible();
      await expect(recordButton).toBeEnabled();

      await recordButton.click();

      await test.step('clicking record-button produces at least one observable reaction, proving it is wired to something real', async () => {
        const reaction = await Promise.race([
          page
            .getByTestId('recording-indicator')
            .waitFor({ state: 'visible', timeout: 8_000 })
            .then(() => 'recording-indicator')
            .catch(() => null),
          page
            .getByTestId('pronunciation-feedback')
            .waitFor({ state: 'visible', timeout: 8_000 })
            .then(() => 'pronunciation-feedback')
            .catch(() => null),
          page
            .getByTestId('mic-permission-denied-message')
            .waitFor({ state: 'visible', timeout: 8_000 })
            .then(() => 'mic-permission-denied-message')
            .catch(() => null),
          page
            .getByTestId('speech-recognition-unsupported-message')
            .waitFor({ state: 'visible', timeout: 8_000 })
            .then(() => 'speech-recognition-unsupported-message')
            .catch(() => null),
        ]);
        expect(
          reaction,
          'expected clicking record-button to produce at least one observable reaction (recording-indicator, ' +
            'pronunciation-feedback, or a permission/support fallback message) within 8s -- a silently inert ' +
            'control would be a real bug, not a test-technique gap',
        ).not.toBeNull();
      });

      await expect(questionCard(page), 'the question card must still be present after clicking record-button (no crash)').toBeVisible();
    } finally {
      page.off('pageerror', onPageError);
    }

    expect(
      pageErrors,
      `page threw uncaught error(s) after clicking record-button: ${pageErrors.map((error) => error.message).join('; ')}`,
    ).toEqual([]);
  });

  test('disclosure copy about approximate (non-phoneme) scoring is visible near the record control before any interaction', async ({
    page,
  }) => {
    await fastForwardThroughRounds1And2(page);
    await currentQuestionKind(page, 'pronunciation-recording');

    // Heuristic, not an exact-wording check (deliberately -- exact copy is
    // an implementation/content decision, not this suite's to pin): the
    // question card's total visible text, before any interaction, must be
    // meaningfully longer than bare UI chrome (a progress line + a button
    // label), which is the observable signature of AC19's required
    // disclosure paragraph being present near the record control.
    const cardText = (await questionCard(page).innerText()).trim();
    expect(
      cardText.length,
      'expected the pronunciation-recording question card to include substantive disclosure copy near the record ' +
        'control (plan.md v5 AC19: "Disclosure copy near the record button noting this is an approximate check, ' +
        `not a certified pronunciation score"), but its total visible text was only ${cardText.length} characters: "${cardText}"`,
    ).toBeGreaterThan(40);
  });

  test('speech-recognition-unsupported-message renders when the browser lacks SpeechRecognition support, and the Batch still reaches Round 4', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      // Simulate a browser without SpeechRecognition support (e.g. Firefox)
      // -- plan.md v5 Round 3 "Graceful degradation on browsers without
      // SpeechRecognition support".
      // @ts-expect-error deliberately removing a browser API for this test
      delete window.SpeechRecognition;
      // @ts-expect-error deliberately removing a browser API for this test
      delete window.webkitSpeechRecognition;
    });

    await fastForwardThroughRounds1And2(page);
    await currentQuestionKind(page, 'pronunciation-recording');

    await runPronunciationRecordingRoundFallback(page, 'speech-recognition-unsupported');
    await goToNextRound(page);

    await test.step('the Batch reaches Round 4 after the unsupported-browser fallback, never getting stuck', async () => {
      const roundProgress = await readRoundProgress(page);
      expect(roundProgress.current).toBe(4);
      expect(roundProgress.total).toBe(4);
      await currentQuestionKindOneOf(page, [...ROUND4_KINDS]);
    });
  });

  test('mic-permission-denied-message renders when microphone access is denied, and the Batch still reaches Round 4', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      // Simulate the user denying the microphone permission prompt --
      // plan.md v5 Round 3 "Microphone permission flow (request, handle
      // denial gracefully...)". The app no longer pre-flights a separate
      // getUserMedia() call before starting recognition (removed to avoid a
      // double mic-acquisition race on Android Chrome -- see
      // usePronunciationRecording.ts), so permission denial is simulated by
      // making SpeechRecognition itself report a 'not-allowed' error, the
      // same signal the app's onerror handler already reacts to.
      class DenyingRecognition {
        lang = '';
        continuous = false;
        interimResults = false;
        maxAlternatives = 1;
        onresult: ((event: unknown) => void) | null = null;
        onerror: ((event: { error: string }) => void) | null = null;
        onend: (() => void) | null = null;

        start() {
          setTimeout(() => this.onerror?.({ error: 'not-allowed' }), 0);
        }

        stop() {}
        abort() {}
      }

      // @ts-expect-error test-only global stub, not a full SpeechRecognition type
      window.SpeechRecognition = DenyingRecognition;
      // @ts-expect-error test-only global stub, not a full SpeechRecognition type
      window.webkitSpeechRecognition = DenyingRecognition;
    });

    await fastForwardThroughRounds1And2(page);
    await currentQuestionKind(page, 'pronunciation-recording');

    await runPronunciationRecordingRoundFallback(page, 'mic-permission-denied');
    await goToNextRound(page);

    await test.step('the Batch reaches Round 4 after the permission-denied fallback, never getting stuck', async () => {
      const roundProgress = await readRoundProgress(page);
      expect(roundProgress.current).toBe(4);
      expect(roundProgress.total).toBe(4);
      await currentQuestionKindOneOf(page, [...ROUND4_KINDS]);
    });
  });
});
