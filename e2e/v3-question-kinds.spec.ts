import { test, expect } from '@playwright/test';
import {
  MIN_TOPIC_COUNT,
  selectGrade,
  selectTopic,
  topicCards,
  questionCard,
  incorrectItems,
  readQuestionProgress,
  readScoreSummary,
  currentCountDirection,
  discoverCurrentQuestionAnswer,
  answerCurrentQuestionWithKey,
  scanTopicQuestionKinds,
  findTopicWithQuestionKind,
  goToNextQuestion,
  clickPracticeAgain,
  type QuestionKind,
  type QuestionAnswerKey,
  type AnswerAttemptResult,
} from './utils/practice-flow';

/**
 * Covers plan.md v3 Test Strategy Addition item 2: "a full-session happy
 * path that hits all 4 question kinds across at least 2 different topics."
 * Neither the countable topic nor the second topic is assumed ahead of
 * time -- countable topics (eligible for counting-image) are discovered at
 * runtime by actually running sessions and inspecting the kinds
 * encountered (plan.md explicitly forbids assuming which topics are
 * countable).
 *
 * Also covers AC12/AC13's "behaves like AC4" requirement by replaying the
 * discovered countable topic via Practice Again and scoring it perfectly,
 * proving every kind in that session (including both new v3 kinds) accepts
 * a correct answer and reports it correctly.
 */
test.describe('Student self-practice v3: full session across all 4 question kinds', () => {
  test('exercises all 4 kinds across at least 2 topics and scores a countable topic perfectly', async ({ page }) => {
    await page.goto('/');
    await selectGrade(page, 0);
    const topicCount = await topicCards(page).count();
    expect(topicCount, 'AC11 requires at least 10 distinct topics').toBeGreaterThanOrEqual(MIN_TOPIC_COUNT);

    const countableTopic = await test.step(
      'discover a topic whose session includes counting-image (AC12/AC13), trying topics until one is found',
      async () => {
        return findTopicWithQuestionKind(page, 'counting-image', topicCount);
      },
    );

    await test.step('the countable topic session also includes every non-counting kind (AC15)', async () => {
      expect(countableTopic.kinds.has('image-choice')).toBe(true);
      expect(countableTopic.kinds.has('listening-fill-blank')).toBe(true);
      expect(countableTopic.kinds.has('extra-letter')).toBe(true);
    });

    await test.step(
      'replay the countable topic via Practice Again and answer every question correctly (AC4-equivalent for all 4 kinds)',
      async () => {
        await clickPracticeAgain(page);
        const resetProgress = await readQuestionProgress(page);
        expect(resetProgress.current).toBe(1);
        expect(resetProgress.total).toBe(countableTopic.keys.length);

        for (let q = 1; q <= countableTopic.keys.length; q++) {
          const key = countableTopic.keys[q - 1];
          const result = await answerCurrentQuestionWithKey(page, key, 'correct');
          expect(result.outcome, `question ${q} (${key.kind}) expected to be marked correct`).toBe('correct');
          await goToNextQuestion(page);
        }

        const summary = await readScoreSummary(page);
        expect(summary.total).toBe(countableTopic.keys.length);
        expect(summary.correct).toBe(countableTopic.keys.length);
        expect(await incorrectItems(page).count()).toBe(0);
      },
    );

    const secondTopicIndex = (countableTopic.topicIndex + 1) % topicCount;
    expect(secondTopicIndex, 'the second topic must be distinct from the countable topic').not.toBe(
      countableTopic.topicIndex,
    );

    const secondTopic = await test.step('scan a second, distinct topic', async () => {
      return scanTopicQuestionKinds(page, secondTopicIndex);
    });

    await test.step('all 4 question kinds were observed across the 2 scanned topics', async () => {
      const observed = new Set<QuestionKind>([...countableTopic.kinds, ...secondTopic.kinds]);
      for (const kind of ['image-choice', 'listening-fill-blank', 'counting-image', 'extra-letter'] as const) {
        expect(observed.has(kind), `expected question kind "${kind}" to appear across the 2 scanned topics`).toBe(
          true,
        );
      }
    });
  });
});

/**
 * Covers plan.md AC12/AC13: counting-image wrong-answer feedback, for
 * whichever direction (count-to-image or image-to-count) the discovered
 * question happens to use. Follows the same discovery-pass + Practice Again
 * + forced-wrong-replay technique already established for image-choice and
 * listening-fill-blank in incorrect-answer-feedback.spec.ts.
 */
test.describe('Student self-practice v3: counting-image wrong-answer feedback', () => {
  test('shows immediate incorrect feedback and reveals the correct option for a wrong counting-image answer', async ({
    page,
  }) => {
    await page.goto('/');
    await selectGrade(page, 0);
    const topicCount = await topicCards(page).count();

    const countableTopic = await findTopicWithQuestionKind(page, 'counting-image', topicCount);

    await clickPracticeAgain(page);
    const resetProgress = await readQuestionProgress(page);
    expect(resetProgress.current).toBe(1);

    let forcedWrongQuestion = -1;
    let forcedWrongDirection: 'count-to-image' | 'image-to-count' | null = null;

    for (let q = 1; q <= countableTopic.keys.length; q++) {
      const key = countableTopic.keys[q - 1];
      const forceWrong = key.kind === 'counting-image' && forcedWrongQuestion === -1;

      const beforeText = forceWrong ? (await questionCard(page).innerText()).trim() : '';
      const direction = forceWrong ? await currentCountDirection(page) : null;

      const result = await answerCurrentQuestionWithKey(page, key, forceWrong ? 'incorrect' : 'correct');

      if (forceWrong) {
        forcedWrongQuestion = q;
        forcedWrongDirection = direction;

        expect(result.outcome, `question ${q} (counting-image, ${direction}) expected to be marked incorrect`).toBe(
          'incorrect',
        );
        // AC12/AC13: the correct option is revealed after any selection.
        // answerCurrentQuestionWithKey already scans every option for the
        // "correct" signal and throws if none is found, so reaching this
        // point without throwing already proves the reveal happened; this
        // also checks the revealed content grew the visible question text.
        expect(
          result.feedbackText.length,
          'expected additional revealed content after answering',
        ).toBeGreaterThan(beforeText.length + 5);
      }

      await goToNextQuestion(page);
    }

    expect(
      forcedWrongQuestion,
      'no counting-image question found in this topic session; expected at least one per AC12/AC13/AC15',
    ).toBeGreaterThan(0);
    expect(['count-to-image', 'image-to-count']).toContain(forcedWrongDirection);
  });
});

/**
 * Covers plan.md AC14: extra-letter wrong-answer feedback. Clicks a tile
 * that is deterministically NOT the extra letter (computed as
 * `(correctTileIndex + 1) % tileCount` from a prior discovery pass, never
 * assumed by position) and verifies it still reveals the correct word,
 * exactly the "always reveal the answer key after any interaction"
 * principle the plan calls out.
 */
test.describe('Student self-practice v3: extra-letter wrong-answer feedback', () => {
  test('clicking a tile that is not the extra letter shows incorrect feedback and still reveals the correct word', async ({
    page,
  }) => {
    await page.goto('/');
    await selectGrade(page, 0);
    // AC15: every topic (countable or not) includes extra-letter.
    await selectTopic(page, 0);

    const { total } = await readQuestionProgress(page);
    const keys: QuestionAnswerKey[] = [];

    for (let q = 1; q <= total; q++) {
      keys.push(await discoverCurrentQuestionAnswer(page));
      await goToNextQuestion(page);
    }
    await expect(page.getByTestId('score-summary')).toBeVisible();

    const extraLetterQuestionNumber = keys.findIndex((key) => key.kind === 'extra-letter') + 1;
    expect(
      extraLetterQuestionNumber,
      'no extra-letter question found in topic 0, expected at least one per AC15',
    ).toBeGreaterThan(0);

    await clickPracticeAgain(page);

    let wrongTileResult: AnswerAttemptResult | null = null;

    for (let q = 1; q <= total; q++) {
      const key = keys[q - 1];
      const isTargetQuestion = q === extraLetterQuestionNumber;

      const result = await answerCurrentQuestionWithKey(page, key, isTargetQuestion ? 'incorrect' : 'correct');
      if (isTargetQuestion) {
        wrongTileResult = result;
      }

      await goToNextQuestion(page);
    }

    expect(wrongTileResult).not.toBeNull();
    expect(wrongTileResult!.outcome, 'clicking a non-extra-letter tile must be marked incorrect').toBe('incorrect');
    expect(wrongTileResult!.revealedWord.length).toBeGreaterThan(0);
    expect(
      wrongTileResult!.feedbackText.toLowerCase(),
      'answer-feedback must still contain the correct word even on a wrong tile click (AC14)',
    ).toContain(wrongTileResult!.revealedWord.toLowerCase());
  });
});
