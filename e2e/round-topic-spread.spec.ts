import { test, expect } from '@playwright/test';
import { fastForwardThroughRounds1And2, goToNextRound } from './utils/batch-flow';
import { runDescribeAndChooseImageRound, runPronunciationRecordingRoundFallback } from './utils/round34-flow';

/**
 * Covers plan.md v6 AC23 (topic-balanced stratified sampling) as far as an
 * E2E test practically can.
 *
 * IMPORTANT LIMITATION (read before trusting a green run here as full AC23
 * coverage): AC23 itself is explicit that the authoritative check is
 * "verifiable via a unit test on the stratified-sampling utility"
 * (src/lib/rounds/stratifiedSample.ts). This E2E test cannot see a
 * question's internal topicId at all -- it is not part of the DOM or the
 * data-testid contract -- so it uses the only practically observable proxy:
 * the variety of distinct emoji/objects shown across a Round's ~10
 * questions. This is a WEAK proxy, not equivalent to real topic diversity:
 * multiple distinct emoji can still belong to the same topic (e.g. cat and
 * dog are both "Animals"), so a pass here does not prove AC23's precise "at
 * least min(topics, 8) distinct topics" bound holds. It only guards against
 * the most obvious regression -- the same one or two objects dominating an
 * entire Round -- which uniform-random-across-the-whole-pool sampling (the
 * bug AC23 exists to fix) would produce. Treat a failure here as a strong
 * signal worth investigating; treat a pass here as necessary but not
 * sufficient evidence for AC23. The stratified-sampling unit test is the
 * real authority for this AC, per the AC's own wording.
 *
 * Uses Round 4 (describe-and-choose-image) as the vehicle because it is the
 * only Round whose options render actual emoji/image content in the DOM.
 * Round 1 (extra-letter) and Round 2 (listening-sentence-fill-blank) only
 * reveal a bare English word/sentence via answer-feedback, which is not a
 * usable diversity signal without hardcoding vocabulary-to-topic knowledge
 * this suite deliberately avoids (see practice-flow.ts's file doc comment).
 *
 * Reaches Round 4 the same way round4-describe-and-choose-image.spec.ts
 * does (forced speech-recognition-unsupported fallback through Round 3,
 * since Round 3 has no real content to test here and headless Chromium has
 * no real mic anyway) -- see that spec's doc comment for the rationale.
 *
 * v8 note: Round 4 now also mixes in picture-pair-matching questions
 * (plan.md v8 AC31), which reveal no emoji signal via runDescribeAndChooseImageRound
 * (that runner correctly skips them for this purpose -- see round34-flow.ts).
 * This test's diversity checks are therefore measured against the count of
 * describe-and-choose-image questions actually seen (round4.correctOptionEmojis.length),
 * not round4.totalQuestions, which now includes the non-emoji pair-matching boards too.
 */
test.describe('Batch/Round: content variety across a Round (AC23 indirect proxy)', () => {
  test('Round 4 correct-answer objects are not dominated by one or two repeated emoji across the round', async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-expect-error deliberately removing a browser API -- see this file's doc comment
      delete window.SpeechRecognition;
      // @ts-expect-error deliberately removing a browser API -- see this file's doc comment
      delete window.webkitSpeechRecognition;
    });

    await fastForwardThroughRounds1And2(page);
    await runPronunciationRecordingRoundFallback(page, 'speech-recognition-unsupported');
    await goToNextRound(page);

    const round4 = await runDescribeAndChooseImageRound(page);

    // v8: round4.correctOptionEmojis only has one entry per
    // describe-and-choose-image question seen -- picture-pair-matching
    // questions (also in Round 4's pool since v8) contribute nothing here,
    // so the population size for this check is nonEmptyEmojis.length, not
    // round4.totalQuestions (see this file's doc comment).
    const nonEmptyEmojis = round4.correctOptionEmojis.filter((emoji) => emoji.length > 0);
    expect(
      nonEmptyEmojis,
      'expected every describe-and-choose-image question in Round 4 to reveal a non-empty correct-option ' +
        'emoji/character to measure diversity from',
    ).toHaveLength(round4.correctOptionEmojis.length);
    expect(nonEmptyEmojis.length, 'expected at least one describe-and-choose-image question in this Round').toBeGreaterThan(0);

    const frequency = new Map<string, number>();
    for (const emoji of nonEmptyEmojis) {
      frequency.set(emoji, (frequency.get(emoji) ?? 0) + 1);
    }
    const distinctCount = frequency.size;
    const maxFrequency = Math.max(...frequency.values());
    const sampleSize = nonEmptyEmojis.length;

    expect(
      distinctCount,
      `expected a meaningful variety of distinct correct-answer objects across Round 4's ${sampleSize} ` +
        `describe-and-choose-image questions (indirect AC23 proxy -- see this file's doc comment), got only ` +
        `${distinctCount} distinct value(s): ${[...frequency.keys()].join(', ')}`,
    ).toBeGreaterThanOrEqual(Math.min(4, sampleSize));

    expect(
      maxFrequency / sampleSize,
      `expected no single object to dominate more than half of Round 4's describe-and-choose-image questions ` +
        `(indirect AC23 proxy), but one value appeared ${maxFrequency} of ${sampleSize} times`,
    ).toBeLessThanOrEqual(0.5);
  });
});
